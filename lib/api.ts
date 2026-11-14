import { NextResponse } from "next/server";

export type ApiErrorBody = { code: string; message: string };

export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json<ApiErrorBody>({ code, message }, { status });
}

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
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
