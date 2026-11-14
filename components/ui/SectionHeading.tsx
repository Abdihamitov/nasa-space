import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "sm:flex-col sm:items-center sm:text-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && (
          <div className="mb-3 flex items-center gap-2.5">
            <span className="h-px w-8 bg-aurora-400/60" />
            <span className="label text-aurora-300/90">{eyebrow}</span>
          </div>
        )}
        <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-slate-50 text-balance sm:text-4xl">
          {title}
        </h2>
        {description && <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Stat({
  value,
  label,
  hint,
  icon,
  className,
}: {
  value: React.ReactNode;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("group", className)}>
      <div className="flex items-baseline gap-2">
        <div className="font-display text-3xl font-semibold tracking-tight text-slate-50">{value}</div>
        {icon && <span className="text-aurora-400/80">{icon}</span>}
      </div>
      <div className="mt-1 text-xs font-medium text-slate-300">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}
