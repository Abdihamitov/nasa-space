"use client";

import Link from "next/link";
import { ArrowUpRight, Radio, Sparkles } from "lucide-react";
import { KyrgyzstanMap } from "@/components/map/KyrgyzstanMap";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { formatNumber, formatP, slopePrecision, slopeUnit } from "@/lib/format";
import type { PhenomenonMapPayload } from "@/lib/types";

export function HeroMap({ map, geo }: { map: PhenomenonMapPayload; geo: { type: "FeatureCollection"; features: { type: "Feature"; properties: { name: string; nameEn: string; code: string }; geometry: unknown }[] } }) {
  const top = map.markers[0];
  const scale = top ? (top.variable.unit === "м" ? 100 : 1) : 1;
  const precision = top ? slopePrecision(top.trend.senSlope, top.variable) : 2;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-aurora-400/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.10] bg-[#060b13]/80 shadow-panel backdrop-blur-xl">
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-[#04070d]/70 px-3 py-1.5 backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-aurora-400" />
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400">live cube · 2000–2025</span>
        </div>

        <div className="absolute right-4 top-4 z-10 hidden items-center gap-1.5 rounded-full border border-white/10 bg-[#04070d]/70 px-3 py-1.5 backdrop-blur-md sm:flex">
          <Radio className="h-3 w-3 text-aurora-400" />
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-400">4 источника</span>
        </div>

        <KyrgyzstanMap geo={geo} markers={map.markers} variant="hero" showLabels className="rounded-none" />

        {top && (
          <div className="absolute bottom-4 left-4 z-10 w-[min(340px,calc(100%-2rem))] rounded-2xl border border-white/[0.12] bg-[#070c14]/90 p-4 shadow-panel backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                <Sparkles className="h-3 w-3 text-aurora-300" /> главный сигнал
              </span>
              <TrendBadge direction={top.trend.direction} confidence={top.trend.confidence} compact />
            </div>
            <div className="mt-2.5 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="truncate font-display text-sm font-semibold text-slate-100">{top.object.name}</div>
                  {top.object.isRegulated && (
                    <span className="shrink-0 rounded-full border border-solar-400/25 bg-solar-400/10 px-1.5 py-0.5 text-[7px] font-medium text-solar-300">
                      регулируемый
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="truncate">{top.variable.name}</span>
                  {top.variable.isProxy && (
                    <span className="shrink-0 rounded-full border border-ice-400/25 bg-ice-400/10 px-1.5 py-0.5 text-[7px] text-ice-300">
                      прокси
                    </span>
                  )}
                  {top.variable.isReconstruction && (
                    <span className="shrink-0 rounded-full border border-violet-400/25 bg-violet-400/10 px-1.5 py-0.5 text-[7px] text-violet-300">
                      реконструкция
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-display text-xl font-semibold tracking-tight text-aurora-300">
                  {top.trend.senSlope > 0 ? "+" : "−"}
                  {formatNumber(Math.abs(top.trend.senSlope) * scale, precision)}
                </div>
                <div className="text-[9px] text-slate-500">{slopeUnit(top.variable)}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.07] pt-2.5">
              <span className="font-mono text-[9px] text-slate-500">
                p = {formatP(top.trend.p)}
                {top.trend.q !== null ? ` · q = ${formatP(top.trend.q)}` : ""}
              </span>
              <Link href={top.href} className="inline-flex items-center gap-1 text-[10px] font-medium text-aurora-300 transition hover:text-aurora-200">
                открыть <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
