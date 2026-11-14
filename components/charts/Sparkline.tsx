"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { AnnualPoint } from "@/lib/types";

export function Sparkline({
  points,
  color = "#2ee6c8",
  width = 132,
  height = 38,
  className,
  showEnd = true,
}: {
  points: AnnualPoint[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
  showEnd?: boolean;
}) {
  const { d, area, last } = useMemo(() => {
    if (points.length < 2) return { d: "", area: "", last: null };
    const xs = points.map((p) => p.year);
    const ys = points.map((p) => p.value);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pad = 3;
    const sx = (x: number) => pad + ((x - minX) / Math.max(1, maxX - minX)) * (width - pad * 2);
    const sy = (y: number) =>
      height - pad - ((y - minY) / Math.max(1e-9, maxY - minY)) * (height - pad * 2);
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.year).toFixed(1)},${sy(p.value).toFixed(1)}`).join(" ");
    const areaPath = `${path} L${sx(maxX).toFixed(1)},${height - pad} L${sx(minX).toFixed(1)},${height - pad} Z`;
    const lastPoint = points[points.length - 1];
    return {
      d: path,
      area: areaPath,
      last: { x: sx(lastPoint.year), y: sy(lastPoint.value) },
    };
  }, [points, width, height]);

  if (!d) {
    return <div className={cn("h-8 w-full rounded bg-white/[0.03]", className)} />;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("h-auto w-full overflow-visible", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${color.replace("#", "")})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      {showEnd && last && <circle cx={last.x} cy={last.y} r="2.4" fill={color} stroke="#070d17" strokeWidth="1" />}
    </svg>
  );
}
