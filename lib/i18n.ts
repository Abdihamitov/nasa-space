export type Locale = "ru" | "en";

export const LOCALE_COOKIE = "k2_locale";

export function normalizeLocale(value?: string | null): Locale {
  return value === "en" ? "en" : "ru";
}

/** Tiny inline translation helper: L(locale, "русский", "English"). */
export function L(locale: Locale, ru: string, en: string): string {
  return locale === "en" ? en : ru;
}

export function pickName(
  locale: Locale,
  item: { name: string; nameEn?: string | null },
): string {
  return locale === "en" && item.nameEn ? item.nameEn : item.name;
}

export function pickDescription(
  locale: Locale,
  item: { description: string; descriptionEn?: string | null },
): string {
  return locale === "en" && item.descriptionEn ? item.descriptionEn : item.description;
}
