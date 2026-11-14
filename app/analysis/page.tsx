import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { ArrowLeft, Compass, DatabaseZap } from "lucide-react";
import { getCatalog, getObject, getVariable } from "@/lib/catalog";
import { analyzeByCode, clampPeriod } from "@/lib/trend";
import { buildChain } from "@/lib/chain";
import { AnalysisClient } from "@/components/analysis/AnalysisClient";
import { EmptyState } from "@/components/ui/EmptyState";

const load = cache((object: string, variable: string, from: number, to: number) => {
  const payload = analyzeByCode(object, variable, from, to);
  const chain = payload ? buildChain(object, variable, from, to) : null;
  return { payload, chain };
});

function first(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const object = getObject(first(sp.object) ?? "");
  const variable = getVariable(first(sp.variable) ?? "");
  if (!object || !variable) return { title: "Результат анализа" };
  const period = clampPeriod(first(sp.from), first(sp.to));
  const { payload } = load(object.code, variable.code, period.from, period.to);
  return {
    title: `${object.name} · ${variable.name}`,
    description: payload?.stats.summary ?? "Анализ климатического тренда в K2.",
  };
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const objectCode = first(sp.object);
  const variableCode = first(sp.variable);
  const object = objectCode ? getObject(objectCode) : null;
  const variable = variableCode ? getVariable(variableCode) : null;
  const period = clampPeriod(first(sp.from), first(sp.to));

  if (!object || !variable) {
    return (
      <div className="section py-16">
        <EmptyState
          icon="search"
          title="Запрос не собран"
          description="Выберите объект и параметр — или откройте готовый сценарий на карте явлений."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/explore" className="btn-primary">
                <Compass className="h-4 w-4" /> Собрать запрос
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

  const { payload, chain } = load(object.code, variable.code, period.from, period.to);
  if (!payload) {
    return (
      <div className="section py-16">
        <EmptyState
          icon="no-data"
          title="Для этой пары нет данных"
          description={`${object.name} × ${variable.name} отсутствует в кубе. Выберите другую переменную или объект.`}
          action={
            <Link href={`/explore?section=${variable.section}&object=${object.code}`} className="btn-primary">
              <DatabaseZap className="h-4 w-4" /> Выбрать другой параметр
            </Link>
          }
        />
      </div>
    );
  }

  const catalog = getCatalog();
  return (
    <AnalysisClient
      payload={payload}
      chain={chain}
      variables={catalog.variables}
      periodBounds={catalog.meta.period}
    />
  );
}
