import { Database, ExternalLink, ShieldCheck } from "lucide-react";
import { getLocale } from "@/lib/i18n-server";
import { L } from "@/lib/i18n";

const SOURCES = [
  { name: "NASA POWER", ru: "MERRA-2 / GLDAS / GPM IMERG: температура, осадки, почвенная влага, испарение, снег", en: "MERRA-2 / GLDAS / GPM IMERG: temperature, precipitation, soil moisture, evaporation, snow", href: "https://power.larc.nasa.gov/" },
  { name: "NOAA NCEI", ru: "NOAAGlobalTemp v6: аномалия глобальной температуры", en: "NOAAGlobalTemp v6: global temperature anomaly", href: "https://www.ncei.noaa.gov/" },
  { name: "NOAA GML", ru: "Мауна-Лоа: концентрация CO₂", en: "Mauna Loa: atmospheric CO₂ concentration", href: "https://gml.noaa.gov/ccgg/trends/" },
  { name: "GeoBoundaries", ru: "Границы регионов Кыргызстана, ODbL", en: "Kyrgyzstan region boundaries, ODbL", href: "https://www.geoboundaries.org/" },
];

export async function DataStrip() {
  const locale = await getLocale();
  return (
    <section className="section mt-24 sm:mt-32">
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-aurora-300" />
              <span className="label text-aurora-300/90">{L(locale, "данные и происхождение", "data & provenance")}</span>
            </div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-50">
              {L(locale, "Открытые источники. Явные ограничения.", "Open sources. Explicit limits.")}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-aurora-300" />
            {L(locale, "у каждого ряда — источник, набор, лицензия и цитирование", "every series has a source, dataset, license and citation")}
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SOURCES.map((s) => (
            <a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              className="group rounded-2xl border border-white/[0.07] bg-[#070c14]/60 p-4 transition hover:border-aurora-400/25 hover:bg-white/[0.035]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-slate-200">{s.name}</span>
                <ExternalLink className="h-3 w-3 text-slate-600 transition group-hover:text-aurora-300" />
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">{L(locale, s.ru, s.en)}</p>
            </a>
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-2 border-t border-white/[0.06] pt-4 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {L(
              locale,
              "Уровень Иссык-Куля — реконструкция по Zhang et al. (2022), Remote Sensing 14(7), 1575. Не сырой Hydroweb.",
              "Issyk-Kul level is a reconstruction from Zhang et al. (2022), Remote Sensing 14(7), 1575. Not raw Hydroweb.",
            )}
          </span>
          <span className="font-mono text-slate-600">2000–2025 · monthly · WGS84</span>
        </div>
      </div>
    </section>
  );
}
