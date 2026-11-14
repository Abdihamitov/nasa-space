import Link from "next/link";
import { ArrowUpRight, Github } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { getLocale } from "@/lib/i18n-server";
import { L } from "@/lib/i18n";

export async function SiteFooter() {
  const locale = await getLocale();
  return (
    <footer className="mt-24 border-t border-white/[0.07] bg-[#03060b]/60">
      <div className="section py-12">
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-slate-500">
              {L(
                locale,
                "Analysis-ready куб климатических данных Кыргызстана. Тренды, значимость и честные оговорки — вместо разрозненных графиков.",
                "An analysis-ready climate data cube for Kyrgyzstan. Trends, significance and honest caveats instead of scattered charts.",
              )}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="chip">NASA Space Apps 2026</span>
              <span className="chip">Earth System Trend Detective</span>
              <a
                href={process.env.NEXT_PUBLIC_TEAM_URL || "https://www.spaceappschallenge.org/2026/find-a-team/2317/?tab=members"}
                target="_blank"
                rel="noreferrer"
                className="chip transition hover:border-aurora-400/30 hover:text-aurora-200"
              >
                Team K2
              </a>
            </div>
          </div>

          <div>
            <div className="label mb-3">{L(locale, "Продукт", "Product")}</div>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link className="transition hover:text-aurora-300" href="/">{L(locale, "Карта явлений", "Phenomena map")}</Link></li>
              <li><Link className="transition hover:text-aurora-300" href="/explore">{L(locale, "Исследовать", "Explore")}</Link></li>
              <li><Link className="transition hover:text-aurora-300" href="/compare">{L(locale, "Сравнить регионы", "Compare regions")}</Link></li>
              <li><Link className="transition hover:text-aurora-300" href="/method">{L(locale, "Методология", "Methodology")}</Link></li>
            </ul>
          </div>

          <div>
            <div className="label mb-3">{L(locale, "Данные", "Data")}</div>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a className="transition hover:text-aurora-300" href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer">NASA POWER</a></li>
              <li><a className="transition hover:text-aurora-300" href="https://www.ncei.noaa.gov/" target="_blank" rel="noreferrer">NOAA NCEI</a></li>
              <li><a className="transition hover:text-aurora-300" href="https://gml.noaa.gov/ccgg/trends/" target="_blank" rel="noreferrer">NOAA GML CO₂</a></li>
              <li><a className="transition hover:text-aurora-300" href="https://www.geoboundaries.org/" target="_blank" rel="noreferrer">GeoBoundaries</a></li>
            </ul>
          </div>

          <div>
            <div className="label mb-3">{L(locale, "Открытость", "Openness")}</div>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <a className="inline-flex items-center gap-1 transition hover:text-aurora-300" href={process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com"} target="_blank" rel="noreferrer">
                  GitHub <Github className="h-3 w-3" />
                </a>
              </li>
              <li><Link className="transition hover:text-aurora-300" href="/method#sources">{L(locale, "Источники и лицензии", "Sources & licenses")}</Link></li>
              <li><Link className="transition hover:text-aurora-300" href="/method#limits">{L(locale, "Ограничения", "Limitations")}</Link></li>
              <li>
                <a className="inline-flex items-center gap-1 transition hover:text-aurora-300" href="https://www.spaceappschallenge.org/2026/find-a-team/2317/?tab=members" target="_blank" rel="noreferrer">
                  Team K2 <ArrowUpRight className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.06] pt-6 text-[10px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div>© 2026 K2 · MIT License · {L(locale, "Данные принадлежат их источникам", "Data belongs to its sources")}</div>
          <div className="max-w-xl sm:text-right">
            {L(
              locale,
              "Это исследовательский инструмент, а не прогноз. Тренд зависит от периода; совпадение направлений не доказывает причинность.",
              "A research tool, not a forecast. Trends depend on the period; matching directions do not prove causation.",
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
