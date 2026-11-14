import Link from "next/link";
import { ArrowLeft, Compass, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="section flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] text-slate-400">
        <SearchX className="h-7 w-7" />
      </div>
      <div className="label mb-2">404 · координаты не найдены</div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
        Такой точки на карте нет
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
        Страница потерялась между слоями данных. Вернитесь на карту явлений или соберите новый запрос детектива.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          <ArrowLeft className="h-4 w-4" /> На карту
        </Link>
        <Link href="/explore" className="btn-secondary">
          <Compass className="h-4 w-4" /> Исследовать
        </Link>
      </div>
    </div>
  );
}
