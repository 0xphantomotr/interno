export const FALLBACK_LOCALES = ['sq', 'en'] as const;
export type SupportedLocale = (typeof FALLBACK_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'sq';

export const normalizeLocale = (input?: string | null): SupportedLocale => {
  if (!input) return DEFAULT_LOCALE;
  const normalized = input.toLowerCase();
  if (FALLBACK_LOCALES.includes(normalized as SupportedLocale)) {
    return normalized as SupportedLocale;
  }
  const base = normalized.split('-')[0] as SupportedLocale;
  if (FALLBACK_LOCALES.includes(base)) {
    return base;
  }
  return DEFAULT_LOCALE;
};

export const localizedFieldProjection = (fieldPath: string, localeVariable = '$locale') => {
  const fallbackChain = FALLBACK_LOCALES.map(
    (locale) => `${fieldPath}['${locale}']`,
  ).join(', ');
  return `coalesce(${fieldPath}[${localeVariable}], ${fallbackChain})`;
};
