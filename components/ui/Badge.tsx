import { cn } from "@/lib/utils";

type Tone = "aurora" | "solar" | "ember" | "ice" | "violet" | "slate" | "lime";

const tones: Record<Tone, string> = {
  aurora: "border-aurora-400/25 bg-aurora-400/10 text-aurora-200",
  solar: "border-solar-400/25 bg-solar-400/10 text-solar-300",
  ember: "border-ember-400/25 bg-ember-400/10 text-ember-400",
  ice: "border-ice-400/25 bg-ice-400/10 text-ice-300",
  violet: "border-violet-400/25 bg-violet-400/10 text-violet-300",
  slate: "border-white/10 bg-white/[0.04] text-slate-300",
  lime: "border-lime-400/25 bg-lime-400/10 text-lime-300",
};

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ tone = "aurora", className }: { tone?: Tone; className?: string }) {
  const colors: Record<Tone, string> = {
    aurora: "bg-aurora-400",
    solar: "bg-solar-400",
    ember: "bg-ember-400",
    ice: "bg-ice-400",
    violet: "bg-violet-400",
    slate: "bg-slate-400",
    lime: "bg-lime-400",
  };
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", colors[tone], className)} />;
}
