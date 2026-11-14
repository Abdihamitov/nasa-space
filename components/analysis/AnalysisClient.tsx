"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Database,
  Download,
  ExternalLink,
  FileText,
  FlaskConical,
  GitCompare,
  Layers,
  Lightbulb,
  MessageCircle,
  Minus,
  Share2,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { TrendChart } from "@/components/charts/TrendChart";
import { Sparkline } from "@/components/charts/Sparkline";
import { TrendBadge, SourceFlags } from "@/components/ui/TrendBadge";
import { Badge } from "@/components/ui/Badge";
import { InfoTip } from "@/components/ui/InfoTip";
import { Tabs } from "@/components/ui/Tabs";
import { Accordion } from "@/components/ui/Accordion";
import { PeriodSlider, YearSelect } from "@/components/ui/PeriodSlider";
import { useAssistant } from "@/components/assistant/AssistantProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { sendFeedback } from "@/lib/client";
import { L, pickName } from "@/lib/i18n";
import {
  annualUnit,
  annualUnitEn,
  changeUnit,
  changeUnitEn,
  formatNumber,
  formatNumberEn,
  formatP,
  formatPEn,
  formatSigned,
  formatSignedEn,
  sectionLabel,
  sectionLabelEn,
  slopeDisplayScale,
  slopePrecision,
  slopeUnit,
  slopeUnitEn,
  unitEn,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChainResult, TrendPayload, Variable } from "@/lib/types";

const CHAIN_STATUS: Record<string, string> = {
  confirmed: "border-aurora-400/25 bg-aurora-400/[0.07] text-aurora-200",
  contradicted: "border-ember-400/25 bg-ember-400/[0.07] text-ember-400",
  weak: "border-solar-400/25 bg-solar-400/[0.07] text-solar-300",
  none: "border-white/10 bg-white/[0.04] text-slate-300",
  insufficient: "border-white/10 bg-white/[0.03] text-slate-400",
};

function slopeText(payload: TrendPayload, locale: "ru" | "en") {
  const v = payload.variable;
  const scale = slopeDisplayScale(v);
  const p = slopePrecision(payload.stats.senSlope, v);
  const nf = locale === "en" ? formatNumberEn : formatNumber;
  return `${payload.stats.senSlope > 0 ? "+" : "−"}${nf(Math.abs(payload.stats.senSlope) * scale, p)} ${locale === "en" ? slopeUnitEn(v) : slopeUnit(v)}`;
}

function correlationText(rho: number, p: number, locale: "ru" | "en") {
  const nf = locale === "en" ? formatNumberEn : formatNumber;
  const pf = locale === "en" ? formatPEn : formatP;
  return `ρ = ${nf(rho, 2)} · p = ${pf(p)}`;
}

export function AnalysisClient({
  payload,
  chain,
  variables,
  periodBounds,
}: {
  payload: TrendPayload;
  chain: ChainResult | null;
  variables: Variable[];
  periodBounds: { from: number; to: number };
}) {
  const router = useRouter();
  const { openWithPrompt, setTrendSummary } = useAssistant();
  const { locale } = useLocale();
  const { object, variable, stats, period } = payload;
  const nf = locale === "en" ? formatNumberEn : formatNumber;
  const pf = locale === "en" ? formatPEn : formatP;
  const sf = locale === "en" ? formatSignedEn : formatSigned;
  const su = locale === "en" ? slopeUnitEn(variable) : slopeUnit(variable);
  const cu = locale === "en" ? changeUnitEn(variable) : changeUnit(variable);
  const vName = L(locale, variable.name, variable.nameEn);
  const oName = pickName(locale, object);
  const summary = L(locale, stats.summary, stats.summaryEn);
  const caveat = L(locale, stats.caveat, stats.caveatEn);
  const detail = L(locale, stats.detail, stats.detailEn);
  const hasMonthly = variable.nativeStep === "month" && payload.monthly.length > 0;
  const [showMonthly, setShowMonthly] = useState(hasMonthly);
  const [showBand, setShowBand] = useState(true);
  const [showPeriod, setShowPeriod] = useState(false);
  const [localFrom, setLocalFrom] = useState(period.from);
  const [localTo, setLocalTo] = useState(period.to);
  const [feedback, setFeedback] = useState<null | "up" | "down">(null);
  const [comment, setComment] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    setTrendSummary(locale === "en" ? stats.summaryEn : stats.summary);
  }, [locale, stats.summary, stats.summaryEn, setTrendSummary]);

  useEffect(() => {
    setLocalFrom(period.from);
    setLocalTo(period.to);
    setShowMonthly(hasMonthly);
  }, [period.from, period.to, hasMonthly]);

  const scale = slopeDisplayScale(variable);
  const sp = slopePrecision(stats.senSlope, variable);
  const slope = stats.senSlope * scale;
  const change = stats.changeOverPeriod * scale;
  const rising = stats.direction === "rising";
  const confident = stats.confidence === "confident";
  const weak = stats.confidence === "weak";
  const noTrend = stats.confidence === "none";
  const insufficient = stats.confidence === "insufficient";
  const accent = confident ? (rising ? "text-aurora-300" : "text-ember-400") : weak ? "text-solar-300" : "text-slate-400";
  const accentBg = confident ? (rising ? "bg-aurora-400/10 border-aurora-400/25" : "bg-ember-400/10 border-ember-400/25") : weak ? "bg-solar-400/10 border-solar-400/25" : "bg-white/[0.03] border-white/10";
  const DirectionIcon = insufficient || noTrend ? Minus : rising ? TrendingUp : TrendingDown;
  const directionLabel = insufficient
    ? L(locale, "Мало данных", "Not enough data")
    : noTrend
      ? L(locale, "Тренда нет", "No trend")
      : rising
        ? L(locale, "Рост", "Rising")
        : L(locale, "Снижение", "Falling");

  const applyPeriod = () => {
    router.push(`/analysis?object=${object.code}&variable=${variable.code}&from=${localFrom}&to=${localTo}`);
    setShowPeriod(false);
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(L(locale, "Ссылка скопирована", "Link copied"));
    } catch {
      toast.error(L(locale, "Не удалось скопировать ссылку", "Could not copy the link"));
    }
  };

  const askAi = () => {
    openWithPrompt(
      L(
        locale,
        `Объясни результат: ${object.name}, ${variable.name}, ${period.from}–${period.to}. ${stats.summary} Что мне посмотреть дальше и какие ограничения важно учесть?`,
        `Explain the result: ${object.nameEn}, ${variable.nameEn}, ${period.from}–${period.to}. ${stats.summaryEn} What should I look at next, and which limitations matter?`,
      ),
    );
  };

  const submitFeedback = async (rating: "up" | "down") => {
    setFeedback(rating);
    setFeedbackSent(true);
    await sendFeedback({
      objectCode: object.code,
      variableCode: variable.code,
      rating: rating === "up" ? 5 : 2,
      comment: comment.trim() || undefined,
    });
    toast.success(L(locale, "Спасибо! Это помогает нам улучшать продукт.", "Thank you! This helps us improve the product."));
  };

  const availableVariables = variables.filter((v) => object.variables.includes(v.code) && v.code !== variable.code);
  const chainKnown = chain?.links.filter((l) => l.status !== "insufficient").length ?? 0;
  const chainConfirmed = chain?.links.filter((l) => l.status === "confirmed").length ?? 0;

  return (
    <div className="section pb-20 pt-8">
      {/* breadcrumb */}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
        <Link href="/" className="transition hover:text-slate-200">{L(locale, "Карта", "Map")}</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/explore?section=${variable.section}&object=${object.code}`} className="transition hover:text-slate-200">{L(locale, "Исследовать", "Explore")}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-300">{oName}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-400">{vName}</span>
      </div>

      {/* header */}
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="slate" className="font-mono text-[9px] uppercase tracking-wider">
              {locale === "en" ? sectionLabelEn(variable.section) : sectionLabel(variable.section)}
            </Badge>
            <TrendBadge direction={stats.direction} confidence={stats.confidence} />
            <SourceFlags
              isProxy={variable.isProxy}
              isReconstruction={variable.isReconstruction}
              isRegulated={object.isRegulated}
              proxyNote={locale === "en" ? undefined : variable.proxyNote}
              reconstructionNote={locale === "en" ? undefined : variable.reconstructionNote}
              regulatedNote={locale === "en" ? undefined : object.regulatedNote}
            />
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-slate-50 sm:text-4xl">
            {oName}
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            {vName} · {period.from}–{period.to} · {payload.dataset}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={share} className="btn-secondary btn-sm">
            <Share2 className="h-3.5 w-3.5" /> {L(locale, "Поделиться", "Share")}
          </button>
          <a
            href={`/api/export?object=${object.code}&variable=${variable.code}&from=${period.from}&to=${period.to}&lang=${locale}`}
            className="btn-secondary btn-sm"
            download
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </a>
          <Link
            href={`/compare?variable=${variable.code}&from=${period.from}&to=${period.to}&a=${object.code}&auto=0`}
            className="btn-secondary btn-sm"
          >
            <GitCompare className="h-3.5 w-3.5" /> {L(locale, "Сравнить", "Compare")}
          </Link>
          <button type="button" onClick={askAi} className="btn-primary btn-sm">
            <Sparkles className="h-3.5 w-3.5" /> {L(locale, "Спросить AI", "Ask AI")}
          </button>
        </div>
      </div>

      {/* verdict */}
      <div className={cn("mt-6 overflow-hidden rounded-3xl border bg-gradient-to-br from-white/[0.04] to-transparent", accentBg)}>
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", accentBg)}>
                <DirectionIcon className={cn("h-5 w-5", accent)} />
              </div>
              <div>
                <div className="label">{L(locale, "вердикт", "verdict")}</div>
                <div className="font-display text-lg font-semibold text-slate-100">{directionLabel}</div>
              </div>
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              <span className={cn("font-display text-5xl font-semibold tracking-[-0.04em]", accent)}>
                {insufficient ? "—" : `${slope > 0 ? "+" : slope < 0 ? "−" : ""}${nf(Math.abs(slope), sp)}`}
              </span>
              <span className="text-xs text-slate-400">{insufficient ? "" : su}</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {insufficient
                ? L(locale, "нужно минимум 10 валидных лет", "at least 10 valid years are required")
                : L(locale, "средняя скорость по наклону Сена", "average rate from the Sen slope")}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="chip">
                <CalendarClock className="h-3 w-3 text-slate-400" />
                {L(locale, "за период", "over the period")}: {insufficient ? "—" : `${sf(change, sp)} ${cu}`}
              </span>
              <span className="chip">
                <Layers className="h-3 w-3 text-slate-400" />
                {stats.nYears} {L(locale, "лет", "years")}
              </span>
              <span className="chip">
                <Database className="h-3 w-3 text-slate-400" />
                {L(locale, "покрытие", "coverage")} {Math.round(stats.coverage * 100)}%
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4">
            <p className="text-[15px] leading-relaxed text-slate-200 sm:text-base">{summary}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="p-value" value={pf(stats.p)} hint={L(locale, "вероятность случайности", "chance of randomness")} />
              <Metric label="q (FDR)" value={stats.q !== null ? pf(stats.q) : "—"} hint={L(locale, "с поправкой на сравнения", "corrected for comparisons")} />
              <Metric label={L(locale, "τ Кендалла", "Kendall τ")} value={nf(stats.tau, 2)} hint={L(locale, "сила монотонности", "monotonicity strength")} />
              <Metric
                label={L(locale, "95% ДИ наклона", "95% slope CI")}
                value={stats.slopeCi ? `${sf(stats.slopeCi.lower * scale, sp)}…${sf(stats.slopeCi.upper * scale, sp)}` : "—"}
                hint={L(locale, "диапазон скорости", "rate range")}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider text-slate-600">{L(locale, "значимость", "significance")}</span>
              <div className="flex flex-1 gap-1">
                {[
                  { k: "none", on: noTrend || insufficient },
                  { k: "weak", on: weak },
                  { k: "confident", on: confident },
                ].map((seg) => (
                  <div
                    key={seg.k}
                    className={cn(
                      "h-1.5 flex-1 rounded-full",
                      seg.on ? (seg.k === "confident" ? "bg-aurora-400" : seg.k === "weak" ? "bg-solar-400" : "bg-slate-500") : "bg-white/[0.06]",
                    )}
                  />
                ))}
              </div>
              <span className="text-[9px] text-slate-500">
                {confident ? (locale === "en" ? "p < 0.05" : "p < 0,05") : weak ? (locale === "en" ? "0.05 ≤ p < 0.10" : "0,05 ≤ p < 0,10") : (locale === "en" ? "p ≥ 0.10" : "p ≥ 0,10")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* chart */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070d17]">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-semibold text-slate-100">{L(locale, "Ряд и тренд", "Series and trend")}</span>
              <InfoTip label={L(locale, "Как читать график", "How to read the chart")}>
                {L(
                  locale,
                  "Тонкая линия — месячные значения, точки — годовые агрегаты, пунктир — наклон Сена, полоса — 95 % доверительный интервал наклона. Пропуски не заполняются.",
                  "The thin line is monthly data, dots are annual aggregates, the dashed line is the Sen slope, and the band is the 95% slope confidence interval. Gaps are not filled.",
                )}
              </InfoTip>
            </div>
            <div className="mt-0.5 text-[10px] text-slate-500">
              {hasMonthly
                ? `${L(locale, "месячный ряд", "monthly series")} (${locale === "en" ? unitEn(variable) : variable.unit}) + ${L(locale, "годовые точки", "annual points")} (${locale === "en" ? annualUnitEn(variable) : annualUnit(variable)})`
                : `${L(locale, "годовой ряд", "annual series")} (${locale === "en" ? annualUnitEn(variable) : annualUnit(variable)})`}{" "}
              · {period.from}–{period.to}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasMonthly ? (
              <Tabs
                value={showMonthly ? "month" : "year"}
                onChange={(v) => setShowMonthly(v === "month")}
                size="sm"
                options={[
                  { value: "month", label: L(locale, "Месячно", "Monthly") },
                  { value: "year", label: L(locale, "Год", "Annual") },
                ]}
              />
            ) : (
              <Badge tone="slate" className="px-2 py-0.5 text-[9px]">{L(locale, "годовой ряд", "annual series")}</Badge>
            )}
            <button
              type="button"
              onClick={() => setShowBand((v) => !v)}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-medium transition",
                showBand ? "border-aurora-400/25 bg-aurora-400/[0.07] text-aurora-200" : "border-white/10 bg-white/[0.03] text-slate-400",
              )}
            >
              95% {L(locale, "ДИ", "CI")}
            </button>
            <button
              type="button"
              onClick={() => setShowPeriod((v) => !v)}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-slate-400 transition hover:text-slate-200"
            >
              {L(locale, "Период", "Period")}
            </button>
          </div>
        </div>

        {showPeriod && (
          <div className="border-b border-white/[0.07] bg-white/[0.02] px-5 py-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <PeriodSlider from={localFrom} to={localTo} min={periodBounds.from} max={periodBounds.to} onChange={(f, t) => { setLocalFrom(f); setLocalTo(t); }} />
              <div className="flex flex-wrap items-center gap-2">
                <YearSelect value={localFrom} min={periodBounds.from} max={localTo - 9} onChange={(v) => setLocalFrom(v)} label={L(locale, "с", "from")} />
                <YearSelect value={localTo} min={localFrom + 9} max={periodBounds.to} onChange={(v) => setLocalTo(v)} label={L(locale, "по", "to")} />
                <button type="button" onClick={applyPeriod} className="btn-primary btn-sm">
                  {L(locale, "Применить", "Apply")} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="mt-2 text-[9px] text-slate-600">
              {L(locale, "Минимум 10 лет. Смена периода пересчитывает тренд, p, q и цепочку.", "At least 10 years. Changing the period recomputes the trend, p, q and the chain.")}
            </div>
          </div>
        )}

        <div className="px-2 py-3 sm:px-4">
          <TrendChart payload={payload} height={360} showMonthly={showMonthly && hasMonthly} showBand={showBand} />
        </div>
        <div className="flex flex-col gap-2 border-t border-white/[0.07] px-5 py-3 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {hasMonthly && (
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: variable.color }} /> {L(locale, "ряд", "series")}</span>
            )}
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: variable.color }} /> {L(locale, "годовые", "annual")}</span>
            {payload.annual.some((p) => p.quality === "reconstructed") && (
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-violet-400" /> {L(locale, "реконструкция", "reconstruction")}</span>
            )}
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t border-dashed" style={{ borderColor: variable.color }} /> {L(locale, "Сен", "Sen")}</span>
            {showBand && <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-white/10" /> 95% {L(locale, "ДИ", "CI")}</span>}
          </div>
          <span>
            {L(locale, "Источник", "Source")}: {payload.source.name} · {payload.dataset}
          </span>
        </div>
      </div>

      {/* three lines */}
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-aurora-300">
            <FlaskConical className="h-3.5 w-3.5" /> {L(locale, "что посчитано", "what was computed")}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            {L(
              locale,
              `Годовой ряд, Mann–Kendall${stats.hamedRaoApplied ? " с поправкой Хамеда–Рао" : ""}, наклон Сена с 95 % ДИ,${stats.seasonalP !== null ? " сезонная проверка, " : " "}FDR-поправка.`,
              `Annual series, Mann–Kendall${stats.hamedRaoApplied ? " with Hamed–Rao correction" : ""}, Sen slope with 95% CI,${stats.seasonalP !== null ? " seasonal check, " : " "}FDR correction.`,
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-ice-300">
            <Database className="h-3.5 w-3.5" /> {L(locale, "на каких данных", "on what data")}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            {payload.source.name}; {payload.dataset}. {L(locale, "Период", "Period")} {period.from}–{period.to}; {L(locale, "покрытие", "coverage")}{" "}
            {Math.round(stats.coverage * 100)}%; {L(locale, "пропусков", "missing")} {(stats.missingShare * 100).toFixed(0)}%.
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-solar-300">
            <ShieldAlert className="h-3.5 w-3.5" /> {L(locale, "чего это не доказывает", "what it does not prove")}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            {L(
              locale,
              "Тренд не доказывает причину. Он зависит от периода; совпадение направлений — не причинная связь.",
              "A trend does not prove a cause. It depends on the period; matching directions are not a causal link.",
            )}
          </p>
        </div>
      </div>

      {/* meaning + caveat */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-200">
            <Lightbulb className="h-4 w-4 text-solar-300" /> {L(locale, "Что это значит", "What this means")}
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
            {L(locale, variable.whyItMatters, variable.whyItMattersEn ?? variable.whyItMatters)}
          </p>
          <p className="mt-3 text-[12px] leading-relaxed text-slate-400">
            {confident
              ? L(
                  locale,
                  `Направление устойчивое: при уровне значимости 0,05 результат вряд ли объясняется случайностью. Но это средний темп за ${stats.nYears} лет, а не обещание, что так будет дальше.`,
                  `The direction is stable: at the 0.05 level the result is unlikely to be random. But this is an average rate over ${stats.nYears} years, not a promise about the future.`,
                )
              : weak
                ? L(
                    locale,
                    "Признаки слабые: p между 0,05 и 0,10. Это повод присмотреться, а не готовый вывод. Проверьте другой период или более длинный ряд.",
                    "The evidence is weak: p is between 0.05 and 0.10. It is a reason to look closer, not a conclusion. Try another period or a longer record.",
                  )
                : L(
                    locale,
                    "Устойчивого линейного тренда не видно. Это не значит, что климат не меняется: возможны нелинейные сдвиги, короткие эпизоды и зависимость от выбранного периода.",
                    "No stable linear trend is visible. That does not mean the climate is not changing: non-linear shifts, short episodes and period dependence are possible.",
                  )}
          </p>
        </div>
        <div className="rounded-2xl border border-solar-400/15 bg-solar-400/[0.035] p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-solar-200">
            <ShieldAlert className="h-4 w-4" /> {L(locale, "Чего это не доказывает", "What this does not prove")}
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-solar-100/70">{caveat}</p>
        </div>
      </div>

      {/* years to significance */}
      {stats.yearsToSignificance && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-violet-400/15 bg-violet-400/[0.04] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-300">
                <CalendarClock className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-violet-200">{L(locale, "Сколько лет до значимости?", "How many years until significance?")}</div>
                <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-violet-100/60">
                  {L(locale, stats.yearsToSignificance.note, stats.yearsToSignificance.noteEn)}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <div className="font-display text-3xl font-semibold text-violet-200">
                {stats.yearsToSignificance.year ?? "—"}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-violet-300/60">
                {stats.yearsToSignificance.year
                  ? L(locale, "ожидаемый год p < 0,05", "expected year of p < 0.05")
                  : L(locale, "до 2050", "by 2050")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* chain */}
      {chain && (
        <section className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-px w-8 bg-aurora-400/60" />
                <span className="label text-aurora-300/90">{L(locale, "цепочка гипотез", "hypothesis chain")}</span>
              </div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-50">
                {L(locale, chain.chain.name, chain.chain.nameEn ?? chain.chain.name)}
              </h2>
              <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-slate-400">
                {L(locale, chain.chain.description, chain.chain.descriptionEn ?? chain.chain.description)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={chainConfirmed > 0 ? "aurora" : "slate"}>
                {L(locale, "согласуется", "agrees")} {chainConfirmed}/{chainKnown}
              </Badge>
              <InfoTip label={L(locale, "Это причинность?", "Is this causation?")}>
                {L(
                  locale,
                  "Нет. Мы проверяем согласованность направлений трендов с гипотезой из литературы. Корреляция трендовых рядов может быть ложной.",
                  "No. We check whether trend directions agree with a hypothesis from the literature. Correlations between trending series can be spurious.",
                )}
              </InfoTip>
            </div>
          </div>

          <div className={cn("mt-5 grid gap-2", chain.links.length >= 5 ? "lg:grid-cols-5" : chain.links.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
            {chain.links.map((link, i) => (
              <div key={link.variable.code} className="relative flex items-stretch">
                <Link
                  href={link.href}
                  className="group flex w-full flex-col rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5 transition hover:border-aurora-400/25 hover:bg-white/[0.045]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-semibold leading-tight text-slate-200">
                      {L(locale, link.variable.shortName, link.variable.nameEn)}
                    </span>
                    <span className={cn("shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-medium", CHAIN_STATUS[link.status])}>
                      {L(locale, link.statusLabel, link.statusLabelEn)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    {link.trend ? (
                      <span className={cn("font-mono text-[10px]", link.trend.confidence === "confident" ? (link.trend.direction === "rising" ? "text-aurora-300" : "text-ember-400") : "text-slate-400")}>
                        {slopeText({ ...payload, variable: link.variable, stats: link.trend }, locale)}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-600">{L(locale, "нет данных", "no data")}</span>
                    )}
                  </div>
                  <div className="mt-2 flex-1">
                    {link.annual.length > 1 ? (
                      <Sparkline points={link.annual} color={link.variable.color} height={34} />
                    ) : (
                      <div className="h-8 rounded bg-white/[0.03]" />
                    )}
                  </div>
                  {link.correlation && (
                    <div className="mt-1.5 border-t border-white/[0.06] pt-1.5 font-mono text-[8px] text-slate-600">
                      {correlationText(link.correlation.rho, link.correlation.p, locale)}
                    </div>
                  )}
                  <div className="mt-1 text-[8px] uppercase tracking-wider text-slate-600">
                    {L(locale, "ожидается", "expected")} {link.expected === "+" ? L(locale, "рост", "rise") : L(locale, "снижение", "fall")}
                  </div>
                </Link>
                {i < chain.links.length - 1 && (
                  <div className="pointer-events-none absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 lg:block">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full border border-white/10 bg-[#070c14]">
                      <ChevronRight className="h-2.5 w-2.5 text-slate-500" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[10px] leading-relaxed text-slate-500">
            {L(locale, chain.summary, chain.summaryEn)} {L(locale, chain.caveat, chain.caveatEn)}
          </p>
        </section>
      )}

      {/* details + other variables */}
      <div className="mt-10 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-aurora-300" />
            <h2 className="font-display text-lg font-semibold text-slate-100">{L(locale, "Подробнее", "Details")}</h2>
          </div>
          <Accordion
            defaultOpen={0}
            items={[
              {
                title: L(locale, "Метод и числа", "Method and numbers"),
                icon: <FlaskConical className="h-3.5 w-3.5 text-aurora-300" />,
                content: (
                  <div className="space-y-3">
                    <p>{detail}</p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {[
                        [L(locale, "Метод", "Method"), stats.method],
                        ["S", nf(stats.s, 0)],
                        [L(locale, "τ Кендалла", "Kendall τ"), nf(stats.tau, 3)],
                        ["z", nf(stats.z, 2)],
                        ["p", pf(stats.p)],
                        ["q (FDR)", stats.q !== null ? pf(stats.q) : "—"],
                        [L(locale, "Наклон Сена", "Sen slope"), `${sf(slope, sp)} ${su}`],
                        [L(locale, "95% ДИ", "95% CI"), stats.slopeCi ? `${sf(stats.slopeCi.lower * scale, sp)} … ${sf(stats.slopeCi.upper * scale, sp)}` : "—"],
                        [L(locale, "Лет", "Years"), String(stats.nYears)],
                        [L(locale, "Пропуски", "Missing"), `${(stats.missingShare * 100).toFixed(1)}%`],
                        [L(locale, "Сезонный MK", "Seasonal MK"), stats.seasonalP !== null ? `p = ${pf(stats.seasonalP)}` : "—"],
                        [L(locale, "Автокорреляция r₁", "Autocorrelation r₁"), nf(stats.autocorrelation, 2)],
                      ].map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
                          <span className="text-[10px] text-slate-500">{k}</span>
                          <span className="font-mono text-[10px] text-slate-300">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                title: L(locale, "Данные и происхождение", "Data and provenance"),
                icon: <Database className="h-3.5 w-3.5 text-ice-300" />,
                content: (
                  <div className="space-y-2">
                    <Row label={L(locale, "Источник", "Source")} value={payload.source.name} />
                    <Row label={L(locale, "Набор", "Dataset")} value={payload.dataset} />
                    <Row label={L(locale, "Лицензия", "License")} value={payload.source.license} />
                    <Row label={L(locale, "Цитирование", "Citation")} value={payload.source.citation} />
                    <Row label={L(locale, "Период ряда", "Series period")} value={payload.seriesMeta ? `${payload.seriesMeta.dateFrom.slice(0, 7)} — ${payload.seriesMeta.dateTo.slice(0, 7)}` : "—"} />
                    <Row label={L(locale, "Шаг", "Step")} value={payload.seriesMeta?.nativeStep === "year" ? L(locale, "годовой", "annual") : L(locale, "месячный", "monthly")} />
                    <Row label={L(locale, "Покрытие", "Coverage")} value={`${Math.round((payload.seriesMeta?.coverage ?? stats.coverage) * 100)}%`} />
                    <a href={payload.source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] text-aurora-300 hover:text-aurora-200">
                      {L(locale, "Открыть источник", "Open source")} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ),
              },
              {
                title: L(locale, "Ограничения", "Limitations"),
                icon: <ShieldAlert className="h-3.5 w-3.5 text-solar-300" />,
                content: <p>{caveat}</p>,
              },
              {
                title: L(locale, "Определения", "Definitions"),
                icon: <CircleHelp className="h-3.5 w-3.5 text-violet-300" />,
                content: (
                  <div className="space-y-3">
                    <Def term={L(locale, "Тренд", "Trend")}>{L(locale, "Направление изменения ряда во времени. Мы проверяем монотонный тренд, а не любые колебания.", "The direction of change over time. We test a monotonic trend, not any fluctuation.")}</Def>
                    <Def term="p-value">{L(locale, "Вероятность увидеть такой (или более сильный) тренд случайно, если тренда нет. Меньше 0,05 — уверенный результат.", "The probability of seeing such a trend (or stronger) by chance if there is no trend. Below 0.05 is a confident result.")}</Def>
                    <Def term="q-value (FDR)">{L(locale, "p-value с поправкой Benjamini–Hochberg на множественные сравнения. Нужен, когда проверяем много объектов сразу.", "A p-value corrected with Benjamini–Hochberg for multiple comparisons. Needed when testing many objects at once.")}</Def>
                    <Def term={L(locale, "Наклон Сена", "Sen slope")}>{L(locale, "Медиана всех парных наклонов. Устойчив к выбросам, в отличие от обычной линейной регрессии.", "The median of all pairwise slopes. Robust to outliers, unlike ordinary least squares.")}</Def>
                    <Def term={L(locale, "Поправка Хамеда–Рао", "Hamed–Rao correction")}>{L(locale, "Корректирует дисперсию теста при автокорреляции, чтобы не завышать значимость.", "Corrects the test variance under autocorrelation so significance is not overstated.")}</Def>
                    <Def term={L(locale, "Сезонный MK", "Seasonal MK")}>{L(locale, "Тест Hirsch–Slack: считает тренд внутри каждого месяца отдельно, чтобы сезонность не ломала результат.", "The Hirsch–Slack test: computes a trend within each month separately so seasonality does not break the result.")}</Def>
                  </div>
                ),
              },
            ]}
          />
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-slate-100">{L(locale, "Другие параметры", "Other variables")}</h2>
            <Link href={`/explore?section=${variable.section}&object=${object.code}`} className="text-[10px] text-aurora-300 hover:text-aurora-200">
              {L(locale, "изменить", "change")}
            </Link>
          </div>
          <div className="grid gap-2">
            {availableVariables.map((v) => (
              <Link
                key={v.code}
                href={`/analysis?object=${object.code}&variable=${v.code}&from=${period.from}&to=${period.to}`}
                className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 transition hover:border-aurora-400/25 hover:bg-white/[0.04]"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: v.color }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-medium text-slate-200">{L(locale, v.name, v.nameEn)}</span>
                  <span className="block text-[9px] text-slate-500">{locale === "en" ? unitEn(v) : v.unit} · {v.source.name}</span>
                </span>
                <ArrowUpRight className="h-3 w-3 shrink-0 text-slate-600 transition group-hover:text-aurora-300" />
              </Link>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-aurora-400/15 bg-aurora-400/[0.04] p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-aurora-200">
              <Sparkles className="h-3.5 w-3.5" /> {L(locale, "AI-детектив", "AI detective")}
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-aurora-100/60">
              {L(locale, "Он видит этот результат и может объяснить его проще, предложить следующий период или сравнение.", "It sees this result and can explain it more simply, suggest another period or a comparison.")}
            </p>
            <button type="button" onClick={askAi} className="btn-primary btn-sm mt-3 w-full">
              <MessageCircle className="h-3.5 w-3.5" /> {L(locale, "Объяснить результат", "Explain the result")}
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="text-[11px] font-semibold text-slate-200">{L(locale, "Было полезно?", "Was this useful?")}</div>
            <p className="mt-1 text-[10px] text-slate-500">{L(locale, "Оцените результат — это помогает улучшать продукт.", "Rate the result — it helps us improve the product.")}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void submitFeedback("up")}
                disabled={feedbackSent}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] transition",
                  feedback === "up" ? "border-aurora-400/40 bg-aurora-400/10 text-aurora-200" : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-200",
                )}
              >
                <ThumbsUp className="h-3.5 w-3.5" /> {L(locale, "Да", "Yes")}
              </button>
              <button
                type="button"
                onClick={() => void submitFeedback("down")}
                disabled={feedbackSent}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] transition",
                  feedback === "down" ? "border-ember-400/40 bg-ember-400/10 text-ember-400" : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-200",
                )}
              >
                <ThumbsDown className="h-3.5 w-3.5" /> {L(locale, "Нет", "No")}
              </button>
            </div>
            {feedbackSent && <div className="mt-2 flex items-center gap-1 text-[9px] text-aurora-300"><Check className="h-3 w-3" /> {L(locale, "Спасибо!", "Thank you!")}</div>}
          </div>
        </div>
      </div>

      {/* bottom actions */}
      <div className="mt-10 flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:flex-row">
        <div className="text-[11px] text-slate-500">
          {L(locale, "Хотите проверить другой период или объект? Это нормальный путь детектива.", "Want to test another period or object? That is the normal detective path.")}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/explore?section=${variable.section}&object=${object.code}&variable=${variable.code}&from=${period.from}&to=${period.to}`} className="btn-secondary btn-sm">
            <ArrowLeft className="h-3.5 w-3.5" /> {L(locale, "Изменить запрос", "Change query")}
          </Link>
          <Link href="/compare" className="btn-secondary btn-sm">
            <GitCompare className="h-3.5 w-3.5" /> {L(locale, "Сравнить регионы", "Compare regions")}
          </Link>
          <button type="button" onClick={share} className="btn-secondary btn-sm">
            <Clipboard className="h-3.5 w-3.5" /> {L(locale, "Скопировать ссылку", "Copy link")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#070c14]/60 px-2.5 py-2">
      <div className="text-[8px] uppercase tracking-wider text-slate-600">{label}</div>
      <div className="mt-0.5 font-mono text-[12px] text-slate-200">{value}</div>
      {hint && <div className="mt-0.5 text-[8px] text-slate-600">{hint}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.05] py-1.5 last:border-0">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className="max-w-[70%] text-right text-[10px] text-slate-300">{value}</span>
    </div>
  );
}

function Def({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-slate-200">{term}</div>
      <div className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{children}</div>
    </div>
  );
}
