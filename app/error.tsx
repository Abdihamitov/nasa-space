"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="section flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl border border-ember-400/20 bg-ember-400/10 text-ember-400">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div className="label mb-2">сбой сигнала</div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-50">Что-то пошло не так</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
        Мы не смогли загрузить этот экран. Данные не потеряны — попробуйте ещё раз или вернитесь на карту.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          <RotateCcw className="h-4 w-4" /> Попробовать снова
        </button>
        <Link href="/" className="btn-secondary">
          На главную
        </Link>
      </div>
      {error.digest && <div className="mt-4 font-mono text-[10px] text-slate-600">digest: {error.digest}</div>}
    </div>
  );
}
