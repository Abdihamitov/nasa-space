"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoConicEqualArea, geoGraticule10, geoPath } from "d3-geo";
import { cn } from "@/lib/utils";
import { formatP, slopeUnit } from "@/lib/format";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { L, pickName } from "@/lib/i18n";
import type { MapMarker } from "@/lib/types";
import geoJson from "@/data/geo/kyrgyzstan.json";

type GeoFeature = {
  type: "Feature";
  properties: { name: string; nameEn: string; code: string };
  geometry: unknown;
};
type GeoCollection = { type: "FeatureCollection"; features: GeoFeature[] };

// Imported here (not passed as a prop from server components) so the
// geometry ships once in this module's JS chunk, which the browser caches,
// instead of being serialized into the RSC payload of every page that shows
// a map — twice on the home page.
const geo = geoJson as unknown as GeoCollection;

/** Point colours by object type (explore map). Exported for the legend. */
export const POINT_TYPES: { type: string; color: string; ru: string; en: string }[] = [
  { type: "region", color: "#fbbf24", ru: "области", en: "regions" },
  { type: "city", color: "#fb923c", ru: "города", en: "cities" },
  { type: "lake", color: "#38bdf8", ru: "озёра", en: "lakes" },
  { type: "reservoir", color: "#22d3ee", ru: "водохранилища", en: "reservoirs" },
  { type: "river", color: "#60a5fa", ru: "реки", en: "rivers" },
  { type: "glacier", color: "#c4b5fd", ru: "ледники", en: "glaciers" },
  { type: "grid", color: "#94a3b8", ru: "точка сетки", en: "grid cell" },
];
const POINT_COLOR = new Map(POINT_TYPES.map((t) => [t.type, t.color]));
export function pointColor(type: string): string {
  return POINT_COLOR.get(type) ?? "#94a3b8";
}

export type MapPoint = {
  code: string;
  lat: number;
  lon: number;
  name: string;
  type: string;
  selected?: boolean;
};

const W = 800;
const H = 520;

const MAP_SHORT: Record<string, string> = {
  "issyk-kul-region": "Иссык-Куль обл.",
  "jalal-abad": "Джалал-Абад",
  toktogul: "Токтогул",
  enilchek: "Энильчек",
  petrov: "Петрова",
  "ak-shyirak": "Ак-Шыйрак",
  golubina: "Голубина",
  naryn: "Нарын",
  chu: "Чу",
  "naryn-region": "Нарын обл.",
  chuy: "Чуй обл.",
  "osh-region": "Ош обл.",
  batken: "Баткен",
  talas: "Талас",
  bishkek: "Бишкек",
  "osh-city": "Ош",
  "son-kul": "Сон-Куль",
  "chatyr-kul": "Чатыр-Куль",
  "issyk-kul": "Иссык-Куль",
};

function markerColor(marker: MapMarker): string {
  if (marker.trend.confidence === "confident") {
    return marker.trend.direction === "rising" ? "#2ee6c8" : "#fb7185";
  }
  if (marker.trend.confidence === "weak") return "#fbbf24";
  return "#64748b";
}

function markerOpacity(marker: MapMarker): number {
  if (marker.trend.confidence === "confident") return 1;
  if (marker.trend.confidence === "weak") return 0.8;
  return 0.45;
}

export function KyrgyzstanMap({
  markers,
  points = [],
  selected,
  onSelect,
  onPoint,
  className,
  variant = "full",
  showLabels = true,
}: {
  markers: MapMarker[];
  points?: MapPoint[];
  selected?: string | null;
  onSelect?: (code: string) => void;
  onPoint?: (lat: number, lon: number) => void;
  className?: string;
  variant?: "hero" | "full";
  showLabels?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  // Explore points are sized in screen pixels, not viewBox units: on a larger
  // map they keep their size and the gaps between them grow, so nearby
  // objects stop overlapping. `unit` = viewBox units per CSS pixel.
  const [renderedWidth, setRenderedWidth] = useState(360);
  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setRenderedWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const unit = W / renderedWidth;
  const { locale } = useLocale();
  const [hovered, setHovered] = useState<string | null>(null);

  const projection = useMemo(() => {
    const p = geoConicEqualArea()
      .parallels([39, 44])
      .rotate([-74.5, 0])
      .center([0, 41.55]);
    p.fitExtent(
      [
        [30, 34],
        [W - 30, H - 34],
      ],
      geo as never,
    );
    return p;
  }, []);

  const path = useMemo(() => geoPath(projection), [projection]);
  // SVG path strings depend only on the geometry and projection. Compute them
  // once instead of on every render (hover changes re-render the whole map),
  // and reuse the same string for the glow and fill layers.
  const graticulePath = useMemo(() => path(geoGraticule10()) ?? "", [path]);
  const regionPaths = useMemo(
    () => geo.features.map((f) => ({ code: f.properties.code, d: path(f as never) ?? "" })),
    [geo, path],
  );

  const projected = useMemo(() => {
    const map = new Map<string, [number, number]>();
    for (const m of markers) {
      const pt = projection([m.object.lon, m.object.lat]);
      if (pt) map.set(m.object.code, [pt[0], pt[1]]);
    }
    return map;
  }, [markers, projection]);

  const markerByCode = useMemo(() => new Map(markers.map((m) => [m.object.code, m])), [markers]);
  const hoveredMarker = hovered ? markerByCode.get(hovered) : null;
  const hoveredPoint = hovered ? projected.get(hovered) : null;

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onPoint || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    const inv = projection.invert?.([x, y]);
    if (inv) onPoint(inv[1], inv[0]);
  };

  const labelMarkers = useMemo(() => {
    const rank = (m: MapMarker) => (m.object.type === "region" || m.object.type === "city" ? 0 : 1);
    const sorted = [...markers].sort((a, b) => rank(b) - rank(a) || b.strength - a.strength);
    const chosen = new Set<string>();
    const positions: [number, number][] = [];
    const max = variant === "hero" ? 4 : 7;
    for (const m of sorted) {
      if (chosen.size >= max) break;
      const pt = projected.get(m.object.code);
      if (!pt) continue;
      if (positions.some(([x, y]) => Math.hypot(x - pt[0], y - pt[1]) < 62)) continue;
      chosen.add(m.object.code);
      positions.push(pt);
    }
    for (const m of markers) {
      if (!m.object.highlight || chosen.has(m.object.code)) continue;
      const pt = projected.get(m.object.code);
      if (pt && !positions.some(([x, y]) => Math.hypot(x - pt[0], y - pt[1]) < 46)) {
        chosen.add(m.object.code);
        positions.push(pt);
      }
    }
    return chosen;
  }, [markers, variant, projected]);

  return (
    <div className={cn("relative w-full overflow-hidden rounded-2xl", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Карта Кыргызстана с объектами и направлением тренда"
        onClick={handleMapClick}
      >
        <defs>
          <radialGradient id="map-bg" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor="#0b1b26" />
            <stop offset="55%" stopColor="#070f19" />
            <stop offset="100%" stopColor="#04070d" />
          </radialGradient>
          <linearGradient id="region-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#123042" />
            <stop offset="55%" stopColor="#0e2233" />
            <stop offset="100%" stopColor="#0a1724" />
          </linearGradient>
          <linearGradient id="country-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6cf7de" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.5" />
          </linearGradient>
          <filter id="marker-glow" x="-200%" y="-200%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(148,163,184,0.07)" strokeWidth="0.6" />
          </pattern>
        </defs>

        <rect width={W} height={H} fill="url(#map-bg)" />
        <rect width={W} height={H} fill="url(#map-grid)" opacity="0.55" />
        <path d={graticulePath} fill="none" stroke="rgba(148,163,184,0.09)" strokeWidth="0.6" strokeDasharray="2 5" />

        {/* country silhouette glow */}
        <g opacity="0.35" filter="url(#soft-glow)">
          {regionPaths.map(({ code, d }) => (
            <path key={`glow-${code}`} d={d} fill="#0aa38f" />
          ))}
        </g>

        {/* regions */}
        <g>
          {regionPaths.map(({ code, d }) => {
            const isActive = selected === code;
            return (
              <path
                key={code}
                d={d}
                className={cn("region-path", isActive && "is-active")}
                fill="url(#region-fill)"
                stroke="url(#country-stroke)"
                strokeWidth={isActive ? 1.8 : 1}
                strokeLinejoin="round"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(code);
                }}
              />
            );
          })}
        </g>

        {/* neutral points (explore mode) */}
        <g>
          {[...points]
            // Draw the selected point last so its ring is not covered.
            .sort((a, b) => Number(a.selected || selected === a.code) - Number(b.selected || selected === b.code))
            .map((p) => {
            const pt = projection([p.lon, p.lat]);
            if (!pt) return null;
            const [x, y] = pt;
            const isSel = p.selected || selected === p.code;
            const color = pointColor(p.type);
            return (
              <g
                key={p.code}
                role="button"
                tabIndex={0}
                aria-label={p.name}
                className="map-marker map-point outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(p.code);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect?.(p.code);
                  }
                }}
              >
                <title>{p.name}</title>
                {/* Invisible, generous hit area: the map is often rendered small. */}
                <circle cx={x} cy={y} r={10 * unit} fill="transparent" />
                <circle cx={x} cy={y} r={(isSel ? 8 : 5.8) * unit} fill={color} opacity={isSel ? 0.25 : 0.14} />
                <circle
                  className="map-point-dot"
                  cx={x}
                  cy={y}
                  r={(isSel ? 4.5 : 3.4) * unit}
                  fill={color}
                  stroke={isSel ? "#f8fafc" : "#04070d"}
                  strokeWidth={(isSel ? 1.1 : 0.7) * unit}
                  opacity={isSel ? 1 : 0.9}
                />
                {isSel && (
                  <circle cx={x} cy={y} r={6 * unit} fill="none" stroke={color} strokeWidth={0.9 * unit}>
                    <animate attributeName="r" values={`${6 * unit};${11 * unit};${6 * unit}`} dur="2.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;0.05;0.9" dur="2.2s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
        </g>

        {/* markers */}
        <g>
          {markers.map((m) => {
            const pt = projected.get(m.object.code);
            if (!pt) return null;
            const [x, y] = pt;
            const r = Math.max(3.8, Math.min(10, 4 + m.strength * 55));
            const color = markerColor(m);
            const isSelected = selected === m.object.code;
            const isHovered = hovered === m.object.code;
            return (
              <g
                key={m.object.code}
                role="button"
                tabIndex={0}
                aria-label={`${pickName(locale, m.object)}: ${m.trend.direction === "rising" ? L(locale, "рост", "rising") : m.trend.direction === "falling" ? L(locale, "снижение", "falling") : L(locale, "тренда нет", "no trend")}`}
                className="map-marker outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(m.object.code);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect?.(m.object.code);
                  }
                }}
                onMouseEnter={() => setHovered(m.object.code)}
                onMouseLeave={() => setHovered(null)}
              >
                <circle cx={x} cy={y} r={r + 7} fill={color} opacity={isHovered || isSelected ? 0.12 : 0.05} />
                {isSelected && (
                  <circle cx={x} cy={y} r={r + 5} fill="none" stroke={color} strokeWidth="1.2" opacity="0.7">
                    <animate attributeName="r" values={`${r + 4};${r + 11};${r + 4}`} dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.7;0.05;0.7" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={color}
                  fillOpacity={markerOpacity(m)}
                  stroke="#04070d"
                  strokeWidth="1.4"
                  filter="url(#marker-glow)"
                />
                <circle cx={x} cy={y} r={Math.max(1.2, r * 0.3)} fill="#04070d" fillOpacity="0.75" />
                {(showLabels && labelMarkers.has(m.object.code)) || isHovered ? (
                  <g pointerEvents="none">
                    <text
                      x={x + r + 7}
                      y={y + 3.5}
                      fill="#dbe7f5"
                      fontSize={variant === "hero" ? 10 : 9.5}
                      fontFamily="Inter Variable, sans-serif"
                      fontWeight={600}
                      stroke="#04070d"
                      strokeWidth="3"
                      paintOrder="stroke"
                      opacity={0.95}
                    >
                      {locale === "en" ? m.object.nameEn : MAP_SHORT[m.object.code] ?? m.object.name}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}
        </g>

        {/* cursor hint for arbitrary point */}
        {onPoint && (
          <g pointerEvents="none" opacity="0.55">
            <text x={W - 30} y={H - 22} textAnchor="end" fill="#7d8da6" fontSize="9" fontFamily="JetBrains Mono Variable, monospace">
              {L(locale, "клик по карте → ближайшая точка сетки", "click the map → nearest grid point")}
            </text>
          </g>
        )}

        {/* compass */}
        <g transform={`translate(${W - 52}, 48)`} opacity="0.7">
          <circle r="17" fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="0.8" />
          <path d="M 0 -11 L 3 2 L 0 -1 L -3 2 Z" fill="#6cf7de" opacity="0.9" />
          <text y="13" textAnchor="middle" fill="#7d8da6" fontSize="7" fontFamily="JetBrains Mono Variable, monospace">
            N
          </text>
        </g>

        {/* scale bar */}
        {variant !== "hero" && (
          <g transform={`translate(34, ${H - 28})`} opacity="0.55">
            <line x1="0" y1="0" x2="52" y2="0" stroke="#7d8da6" strokeWidth="1" />
            <line x1="0" y1="-3" x2="0" y2="3" stroke="#7d8da6" strokeWidth="1" />
            <line x1="52" y1="-3" x2="52" y2="3" stroke="#7d8da6" strokeWidth="1" />
            <text x="26" y="12" textAnchor="middle" fill="#7d8da6" fontSize="7" fontFamily="JetBrains Mono Variable, monospace">
              ~100 км
            </text>
          </g>
        )}
      </svg>

      {/* hover tooltip */}
      {hoveredMarker && hoveredPoint && (
        <div
          className="pointer-events-none absolute z-20 w-56 -translate-x-1/2 -translate-y-full rounded-xl border border-white/10 bg-[#080e18]/95 p-3 shadow-panel backdrop-blur-xl"
          style={{
            left: `${(hoveredPoint[0] / W) * 100}%`,
            top: `${(hoveredPoint[1] / H) * 100}%`,
            marginTop: -12,
          }}
        >
          <div className="text-[11px] font-semibold text-slate-100">{pickName(locale, hoveredMarker.object)}</div>
          <div className="mt-0.5 text-[10px] text-slate-400">{L(locale, hoveredMarker.variable.name, hoveredMarker.variable.nameEn)}</div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="mono text-[11px]" style={{ color: markerColor(hoveredMarker) }}>
              {hoveredMarker.trend.senSlope > 0 ? "+" : "−"}
              {Math.abs(hoveredMarker.trend.senSlope * (hoveredMarker.variable.unit === "м" ? 100 : 1)).toFixed(2)}{" "}
              {slopeUnit(hoveredMarker.variable)}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-500">
              {hoveredMarker.trend.confidence === "confident" ? L(locale, "уверенный", "confident") : hoveredMarker.trend.confidence === "weak" ? L(locale, "слабый", "weak") : L(locale, "не выявлен", "not found")}
            </span>
          </div>
          <div className="mt-1 font-mono text-[9px] text-slate-600">
            p = {formatP(hoveredMarker.trend.p)}
            {hoveredMarker.trend.q !== null ? ` · q = ${formatP(hoveredMarker.trend.q)}` : ""}
          </div>
        </div>
      )}

      {variant === "full" && (
        <div className="pointer-events-none absolute bottom-3 right-3 flex flex-col items-end gap-1.5 rounded-xl border border-white/[0.07] bg-[#04070d]/70 px-3 py-2 backdrop-blur-md">
          <div className="flex items-center gap-3 text-[9px] text-slate-400">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-aurora-400" /> {L(locale, "рост", "rise")}</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-ember-400" /> {L(locale, "снижение", "fall")}</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-solar-400" /> {L(locale, "слабый", "weak")}</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" /> {L(locale, "нет", "none")}</span>
          </div>
          <div className="text-[8px] uppercase tracking-[0.18em] text-slate-600">{L(locale, "цвет: p/q · размер = сила · WGS84", "colour: p/q · size = strength · WGS84")}</div>
        </div>
      )}
    </div>
  );
}
