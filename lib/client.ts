"use client";

import type { AssistantContext } from "./types";

const SESSION_KEY = "k2_session_id";
const RECENT_KEY = "k2_recent_explorations";

export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export type RecentExploration = {
  object: string;
  variable: string;
  from: number;
  to: number;
  at: string;
};

export function getRecentExplorations(): RecentExploration[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

export function rememberExploration(item: Omit<RecentExploration, "at">) {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentExplorations().filter(
      (e) => !(e.object === item.object && e.variable === item.variable),
    );
    const next: RecentExploration[] = [{ ...item, at: new Date().toISOString() }, ...existing].slice(0, 12);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
}

export function clearRecentExplorations() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RECENT_KEY);
}

export async function trackExploration(context: AssistantContext) {
  try {
    const sessionId = getSessionId();
    await fetch("/api/explore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, ...context }),
      keepalive: true,
    });
  } catch {
    // analytics must never break the UI
  }
}

export async function sendFeedback(input: {
  objectCode?: string;
  variableCode?: string;
  rating: number;
  comment?: string;
}) {
  try {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: getSessionId(), ...input }),
    });
  } catch {
    // ignore
  }
}
