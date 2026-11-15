import { NextResponse } from "next/server";

export type ApiErrorBody = { code: string; message: string };

/**
 * CDN caching for deterministic GET endpoints: the response depends only on
 * the query string and the static data bundled with the deployment (a new
 * deployment gets a fresh CDN cache).
 */
export const CDN_CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json<ApiErrorBody>(
    { code, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

/** apiOk + CDN caching; use only for responses that are a pure function of the URL. */
export function apiCached<T>(data: T) {
  return NextResponse.json(data, { headers: { "Cache-Control": CDN_CACHE } });
}

export function getParam(url: URL, name: string): string | null {
  const v = url.searchParams.get(name);
  return v && v.trim() ? v.trim() : null;
}

export function getNumberParam(url: URL, name: string): number | null {
  const v = getParam(url, name);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function requireParam(url: URL, name: string): string | null {
  return getParam(url, name);
}
