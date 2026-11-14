"use client";

import { cn } from "@/lib/utils";

export function Tabs<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode }[];
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full font-medium transition",
            size === "sm" ? "px-3 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs",
            value === o.value
              ? "bg-aurora-400 text-ink-950 shadow-glow-sm"
              : "text-slate-400 hover:text-slate-200",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
