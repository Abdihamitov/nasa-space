"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getRecentExplorations, getSessionId, rememberExploration, trackExploration } from "@/lib/client";
import type { AssistantAction, AssistantContext, ChatMessage } from "@/lib/types";

type AssistantState = {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  messages: ChatMessage[];
  send: (text: string) => Promise<void>;
  clear: () => void;
  loading: boolean;
  context: AssistantContext;
  setTrendSummary: (summary: string | null) => void;
  openWithPrompt: (prompt?: string) => void;
};

const AssistantCtx = createContext<AssistantState | null>(null);

const ACTION_RE = /\[\[ACTION\]\]([\s\S]*?)\[\[\/ACTION\]\]/g;

function parseActions(text: string): { clean: string; actions: AssistantAction[] } {
  const actions: AssistantAction[] = [];
  const clampYear = (y: number) => Math.min(2025, Math.max(2000, Math.round(y)));
  const clean = text.replace(ACTION_RE, (_m, json) => {
    try {
      const parsed = JSON.parse(String(json).trim());
      if (parsed && typeof parsed === "object" && typeof parsed.type === "string") {
        const action = parsed as AssistantAction;
        if (action.type === "navigate") {
          if (!action.href.startsWith("/")) return "";
          try {
            const url = new URL(action.href, "https://k2.local");
            const f = Number(url.searchParams.get("from"));
            const t = Number(url.searchParams.get("to"));
            if (Number.isFinite(f)) url.searchParams.set("from", String(clampYear(f)));
            if (Number.isFinite(t)) url.searchParams.set("to", String(clampYear(t)));
            action.href = `${url.pathname}${url.search}`;
          } catch {
            // keep original href
          }
        } else if (action.type === "set_period" || action.type === "open_compare") {
          action.from = clampYear(action.from);
          action.to = clampYear(action.to);
        }
        actions.push(action);
      }
    } catch {
      // ignore malformed action blocks
    }
    return "";
  });
  return { clean: clean.replace(/\n{3,}/g, "\n\n").trim(), actions };
}

function readQuery(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const out: Record<string, string> = {};
  new URLSearchParams(window.location.search).forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendSummary, setTrendSummaryState] = useState<string | null>(null);
  const [query, setQuery] = useState<Record<string, string>>({});
  const lastTracked = useRef<string>("");
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    setQuery(readQuery());
  }, [pathname]);

  const context: AssistantContext = useMemo(() => {
    const objectCode = query.object || undefined;
    const variableCode = query.variable || undefined;
    const from = query.from ? Number(query.from) : undefined;
    const to = query.to ? Number(query.to) : undefined;
    return {
      path: pathname,
      objectCode,
      variableCode,
      from,
      to,
      trendSummary: trendSummary ?? undefined,
      compareA: query.a || undefined,
      compareB: query.b || undefined,
      recent: getRecentExplorations().map((r) => ({
        object: r.object,
        variable: r.variable,
        from: r.from,
        to: r.to,
        at: r.at,
      })),
    };
  }, [pathname, query, trendSummary]);

  useEffect(() => {
    if (pathname !== "/analysis") {
      setTrendSummaryState(null);
      return;
    }
    const object = query.object;
    const variable = query.variable;
    if (!object || !variable) return;
    const from = Number(query.from) || 2000;
    const to = Number(query.to) || 2025;
    const key = `${pathname}?${object}|${variable}|${from}|${to}`;
    if (lastTracked.current === key) return;
    lastTracked.current = key;
    rememberExploration({ object, variable, from, to });
    void trackExploration({ path: `${pathname}?object=${object}&variable=${variable}&from=${from}&to=${to}`, objectCode: object, variableCode: variable, from, to });
  }, [pathname, query]);

  const setTrendSummary = useCallback((summary: string | null) => {
    setTrendSummaryState(summary);
  }, []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const history = [...messagesRef.current, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setLoading(true);
    const sessionId = getSessionId();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          context,
          sessionId,
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        const { clean, actions } = parseActions(full);
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: clean, actions };
          return next;
        });
      }
      const { clean, actions } = parseActions(full);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: clean || "Не удалось получить ответ. Попробуйте переформулировать вопрос.",
          actions,
        };
        return next;
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Неизвестная ошибка";
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content:
            `AI-сервис недоступен (${message}).\n\n` +
            "Пока могу подсказать: откройте «Исследовать», выберите раздел, место, параметр и период. На экране результата сверху — вывод простыми словами, ниже — график, p, q и цепочка гипотез.",
          actions: [
            { type: "navigate", href: "/explore", label: "Открыть «Исследовать»" },
            { type: "navigate", href: "/method", label: "Как считается тренд" },
          ],
        };
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, [context, loading]);

  const clear = useCallback(() => setMessages([]), []);
  const openWithPrompt = useCallback(
    (prompt?: string) => {
      setOpen(true);
      if (prompt) void send(prompt);
    },
    [send],
  );

  return (
    <AssistantCtx.Provider
      value={{
        open,
        setOpen,
        toggle: () => setOpen((v) => !v),
        messages,
        send,
        clear,
        loading,
        context,
        setTrendSummary,
        openWithPrompt,
      }}
    >
      {children}
    </AssistantCtx.Provider>
  );
}

export function useAssistant(): AssistantState {
  const ctx = useContext(AssistantCtx);
  if (!ctx) throw new Error("useAssistant must be used inside AssistantProvider");
  return ctx;
}
