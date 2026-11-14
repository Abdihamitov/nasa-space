import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  hover = false,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  as?: React.ElementType;
}) {
  return <Tag className={cn("panel", hover && "panel-hover", className)}>{children}</Tag>;
}

export function PanelHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="mt-0.5 text-aurora-300">{icon}</div>}
        <div className="min-w-0">
          <div className="truncate font-display text-sm font-semibold text-slate-100">{title}</div>
          {subtitle && <div className="mt-0.5 text-[11px] text-slate-400">{subtitle}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}
