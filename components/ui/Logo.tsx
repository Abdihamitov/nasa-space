import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative flex h-8 w-8 items-center justify-center">
        <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden="true">
          <defs>
            <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6cf7de" />
              <stop offset="55%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="7.5" fill="none" stroke="url(#logo-grad)" strokeWidth="1.6" />
          <circle cx="20" cy="20" r="3.2" fill="#2ee6c8" />
          <ellipse cx="20" cy="20" rx="16" ry="6.5" fill="none" stroke="url(#logo-grad)" strokeWidth="1.2" opacity="0.7" transform="rotate(-24 20 20)" />
          <ellipse cx="20" cy="20" rx="16" ry="6.5" fill="none" stroke="url(#logo-grad)" strokeWidth="1.2" opacity="0.35" transform="rotate(38 20 20)" />
          <circle cx="33.5" cy="12.5" r="1.7" fill="#fbbf24" />
        </svg>
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[15px] font-semibold tracking-[0.18em] text-slate-50">K2</span>
          <span className="mt-1 font-mono text-[8px] uppercase tracking-[0.26em] text-slate-500">earth system detective</span>
        </span>
      )}
    </span>
  );
}
