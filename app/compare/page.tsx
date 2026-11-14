import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, GitCompare } from "lucide-react";
import { getCatalog, getVariable } from "@/lib/catalog";
import { autoCompare, buildCompare, buildTrendTable } from "@/lib/compare";
import { clampPeriod } from "@/lib/trend";
import { CompareClient } from "@/components/compare/CompareClient";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Сравнение",
  description: "Сравнение регионов с противоположными трендами, FDR-поправка и таблица всех объектов.",
};

function first(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const catalog = getCatalog();
  const variable = getVariable(first(sp.variable) ?? "t2m") ?? getVariable("t2m");
  if (!variable) {
    return (
      <div className="section py-16">
        <EmptyState icon="no-data" title="Нет переменных для сравнения" description="Сначала загрузите данные ETL." />
      </div>
    );
  }
  const period = clampPeriod(first(sp.from), first(sp.to));
  const type = first(sp.type);
  const a = first(sp.a);
  const b = first(sp.b);
  const auto = first(sp.auto) === "1" || !a || !b;

  let compare = auto ? autoCompare(variable.code, period.from, period.to, type) : buildCompare(variable.code, a!, b!, period.from, period.to);
  if (!compare) compare = autoCompare(variable.code, period.from, period.to, type);
  const table = buildTrendTable(variable.code, period.from, period.to, type);

  if (!compare) {
    return (
      <div className="section py-16">
        <EmptyState
          icon="no-data"
          title="Не удалось подобрать пару"
          description="Для этой переменной и периода недостаточно объектов с данными. Попробуйте другую переменную или период."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/explore" className="btn-primary">
                <GitCompare className="h-4 w-4" /> Выбрать параметр
              </Link>
              <Link href="/" className="btn-secondary">
                <ArrowLeft className="h-4 w-4" /> На главную
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <CompareClient
      variable={variable}
      variables={catalog.variables.filter((v) => v.section !== "global")}
      compare={compare}
      table={table}
      periodBounds={catalog.meta.period}
      initialType={type}
      initialAuto={auto}
    />
  );
}
