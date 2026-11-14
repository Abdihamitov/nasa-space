import catalogJson from "@/data/catalog.json";
import seriesJson from "@/data/series.json";
import type {
  Catalog,
  CatalogObject,
  ChainDef,
  Phenomenon,
  Section,
  Series,
  SeriesIndexEntry,
  Variable,
} from "./types";

const catalog = catalogJson as unknown as Catalog;
const series = seriesJson as unknown as Record<string, Series>;

const objectMap = new Map(catalog.objects.map((o) => [o.code, o]));
const variableMap = new Map(catalog.variables.map((v) => [v.code, v]));
const sectionMap = new Map(catalog.sections.map((s) => [s.code, s]));
const phenomenonMap = new Map(catalog.phenomena.map((p) => [p.code, p]));
const indexMap = new Map(catalog.seriesIndex.map((s) => [s.id, s]));

export function getCatalog(): Catalog {
  return catalog;
}

export function getMeta() {
  return catalog.meta;
}

export function getObjects(): CatalogObject[] {
  return catalog.objects;
}

export function getObjectsForMap(): CatalogObject[] {
  return catalog.objects.filter((o) => !o.isGlobal);
}

export function getSections(): Section[] {
  return [...catalog.sections].sort((a, b) => a.order - b.order);
}

export function getSection(code: string): Section | null {
  return sectionMap.get(code as Section["code"]) ?? null;
}

export function getVariables(): Variable[] {
  return catalog.variables;
}

export function getVariable(code: string): Variable | null {
  return variableMap.get(code) ?? null;
}

export function getObject(code: string): CatalogObject | null {
  return objectMap.get(code) ?? null;
}

export function getSeries(object: string, variable: string): Series | null {
  return series[`${object}|${variable}`] ?? null;
}

export function getSeriesIndex(object: string, variable: string): SeriesIndexEntry | null {
  return indexMap.get(`${object}|${variable}`) ?? null;
}

export function getPhenomena(): Phenomenon[] {
  return catalog.phenomena;
}

export function getPhenomenon(code: string): Phenomenon | null {
  return phenomenonMap.get(code) ?? null;
}

export function getChains(): ChainDef[] {
  return catalog.chains;
}

export function getChainForVariable(variable: string): ChainDef | null {
  return catalog.chains.find((c) => c.targetVariable === variable) ?? null;
}

export function getAvailableVariables(object: CatalogObject): Variable[] {
  return object.variables.map((code) => variableMap.get(code)).filter((v): v is Variable => Boolean(v));
}

export function getObjectsWithVariable(variable: string): CatalogObject[] {
  return catalog.objects.filter((o) => o.variables.includes(variable) && !o.isGlobal && !o.isGrid);
}

export function getObjectsForSection(section: string): CatalogObject[] {
  return catalog.objects.filter(
    (o) =>
      !o.isGlobal &&
      !o.isGrid &&
      o.variables.some((v) => variableMap.get(v)?.section === section),
  );
}

export function getDefaultObjectForVariable(variable: string): CatalogObject | null {
  const candidates = getObjectsWithVariable(variable);
  return candidates.find((o) => o.highlight) ?? candidates[0] ?? null;
}

export function getGridObjects(): CatalogObject[] {
  return catalog.objects.filter((o) => o.isGrid);
}

export function getGlobalObject(): CatalogObject {
  return catalog.objects.find((o) => o.isGlobal) ?? catalog.objects[0];
}

export function getPeriodBounds(): { from: number; to: number } {
  return catalog.meta.period;
}

export function getSourceList() {
  return catalog.meta.sources;
}

export function getSeriesKeysForObject(object: string): string[] {
  return Object.keys(series).filter((k) => k.startsWith(`${object}|`));
}
