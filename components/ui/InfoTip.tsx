"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { L } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function InfoTip({
  label,
  children,
  className,
  side = "top",
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const resolvedLabel = label ?? L(locale, "Подробнее", "Details");

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const position =
    side === "bottom"
      ? "top-full mt-2 left-1/2 -translate-x-1/2"
      : side === "left"
        ? "right-full mr-2 top-1/2 -translate-y-1/2"
        : side === "right"
          ? "left-full ml-2 top-1/2 -translate-y-1/2"
          : "bottom-full mb-2 left-1/2 -translate-x-1/2";

  return (
    <span ref={ref} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label={resolvedLabel}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-slate-400 transition hover:border-aurora-400/40 hover:text-aurora-300"
      >
        <Info className="h-2.5 w-2.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className={cn(
            "absolute z-50 w-64 rounded-xl border border-white/10 bg-[#080e18]/95 p-3 text-left text-[11px] font-normal leading-relaxed text-slate-300 shadow-panel backdrop-blur-xl",
            position,
          )}
        >
          {children}
        </span>
      )}
    </span>
  );
}
