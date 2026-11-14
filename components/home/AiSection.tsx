"use client";

import { ArrowRight, Bot, Check, Sparkles } from "lucide-react";
import { useAssistant } from "@/components/assistant/AssistantProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { L } from "@/lib/i18n";

export function AiSection() {
  const { openWithPrompt } = useAssistant();
  const { locale } = useLocale();
  const bullets = [
    { ru: "Видит текущий объект, переменную и период", en: "Sees the current object, variable and period" },
    { ru: "Объясняет p, q, наклон Сена и оговорки", en: "Explains p, q, Sen slope and caveats" },
    { ru: "Предлагает конкретные действия: куда нажать", en: "Suggests concrete actions: what to click" },
    { ru: "Не выдумывает числа — берёт их из анализа", en: "Does not invent numbers — it uses the analysis" },
  ];
  return (
    <section className="section mt-24 sm:mt-32">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.09] bg-gradient-to-br from-aurora-400/[0.07] via-white/[0.02] to-violet-400/[0.06] p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-aurora-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="relative grid gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <span className="h-px w-8 bg-aurora-400/60" />
              <span className="label text-aurora-300/90">{L(locale, "ai-детектив", "ai detective")}</span>
            </div>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-slate-50 text-balance sm:text-4xl">
              {L(locale, "«Объясни, что я вижу» — и он объяснит", "“Explain what I'm seeing” — and it will")}
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-400">
              {L(
                locale,
                "AI-помощник встроен в продукт, а не приклеен сбоку. Он знает каталог, методологию, ваш объект, период и результат. Может перевести p-value на человеческий, предложить следующий клик и честно сказать, где данных не хватает.",
                "The AI assistant is part of the product, not bolted on. It knows the catalog, the methodology, your object, period and result. It can translate a p-value into plain language, suggest the next click and say honestly where data is missing.",
              )}
            </p>
            <div className="mt-6 grid gap-2.5">
              {bullets.map((t) => (
                <div key={t.ru} className="flex items-center gap-2.5 text-[12px] text-slate-300">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-aurora-400/15 text-aurora-300">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                  {L(locale, t.ru, t.en)}
                </div>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={() => openWithPrompt(L(locale, "Объясни, что показывает K2, и с чего мне начать.", "Explain what K2 shows and where I should start."))} className="btn-primary">
                <Sparkles className="h-4 w-4" /> {L(locale, "Открыть AI-детектива", "Open the AI detective")}
              </button>
              <a href="/method" className="btn-secondary">
                {L(locale, "Как устроен метод", "How the method works")} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-white/[0.10] bg-[#070c14]/80 p-4 shadow-panel backdrop-blur-xl">
              <div className="flex items-center gap-2 border-b border-white/[0.07] pb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-aurora-400/10 text-aurora-300">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-200">K2 AI</span>
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-aurora-400" />
              </div>
              <div className="space-y-3 pt-3">
                <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-aurora-400 px-3 py-2 text-[11px] font-medium text-ink-950">
                  {L(locale, "Почему у Иссык-Куля нет тренда за 2000–2025?", "Why is there no trend at Issyk-Kul for 2000–2025?")}
                </div>
                <div className="w-fit max-w-[92%] rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-[11px] leading-relaxed text-slate-300">
                  {L(
                    locale,
                    "Потому что ряд нелинейный: уровень рос примерно до 2011 года, а затем снижался. Mann–Kendall проверяет монотонный тренд за весь период и не находит его (p = 0,874). Это не «всё хорошо» — это сигнал разбить период и смотреть на 2011–2025 отдельно.",
                    "Because the series is non-linear: the level rose until about 2011 and then declined. Mann–Kendall tests for a monotonic trend over the whole period and does not find one (p = 0.874). That is not “all good” — it is a signal to split the period and look at 2011–2025 separately.",
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-aurora-400/25 bg-aurora-400/[0.07] px-2.5 py-1 text-[9px] text-aurora-200">
                    {L(locale, "Открыть 2011–2025", "Open 2011–2025")}
                  </span>
                  <span className="rounded-full border border-aurora-400/25 bg-aurora-400/[0.07] px-2.5 py-1 text-[9px] text-aurora-200">
                    {L(locale, "Сравнить с Нарыном", "Compare with Naryn")}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#04080f] px-3 py-2 text-[10px] text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-aurora-400" />
                {L(locale, "контекст: issyk-kul · lake_level · 2000–2025", "context: issyk-kul · lake_level · 2000–2025")}
              </div>
            </div>
            <div className="absolute -bottom-4 -right-3 rounded-full border border-white/10 bg-[#080e18]/90 px-3 py-1.5 text-[9px] text-slate-400 shadow-panel backdrop-blur-md">
              {L(locale, "p и q — из карточки анализа", "p and q come from the analysis card")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
