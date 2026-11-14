import Link from "next/link";
import { ArrowRight, ArrowUpRight, Compass, Database, Globe2, Layers, Sparkles } from "lucide-react";
import geoJson from "@/data/geo/kyrgyzstan.json";
import { getCatalog, getMeta, getPhenomena } from "@/lib/catalog";
import { getLocale } from "@/lib/i18n-server";
import { L } from "@/lib/i18n";
import { buildPhenomenonMap } from "@/lib/phenomena";
import { HeroMap } from "@/components/home/HeroMap";
import { HeroActions } from "@/components/home/HeroActions";
import { QuestionCards } from "@/components/home/QuestionCards";
import { HomeExplorer } from "@/components/home/HomeExplorer";
import { HowItWorks, MethodTeaser } from "@/components/home/HowItWorks";
import { AiSection } from "@/components/home/AiSection";
import { DataStrip } from "@/components/home/DataStrip";
import { SectionHeading, Stat } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/Badge";

export const revalidate = 3600;

type Geo = { type: "FeatureCollection"; features: { type: "Feature"; properties: { name: string; nameEn: string; code: string }; geometry: unknown }[] };

export default async function HomePage() {
  const locale = await getLocale();
  const catalog = getCatalog();
  const meta = getMeta();
  const phenomena = getPhenomena();
  const geo = geoJson as unknown as Geo;
  const initialMap = buildPhenomenonMap("global-warming", meta.period.from, meta.period.to);

  if (!initialMap) {
    return (
      <div className="section py-24 text-center text-slate-400">
        Данные ещё не собраны. Запустите <code className="text-aurora-300">python3 etl/fetch_data.py</code>.
      </div>
    );
  }

  const years = meta.period.to - meta.period.from + 1;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-aurora-400/[0.055] blur-3xl" />
        <div className="pointer-events-none absolute -right-40 top-32 -z-10 h-[420px] w-[420px] rounded-full border border-white/[0.04]" />
        <div className="pointer-events-none absolute -right-24 top-48 -z-10 h-[280px] w-[280px] rounded-full border border-white/[0.05]" />
        <div className="section relative grid gap-12 pb-14 pt-12 lg:grid-cols-[1.02fr_1fr] lg:items-center lg:gap-10 lg:pb-20 lg:pt-20">
          <div className="animate-fade-up">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="aurora" className="font-mono tracking-wider">
                NASA SPACE APPS 2026
              </Badge>
              <Badge tone="slate" className="font-mono tracking-wider">
                EARTH SYSTEM TREND DETECTIVE
              </Badge>
            </div>

            <h1 className="mt-6 font-display text-[2.65rem] font-semibold leading-[1.03] tracking-[-0.045em] text-slate-50 text-balance sm:text-6xl lg:text-[4.1rem]">
              {L(locale, "Климат Кыргызстана.", "Kyrgyzstan's climate.")}
              <br />
              <span className="text-gradient-aurora">{L(locale, "Без догадок.", "No guesswork.")}</span>
            </h1>

            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-slate-400 sm:text-base">
              {L(
                locale,
                "K2 собирает спутниковые и климатические данные в один analysis-ready куб — и отвечает не графиком, а трендом: что меняется, где, насколько уверенно и чего этот результат не доказывает.",
                "K2 turns satellite and climate data into one analysis-ready cube — and answers with a trend, not just a chart: what is changing, where, how confidently, and what the result does not prove.",
              )}
            </p>

            <div className="mt-8">
              <HeroActions />
            </div>

            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-white/[0.08] pt-6 sm:grid-cols-4">
              <Stat value={meta.objectCount} label={L(locale, "объектов", "objects")} hint={L(locale, "озёра, ледники, регионы", "lakes, glaciers, regions")} />
              <Stat value={meta.variableCount} label={L(locale, "переменных", "variables")} hint={L(locale, "вода, снег, климат", "water, snow, climate")} />
              <Stat value={years} label={L(locale, "лет данных", "years")} hint={`${meta.period.from}–${meta.period.to}`} />
              <Stat value={meta.sources.length} label={L(locale, "источника", "sources")} hint={L(locale, "NASA, NOAA, GeoBoundaries", "NASA, NOAA, GeoBoundaries")} />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-[10px] text-slate-600">
              <span className="chip"><Compass className="h-3 w-3 text-aurora-300" /> WGS84</span>
              <span className="chip"><Layers className="h-3 w-3 text-ice-300" /> monthly cube</span>
              <span className="chip"><Database className="h-3 w-3 text-violet-300" /> {meta.seriesCount} {L(locale, "рядов", "series")}</span>
              <span className="chip"><Globe2 className="h-3 w-3 text-solar-300" /> {meta.gridCount} {L(locale, "точек сетки", "grid points")}</span>
            </div>
          </div>

          <div className="animate-fade-up animation-delay-200">
            <HeroMap map={initialMap} geo={geo} />
            <div className="mt-3 flex items-center justify-between px-1 text-[9px] text-slate-600">
              <span>{L(locale, "Карта: объекты каталога. Размер точки — сила тренда.", "Map: catalog objects. Dot size reflects trend strength.")}</span>
              <span className="font-mono">ISSUE 01 · 2026</span>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="flex flex-wrap items-center justify-between gap-4 border-y border-white/[0.06] py-4 text-[10px] text-slate-500">
            <span className="label">{L(locale, "в основе", "under the hood")}</span>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span>Mann–Kendall</span>
              <span>Hamed–Rao</span>
              <span>Sen slope + 95% CI</span>
              <span>Benjamini–Hochberg FDR</span>
              <span>NASA POWER</span>
              <span>NOAA</span>
            </div>
            <Link href="/method" className="inline-flex items-center gap-1 text-aurora-300 transition hover:text-aurora-200">
              {L(locale, "методология", "methodology")} <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      <QuestionCards />

      {/* PHENOMENA MAP */}
      <section id="phenomena" className="section mt-24 scroll-mt-24 sm:mt-32">
        <SectionHeading
          eyebrow={L(locale, "от глобального к местному", "from global to local")}
          title={L(locale, "Выберите явление — карта покажет, где сигнал сильнее", "Pick a phenomenon — the map shows where the signal is strongest")}
          description={L(
            locale,
            "Глобальное потепление, сдвиг осадков или снежный сезон. Точки ранжированы по силе локального тренда; незначимые — приглушены. Клик по объекту открывает местный график рядом с глобальным индикатором.",
            "Global warming, a precipitation shift or the snow season. Objects are ranked by local trend strength; non-significant ones are muted. Click an object to see its local series next to the global indicator.",
          )}
          action={
            <Link href="/explore" className="btn-secondary btn-sm">
              {L(locale, "Открыть конструктор", "Open the explorer")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <div className="mt-8">
          <HomeExplorer initialMap={initialMap} phenomena={phenomena} geo={geo} period={meta.period} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 px-1 text-[10px] text-slate-600">
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-aurora-400" /> {L(locale, "значимый рост", "significant rise")}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-ember-400" /> {L(locale, "значимое снижение", "significant fall")}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-solar-400" /> {L(locale, "слабые признаки", "weak evidence")}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" /> {L(locale, "тренда нет", "no trend")}</span>
          <span className="ml-auto">{L(locale, "q — с FDR-поправкой на множественные сравнения", "q — FDR-corrected for multiple comparisons")}</span>
        </div>
      </section>

      <HowItWorks />
      <MethodTeaser />
      <AiSection />
      <DataStrip />

      {/* FINAL CTA */}
      <section className="section mt-24 sm:mt-32">
        <div className="relative overflow-hidden rounded-3xl border border-aurora-400/15 bg-[#061018] px-6 py-12 text-center sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(46,230,200,0.12),transparent_65%)]" />
          <div className="relative mx-auto max-w-2xl">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-aurora-400/25 bg-aurora-400/10 text-aurora-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-slate-50 text-balance sm:text-4xl">
              {L(locale, "Проверьте свой климатический вопрос", "Ask your own climate question")}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              {L(
                locale,
                "Выберите объект и параметр — или просто спросите AI-детектива. Он объяснит результат, покажет ограничения и предложит следующий шаг.",
                "Pick an object and a variable — or just ask the AI detective. It will explain the result, show the limits and suggest the next step.",
              )}
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/explore" className="btn-primary">
                {L(locale, "Открыть «Исследовать»", "Open Explore")} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/compare?variable=precip&from=2000&to=2025&auto=1" className="btn-secondary">
                {L(locale, "Сравнить регионы", "Compare regions")}
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] text-slate-600">
              <span>20 {L(locale, "объектов", "objects")}</span>
              <span className="h-1 w-1 rounded-full bg-slate-700" />
              <span>10 {L(locale, "переменных", "variables")}</span>
              <span className="h-1 w-1 rounded-full bg-slate-700" />
              <span>2000–2025</span>
              <span className="h-1 w-1 rounded-full bg-slate-700" />
              <span>4 {L(locale, "источника", "sources")}</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
