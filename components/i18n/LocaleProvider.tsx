"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "@/lib/i18n";

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggle: () => void;
};

const LocaleCtx = createContext<LocaleState | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(normalizeLocale(initialLocale));

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      const normalized = normalizeLocale(next);
      setLocaleState(normalized);
      // The cookie only drives the first server render (layout -> initialLocale).
      // All localized UI reads the locale from this context, so no
      // router.refresh() is needed: the switch is instant on every page.
      document.cookie = `${LOCALE_COOKIE}=${normalized}; path=/; max-age=31536000; samesite=lax`;
    },
    [],
  );

  const value = useMemo<LocaleState>(
    () => ({
      locale,
      setLocale,
      toggle: () => setLocale(locale === "ru" ? "en" : "ru"),
    }),
    [locale, setLocale],
  );

  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}

export function useLocale(): LocaleState {
  const ctx = useContext(LocaleCtx);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}
