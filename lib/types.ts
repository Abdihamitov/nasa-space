// Shared types for K2. Safe to import from client components.

export type SectionCode = "water" | "snow" | "climate" | "vegetation" | "global";

export type Source = {
  name: string;
  url: string;
  license: string;
  citation: string;
};

export type Variable = {
  code: string;
  section: SectionCode;
  name: string;
  nameEn: string;
  shortName: string;
  unit: string;
  displayUnit: string;
  displayScale: number;
  yearlyAgg: "mean" | "sum" | "max";
  seasonMonths: number[] | null;
  nativeStep: "month" | "year";
  directionNote: string;
  description: string;
  descriptionEn?: string;
  whyItMatters: string;
  whyItMattersEn?: string;
  source: Source;
  dataset: string;
  precision: number;
  isProxy: boolean;
  proxyNote?: string;
  isReconstruction: boolean;
  reconstructionNote?: string;
  color: string;
};

export type Section = {
  code: SectionCode;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn?: string;
  accent: string;
  icon: string;
  order: number;
};

export type CatalogObject = {
  code: string;
  type: "lake" | "reservoir" | "river" | "glacier" | "region" | "city" | "global" | "grid";
  name: string;
  nameEn: string;
  lat: number;
  lon: number;
  region: string;
  elevation: number | null;
  areaKm2: number | null;
  description: string;
  descriptionEn?: string;
  tags: string[];
  variables: string[];
  isGrid?: boolean;
  isGlobal?: boolean;
  isRegulated?: boolean;
  regulatedNote?: string;
  isProxy?: boolean;
  highlight?: boolean;
};

export type SeriesPoint = [date: string, value: number, quality: string];

export type Series = {
  object: string;
  variable: string;
  points: SeriesPoint[];
  source: Source;
  dataset: string;
  nativeStep: "month" | "year";
  isProxy?: boolean;
  isReconstruction?: boolean;
};

export type SeriesIndexEntry = {
  id: string;
  object: string;
  variable: string;
  source: string;
  dataset: string;
  nativeStep: "month" | "year";
  dateFrom: string;
  dateTo: string;
  coverage: number;
  n: number;
  unit: string;
  yearlyAgg: string;
  seasonMonths: number[] | null;
  isProxy: boolean;
  isReconstruction: boolean;
};

export type ChainLinkDef = {
  variable: string;
  expected: "+" | "-";
  order: number;
  explanation: string;
  explanationEn?: string;
};

export type ChainDef = {
  id: string;
  section: SectionCode;
  targetVariable: string;
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  links: ChainLinkDef[];
};

export type PhenomenonLink = {
  object: string;
  variable: string;
  weight: number;
  note: string | null;
};

export type Phenomenon = {
  code: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn?: string;
  globalVariable: string | null;
  globalLabel: string | null;
  globalLabelEn?: string | null;
  localVariables: string[];
  accent: string;
  icon: string;
  caveat: string;
  caveatEn?: string;
  links: PhenomenonLink[];
};

export type CatalogMeta = {
  name: string;
  tagline: string;
  period: { from: number; to: number };
  generatedAt: string;
  objectCount: number;
  gridCount: number;
  variableCount: number;
  seriesCount: number;
  sources: { name: string; what: string; url: string }[];
};

export type Catalog = {
  meta: CatalogMeta;
  sections: Section[];
  variables: Variable[];
  objects: CatalogObject[];
  seriesIndex: SeriesIndexEntry[];
  phenomena: Phenomenon[];
  chains: ChainDef[];
};

export type AnnualPoint = {
  year: number;
  value: number;
  nMonths: number;
  quality: string;
};

export type TrendDirection = "rising" | "falling" | "flat";
export type Confidence = "confident" | "weak" | "none" | "insufficient";

export type SlopeInterval = { lower: number; upper: number } | null;

export type TrendStats = {
  direction: TrendDirection;
  confidence: Confidence;
  p: number;
  q: number | null;
  tau: number;
  s: number;
  z: number;
  senSlope: number;
  slopeCi: SlopeInterval;
  intercept: number;
  nYears: number;
  nMonths: number;
  missingShare: number;
  coverage: number;
  method: string;
  seasonalP: number | null;
  seasonalMethod: string | null;
  autocorrelation: number;
  hamedRaoApplied: boolean;
  changeOverPeriod: number;
  yearsToSignificance: {
    year: number | null;
    probability: number | null;
    note: string;
    noteEn: string;
  } | null;
  summary: string;
  summaryEn: string;
  detail: string;
  detailEn: string;
  caveat: string;
  caveatEn: string;
};

export type TrendPayload = {
  object: CatalogObject;
  variable: Variable;
  period: { from: number; to: number };
  annual: AnnualPoint[];
  monthly: { date: string; value: number; quality: string }[];
  stats: TrendStats;
  source: Source;
  dataset: string;
  seriesMeta: SeriesIndexEntry | null;
  qContext: { variable: string; tests: number; q: number | null };
};

export type ChainLinkResult = {
  variable: Variable;
  annual: AnnualPoint[];
  trend: TrendStats | null;
  expected: "+" | "-";
  status: "confirmed" | "contradicted" | "weak" | "none" | "insufficient";
  statusLabel: string;
  statusLabelEn: string;
  correlation: { rho: number; p: number; n: number } | null;
  explanation: string;
  explanationEn: string;
  href: string;
};

export type ChainResult = {
  chain: ChainDef;
  object: CatalogObject;
  links: ChainLinkResult[];
  summary: string;
  summaryEn: string;
  caveat: string;
  caveatEn: string;
};

/** The subset of TrendStats that map markers display (keeps the payload small). */
export type MarkerTrend = Pick<TrendStats, "direction" | "confidence" | "senSlope" | "p" | "q">;

export type MapMarker = {
  object: CatalogObject;
  variable: Variable;
  trend: MarkerTrend;
  strength: number;
  q: number | null;
  href: string;
};

export type PhenomenonMapPayload = {
  phenomenon: Phenomenon;
  period: { from: number; to: number };
  markers: MapMarker[];
  global: { variable: Variable; annual: AnnualPoint[]; trend: TrendStats | null } | null;
  caveat: string;
};

export type AssistantAction =
  | { type: "navigate"; href: string; label: string }
  | { type: "set_period"; from: number; to: number; label: string }
  | { type: "open_compare"; variable: string; from: number; to: number; label: string };

export type AssistantAnalysis = {
  object: string;
  variable: string;
  from: number;
  to: number;
  summary: string;
  summaryEn: string;
  p: number | null;
  q: number | null;
  senSlope: number;
  slopeUnit: string;
  confidenceLabel: string;
  directionLabel: string;
};

export type AssistantContext = {
  path: string;
  objectCode?: string;
  variableCode?: string;
  from?: number;
  to?: number;
  trendSummary?: string;
  compareA?: string;
  compareB?: string;
  analysis?: AssistantAnalysis;
  recent?: { object: string; variable: string; from: number; to: number; at: string }[];
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  actions?: AssistantAction[];
};
