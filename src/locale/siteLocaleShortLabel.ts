import type { SiteLocale } from "./SiteLocale.ts"

export function siteLocaleShortLabel(locale: SiteLocale): string {
  const country = locale.id.split("-")[1] ?? locale.id

  return `${country.toUpperCase()} · ${locale.currencyCode}`
}
