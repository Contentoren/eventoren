import { type LanguageOrNone, language, languageOrNone } from "#src/app/i18n/language.ts"

export function detectLanguage(mimeType: string, fileName: string): LanguageOrNone {
  if (mimeType.startsWith("image/")) {
    return languageOrNone.none
  }

  const tajikSpecific = /[ӣӯқғҳж]/i
  if (tajikSpecific.test(fileName)) return language.tj

  const cyrillic = /[а-яё]/i
  if (cyrillic.test(fileName)) return language.ru

  return language.en
}
