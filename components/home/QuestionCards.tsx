"use client";

import Link from "next/link";
import { ArrowUpRight, CloudRain, Droplets, Snowflake, ThermometerSun } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { L } from "@/lib/i18n";

const CARDS = [
  {
    href: "/analysis?object=issyk-kul&variable=lake_level&from=2000&to=2025",
    tag: "Вода",
    tagEn: "Water",
    title: "Что происходит с уровнем Иссык-Куля?",
    titleEn: "What is happening to Lake Issyk-Kul?",
    text: "Реконструкция по in situ и альтиметрии: рост до 2011 года, затем снижение. Почему линейный тренд за 2000–2025 не значим.",
    textEn: "A reconstruction from in situ and altimetry data: rising until 2011, then falling. Why the 2000–2025 linear trend is not significant.",
    icon: Droplets,
    accent: "aurora",
    line: "M2 30 C 18 28, 24 18, 38 20 S 58 10, 72 14 S 92 26, 110 22",
  },
  {
    href: "/compare?variable=t2m&from=2000&to=2025&auto=1",
    tag: "Климат",
    tagEn: "Climate",
    title: "Где теплеет быстрее?",
    titleEn: "Where is it warming faster?",
    text: "Сравните регионы с разной скоростью warming. Автоподбор пары, FDR-поправка и честная подпись, если контраста нет.",
    textEn: "Compare regions with different warming rates. Automatic pair selection, FDR correction and an honest label when there is no contrast.",
    icon: ThermometerSun,
    accent: "solar",
    line: "M2 28 C 20 26, 30 24, 42 22 S 66 18, 78 12 S 96 8, 110 6",
  },
  {
    href: "/analysis?object=enilchek&variable=snow_days&from=2000&to=2025",
    tag: "Снег",
    tagEn: "Snow",
    title: "Снежный сезон становится короче?",
    titleEn: "Is the snow season getting shorter?",
    text: "Длительность снежного сезона по ежедневной модельной глубине снега. Что это показывает и чего не доказывает.",
    textEn: "Snow-season length from daily modelled snow depth. What it shows — and what it does not prove.",
    icon: Snowflake,
    accent: "ice",
    line: "M2 18 C 18 22, 28 16, 40 20 S 62 28, 76 24 S 96 30, 110 26",
  },
  {
    href: "/compare?variable=precip&from=2000&to=2025&auto=1",
    tag: "Осадки",
    tagEn: "Precipitation",
    title: "Осадки: где контраст?",
    titleEn: "Precipitation: where is the contrast?",
    text: "Один и тот же период, разные регионы. Смотрим на знак, значимость и q — а не на красивую линию.",
    textEn: "The same period, different regions. We look at the sign, significance and q — not just a pretty line.",
    icon: CloudRain,
    accent: "violet",
    line: "M2 26 C 16 20, 30 28, 44 18 S 64 24, 78 16 S 96 20, 110 10",
  },
];

const accents: Record<string, { text: string; border: string; bg: string; stroke: string }> = {
  aurora: { text: "text-aurora-300", border: "group-hover:border-aurora-400/30", bg: "bg-aurora-400/10", stroke: "#2ee6c8" },
  solar: { text: "text-solar-300", border: "group-hover:border-solar-400/30", bg: "bg-solar-400/10", stroke: "#fbbf24" },
  ice: { text: "text-ice-300", border: "group-hover:border-ice-400/30", bg: "bg-ice-400/10", stroke: "#38bdf8" },
  violet: { text: "text-violet-300", border: "group-hover:border-violet-400/30", bg: "bg-violet-400/10", stroke: "#a78bfa" },
};

export function QuestionCards() {
  const { locale } = useLocale();
  return (
    <section className="section mt-24 sm:mt-32">
      <SectionHeading
        eyebrow={L(locale, "начните с вопроса", "start with a question")}
        title={L(locale, "Не «постройте график», а «ответьте на вопрос»", "Not “build a chart” — “answer a question”")}
        description={L(
          locale,
          "Четыре типичных вопроса, с которых начинается расследование. Каждый ведёт к готовому выводу, а не к пустому конструктору.",
          "Four typical questions that start an investigation. Each one leads to a ready conclusion, not an empty chart builder.",
        )}
        action={
          <Link href="/explore" className="btn-secondary btn-sm">
            {L(locale, "Все сценарии", "All scenarios")} <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card, i) => {
          const a = accents[card.accent];
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition duration-300 hover:bg-white/[0.05] ${a.border}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${a.text} ${a.bg}`}>
                  <Icon className="h-3 w-3" /> {L(locale, card.tag, card.tagEn)}
                </span>
                <ArrowUpRight className="h-4 w-4 text-slate-600 transition group-hover:text-slate-300" />
              </div>
              <h3 className="mt-5 font-display text-[15px] font-semibold leading-snug tracking-tight text-slate-100">
                {L(locale, card.title, card.titleEn)}
              </h3>
              <p className="mt-2 flex-1 text-[11px] leading-relaxed text-slate-500">
                {L(locale, card.text, card.textEn)}
              </p>
              <svg viewBox="0 0 112 34" className="mt-5 h-9 w-full opacity-50 transition group-hover:opacity-90" aria-hidden="true">
                <path d={card.line} fill="none" stroke={a.stroke} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
