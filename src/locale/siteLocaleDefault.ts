import type { SiteLocale } from "./SiteLocale.ts"
import { siteLocaleOptions } from "./siteLocaleOptions.ts"

const fallback: SiteLocale = {
  id: "de-DE",
  countryLabel: "Deutschland",
  languageLabel: "Deutsch",
  currencyCode: "EUR",
  currencyLabel: "Euro",
  flag: "🇩🇪",
}

export const siteLocaleDefault: SiteLocale = siteLocaleOptions[0] ?? fallback
