"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, Play } from "lucide-react";
import { useAssistant } from "@/components/assistant/AssistantProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { L } from "@/lib/i18n";

export function HeroActions() {
  const { openWithPrompt } = useAssistant();
  const { locale } = useLocale();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Link href="/explore" className="btn-primary group">
        {L(locale, "Начать расследование", "Start investigating")}
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </Link>
      <button
        type="button"
        onClick={() =>
          openWithPrompt(
            L(
              locale,
              "С чего начать? Покажи путь из 3 шагов и объясни, что я увижу.",
              "Where should I start? Give me a 3-step path and explain what I will see.",
            ),
          )
        }
        className="btn-secondary"
      >
        <MessageCircle className="h-4 w-4 text-aurora-300" />
        {L(locale, "Спросить AI-детектива", "Ask the AI detective")}
      </button>
      <a href="#phenomena" className="btn-ghost hidden text-slate-400 sm:inline-flex">
        <Play className="h-3.5 w-3.5" />
        {L(locale, "Смотреть карту", "View the map")}
      </a>
    </div>
  );
}
