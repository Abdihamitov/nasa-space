"use client";

import { useLocale } from "./LocaleProvider";
import { cn } from "@/lib/utils";

export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-white/[0.09] bg-white/[0.03] p-0.5",
        compact ? "text-[9px]" : "text-[10px]",
      )}
      role="group"
      aria-label="Язык / Language"
    >
      {(["ru", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={cn(
            "rounded-full px-2 py-1 font-mono uppercase tracking-wider transition",
            locale === code
              ? "bg-aurora-400 text-ink-950"
              : "text-slate-500 hover:text-slate-200",
          )}
          aria-pressed={locale === code}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
