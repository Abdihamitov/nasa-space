import { ArrowRight, CheckCircle2, MousePointerClick, ScanSearch, Sparkles } from "lucide-react";
import { getLocale } from "@/lib/i18n-server";
import { L } from "@/lib/i18n";

const STEPS = [
  {
    n: "01",
    title: "Раздел → место → параметр → период",
    titleEn: "Section → place → variable → period",
    text: "Четыре шага, только доступные комбинации. Или клик по карте — и анализ по ближайшей ячейке.",
    textEn: "Four steps, only available combinations. Or click the map — the nearest grid cell is analysed.",
    icon: MousePointerClick,
  },
  {
    n: "02",
    title: "Тренд, а не просто линия",
    titleEn: "A trend, not just a line",
    text: "Mann–Kendall с поправкой Хамеда–Рао, наклон Сена с 95 % ДИ, сезонная проверка и FDR-поправка.",
    textEn: "Mann–Kendall with Hamed–Rao correction, Sen slope with 95% CI, a seasonal check and FDR correction.",
    icon: ScanSearch,
  },
  {
    n: "03",
    title: "Вывод словами и оговорка",
    titleEn: "A plain-language verdict — and a caveat",
    text: "Что изменилось, насколько уверенно и чего результат не доказывает. Плюс цепочка гипотез и CSV.",
    textEn: "What changed, how confidently, and what the result does not prove. Plus a hypothesis chain and CSV.",
    icon: CheckCircle2,
  },
  {
    n: "04",
    title: "Спросите AI-детектива",
    titleEn: "Ask the AI detective",
    text: "Он видит ваш объект, период и результат. Объяснит p и q, предложит следующий клик и сравнение.",
    textEn: "It sees your object, period and result. It explains p and q and suggests the next click or comparison.",
    icon: Sparkles,
  },
];

export async function HowItWorks() {
  const locale = await getLocale();
  return (
    <section className="section mt-24 sm:mt-32">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="h-px w-8 bg-aurora-400/60" />
            <span className="label text-aurora-300/90">{L(locale, "как это работает", "how it works")}</span>
          </div>
          <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-slate-50 text-balance sm:text-4xl">
            {L(locale, "Один честный конвейер вместо десяти разрозненных графиков", "One honest pipeline instead of ten scattered charts")}
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
            {L(
              locale,
              "Мы не обещаем «все данные мира». Мы собрали analysis-ready куб по Кыргызстану: 20 объектов, 10 переменных, 2000–2025, месячный шаг. И показываем не только результат, но и его предел.",
              "We don't promise “all the world's data”. We built an analysis-ready cube for Kyrgyzstan: 20 objects, 10 variables, 2000–2025, monthly. And we show both the result and its limit.",
            )}
          </p>
          <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#070c14] p-4">
            <div className="label mb-2">{L(locale, "метод в одну строку", "the method in one line")}</div>
            <code className="block text-[11px] leading-relaxed text-aurora-200/90">
              annual → MK / Hamed–Rao → Sen slope + CI → BH-FDR → summary + caveat
            </code>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:border-aurora-400/20 hover:bg-white/[0.04]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-slate-600">{s.n}</span>
                  <Icon className="h-4 w-4 text-aurora-300/80" />
                </div>
                <h3 className="mt-6 font-display text-sm font-semibold text-slate-100">{L(locale, s.title, s.titleEn)}</h3>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{L(locale, s.text, s.textEn)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export async function MethodTeaser() {
  const locale = await getLocale();
  const cards = [
    {
      k: "Mann–Kendall",
      ru: "непараметрический тест на монотонный тренд; не требует нормальности и устойчив к выбросам",
      en: "a non-parametric test for a monotonic trend; no normality assumption and robust to outliers",
    },
    {
      k: "Наклон Сена",
      kEn: "Sen slope",
      ru: "медиана парных наклонов; устойчив к экстремумам, в отличие от OLS",
      en: "the median of pairwise slopes; robust to extremes, unlike OLS",
    },
    {
      k: "FDR (Benjamini–Hochberg)",
      ru: "контроль ложных открытий при скане десятков объектов и переменных",
      en: "false-discovery control when scanning dozens of objects and variables",
    },
  ];
  return (
    <section className="section mt-24 sm:mt-32">
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.k} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <div className="font-display text-sm font-semibold text-aurora-200">{L(locale, c.k, c.kEn ?? c.k)}</div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{L(locale, c.ru, c.en)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
