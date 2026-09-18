import { language } from "#src/app/i18n/language.ts"

export function languageFromBrowser(): typeof language.de | undefined {
  if (typeof window === "undefined") return undefined
  return language.de
}
