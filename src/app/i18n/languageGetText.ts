import type { Language, LanguageOrNone } from "#src/app/i18n/language.ts"
import { language, languageOrNone } from "#src/app/i18n/language.ts"
import { ttc } from "./ttc.js"

export function languageGetText(l: string) {
  switch (l as Language) {
    case language.en:
      return "English"
    case language.ru:
      return "Русский"
    case language.tj:
      return "Тоҷикӣ"
  }
}

export function languageOrNoneGetText(l: string) {
  switch (l as LanguageOrNone) {
    case languageOrNone.none:
      return ttc("None")
    default:
      return languageGetText(l)
  }
}
