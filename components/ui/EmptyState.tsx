import { cn } from "@/lib/utils";
import { SearchX, WifiOff, DatabaseZap, AlertTriangle } from "lucide-react";

export function EmptyState({
  icon = "no-data",
  title,
  description,
  action,
  className,
}: {
  icon?: "no-data" | "offline" | "error" | "search";
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const Icon =
    icon === "offline" ? WifiOff : icon === "error" ? AlertTriangle : icon === "search" ? SearchX : DatabaseZap;
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center", className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-400">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-base font-semibold text-slate-200">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gradient-to-r from-white/[0.04] via-white/[0.08] to-white/[0.04] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}
