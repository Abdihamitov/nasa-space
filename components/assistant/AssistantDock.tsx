"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Bot, CornerDownLeft, Eraser, Sparkles, X } from "lucide-react";
import { useAssistant } from "./AssistantProvider";
import { MarkdownLite } from "@/components/ui/MarkdownLite";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { L } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AssistantAction } from "@/lib/types";

const QUICK = [
  { ru: "Что здесь самое важное?", en: "What matters most here?" },
  { ru: "Объясни как школьнику", en: "Explain it like I'm a student" },
  { ru: "Что мне нажать дальше?", en: "What should I click next?" },
  { ru: "Почему это не доказывает причину?", en: "Why doesn't this prove causation?" },
  { ru: "Какие данные ты используешь?", en: "What data do you use?" },
];

function actionHref(a: AssistantAction): string {
  if (a.type === "navigate") return a.href;
  if (a.type === "open_compare") return `/compare?variable=${a.variable}&from=${a.from}&to=${a.to}&auto=1`;
  return `/explore?from=${a.from}&to=${a.to}`;
}

export function AssistantDock() {
  const { open, setOpen, messages, send, clear, loading, context } = useAssistant();
  const { locale } = useLocale();
  const [input, setInput] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, open]);

  const submit = () => {
    if (!input.trim() || loading) return;
    const text = input;
    setInput("");
    void send(text);
  };

  const go = (a: AssistantAction) => {
    const href = actionHref(a);
    router.push(href);
    if (typeof window !== "undefined" && window.innerWidth < 640) setOpen(false);
  };

  const contextLabel =
    context.objectCode && context.variableCode
      ? L(locale, `${context.objectCode} · ${context.variableCode}`, "Current analysis")
      : pathname === "/compare"
        ? L(locale, "Сравнение", "Comparison")
        : pathname === "/explore"
          ? L(locale, "Исследовать", "Explore")
          : pathname === "/method"
            ? L(locale, "Методология", "Methodology")
            : L(locale, "Главная", "Home");

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-aurora-400/30 bg-aurora-400 text-ink-950 shadow-glow transition hover:scale-105 hover:bg-aurora-300 hover:shadow-[0_0_50px_-6px_rgba(46,230,200,0.6)]"
          aria-label="Открыть AI-помощника"
          title="Спросить K2 AI (⌘K)"
        >
          <Sparkles className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 rounded-full border border-aurora-400/40 bg-[#04070d] px-1.5 py-0.5 font-mono text-[8px] font-semibold text-aurora-300">
            AI
          </span>
        </button>
      )}

      {open && (
        <div className="fixed inset-x-3 bottom-3 top-16 z-[60] flex flex-col overflow-hidden rounded-3xl border border-white/[0.12] bg-[#070c14]/95 shadow-panel backdrop-blur-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:top-auto sm:h-[660px] sm:w-[410px]">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-aurora-400/25 bg-aurora-400/10 text-aurora-300">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-semibold text-slate-100">K2 AI</span>
                  <span className="rounded-full border border-aurora-400/20 bg-aurora-400/10 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider text-aurora-300">beta</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-aurora-400" />
                  {L(locale, "видит ваш контекст", "sees your context")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clear}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200"
                aria-label={L(locale, "Очистить диалог", "Clear chat")}
              >
                <Eraser className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200"
                aria-label={L(locale, "Закрыть", "Close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2">
            <span className="truncate rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-slate-400">
              {contextLabel}
            </span>
            {context.from && context.to && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] text-slate-400">
                {context.from}–{context.to}
              </span>
            )}
            {context.recent && context.recent.length > 0 && (
              <span className="ml-auto text-[9px] text-slate-600">{context.recent.length} недавних</span>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-aurora-300">
                    <Sparkles className="h-3.5 w-3.5" /> {L(locale, "Я — детектив по климатическим трендам", "I'm your climate trend detective")}
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
                    {L(
                      locale,
                      "Объясню, что показывает график, расшифрую p и q, подскажу, куда нажать, и помогу сравнить регионы. Я вижу, какой объект и период вы открыли.",
                      "I can explain the chart, decode p and q, tell you what to click next and help compare regions. I can see the object and period you have open.",
                    )}
                  </p>
                </div>
                <div>
                  <div className="label mb-2">{L(locale, "С чего начать", "Where to start")}</div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK.map((q) => (
                      <button
                        key={q.ru}
                        type="button"
                        onClick={() => void send(L(locale, q.ru, q.en))}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-left text-[11px] text-slate-300 transition hover:border-aurora-400/30 hover:bg-aurora-400/[0.06] hover:text-aurora-200"
                      >
                        {L(locale, q.ru, q.en)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-aurora-400 px-3.5 py-2.5 text-[12px] font-medium leading-relaxed text-ink-950">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[92%] space-y-2">
                    <div className="rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.035] px-3.5 py-3">
                      {m.content ? (
                        <MarkdownLite text={m.content} />
                      ) : (
                        <div className="flex items-center gap-1.5 py-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-aurora-400 [animation-delay:-0.2s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-aurora-400 [animation-delay:-0.1s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-aurora-400" />
                        </div>
                      )}
                    </div>
                    {m.actions && m.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {m.actions.map((a, j) => (
                          <button
                            key={j}
                            type="button"
                            onClick={() => go(a)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-aurora-400/25 bg-aurora-400/[0.07] px-3 py-1.5 text-[10px] font-medium text-aurora-200 transition hover:bg-aurora-400/15"
                          >
                            {a.label}
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-white/[0.08] p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-white/[0.10] bg-[#04080f] p-2 focus-within:border-aurora-400/40">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={1}
                placeholder={L(locale, "Спросите о тренде, данных или интерфейсе…", "Ask about a trend, the data or the interface…")}
                className="max-h-28 min-h-[38px] flex-1 resize-none bg-transparent px-2 py-2 text-[12px] text-slate-100 placeholder:text-slate-600 focus:outline-none"
                aria-label="Сообщение для AI-помощника"
              />
              <button
                type="button"
                onClick={submit}
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-aurora-400 text-ink-950 transition hover:bg-aurora-300 disabled:opacity-30"
                aria-label={L(locale, "Отправить", "Send")}
              >
                <CornerDownLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between px-1 text-[9px] text-slate-600">
              <span>{L(locale, "AI может ошибаться. Числа берите из карточек анализа.", "AI can be wrong. Take numbers from the analysis cards.")}</span>
              <span className="font-mono">Enter ↵</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
