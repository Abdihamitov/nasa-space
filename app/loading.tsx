export default function Loading() {
  return (
    <div className="section py-12">
      <div className="h-4 w-32 animate-pulse rounded bg-white/[0.05]" />
      <div className="mt-6 h-12 w-2/3 animate-pulse rounded-xl bg-white/[0.05]" />
      <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-white/[0.04]" />
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="h-[420px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
        <div className="h-[420px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
      </div>
    </div>
  );
}
