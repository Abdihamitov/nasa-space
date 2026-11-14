"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Accordion({
  items,
  defaultOpen = 0,
  className,
}: {
  items: { title: React.ReactNode; content: React.ReactNode; icon?: React.ReactNode }[];
  defaultOpen?: number | null;
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  return (
    <div className={cn("divide-y divide-white/[0.07] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]", className)}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03]"
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
                {item.icon}
                {item.title}
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-500 transition", isOpen && "rotate-180 text-aurora-300")} />
            </button>
            {isOpen && <div className="px-5 pb-5 text-sm leading-relaxed text-slate-400">{item.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
