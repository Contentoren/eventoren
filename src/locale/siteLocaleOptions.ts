import type { SiteLocale } from "./SiteLocale.ts"

export const siteLocaleOptions: readonly SiteLocale[] = [
  {
    id: "de-DE",
    countryLabel: "Deutschland",
    languageLabel: "Deutsch",
    currencyCode: "EUR",
    currencyLabel: "Euro",
    flag: "🇩🇪",
  },
  {
    id: "de-AT",
    countryLabel: "Österreich",
    languageLabel: "Deutsch",
    currencyCode: "EUR",
    currencyLabel: "Euro",
    flag: "🇦🇹",
  },
  {
    id: "de-CH",
    countryLabel: "Schweiz",
    languageLabel: "Deutsch",
    currencyCode: "CHF",
    currencyLabel: "Schweizer Franken",
    flag: "🇨🇭",
  },
  {
    id: "en-GB",
    countryLabel: "United Kingdom",
    languageLabel: "English",
    currencyCode: "GBP",
    currencyLabel: "Pound Sterling",
    flag: "🇬🇧",
  },
  {
    id: "fr-FR",
    countryLabel: "France",
    languageLabel: "Français",
    currencyCode: "EUR",
    currencyLabel: "Euro",
    flag: "🇫🇷",
  },
]
