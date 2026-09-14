import { type Language, language } from "#src/app/i18n/language.ts"

export function languageFromBrowser(): Language | undefined {
  const op = "languageFromBrowser"
  if (typeof window === "undefined") return undefined
  const browserLanguages = navigator.languages || [navigator.language]
  if (!browserLanguages || browserLanguages.length <= 0) return undefined
  for (const lang of browserLanguages) {
    const isEn = lang.startsWith("en")
    if (isEn) {
      return language.en
    }
    const isRu = lang.startsWith("ru")
    if (isRu) {
      return language.ru
    }
    const isTj = lang.startsWith("tj")
    if (isTj) {
      return language.tj
    }
  }
  return undefined
}
