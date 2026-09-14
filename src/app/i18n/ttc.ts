import { isEn } from "#src/app/i18n/language.ts"
import { languageSignal } from "#src/app/i18n/languageSignal.ts"

// import ruTranslations from "./ru.json.js" with { type: "json" }
// import tjTranslations from "./tj.json.js" with { type: "json" }
const ruTranslations = {}
const tjTranslations = {}

const translations: Record<string, Record<string, string>> = {
  ru: ruTranslations,
  tj: tjTranslations,
}

/**
 * Client side translation function for app ui code.
 * Function calls will be statically analyzed and extracted into responsing ru.json, tj.json files
 * @param text in plain english
 * @returns string
 */
export function ttc(text: string): string {
  const l = languageSignal.get()
  if (isEn(l)) {
    return text
  }
  const langTranslations = translations[l]
  return langTranslations?.[text] || text
}

export function ttc1(text: string, x: string | number): string {
  const l = languageSignal.get()
  if (isEn(l)) {
    return (
      text
        //
        .replace("[X]", x.toString())
    )
  }
  const langTranslations = translations[l]
  const translated = langTranslations?.[text] || text
  return (
    translated
      //
      .replace("[X]", x.toString())
  )
}

export function ttc2(text: string, x1: string | number, x2: string | number): string {
  const l = languageSignal.get()
  if (isEn(l)) {
    return (
      text
        //
        .replace("[X1]", x1.toString())
        .replace("[X2]", x2.toString())
    )
  }
  const langTranslations = translations[l]
  const translated = langTranslations?.[text] || text
  return (
    translated
      //
      .replace("[X1]", x1.toString())
      .replace("[X2]", x2.toString())
  )
}

export function ttc3(text: string, x1: string | number, x2: string | number, x3: string | number): string {
  const l = languageSignal.get()
  if (isEn(l)) {
    return text //
      .replace("[X1]", x1.toString())
      .replace("[X2]", x2.toString())
      .replace("[X3]", x3.toString())
  }
  const langTranslations = translations[l]
  const translated = langTranslations?.[text] || text
  return (
    translated
      //
      .replace("[X1]", x1.toString())
      .replace("[X2]", x2.toString())
      .replace("[X3]", x3.toString())
  )
}
