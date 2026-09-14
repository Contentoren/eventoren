import { v } from "convex/values"
import * as a from "valibot"

export type Language = keyof typeof language

export const language = {
  en: "en",
  ru: "ru",
  tj: "tj",
} as const

export const languageDefault: Language = language.en

export function isEn(l: Language): boolean {
  return l === language.en
}

export const languageSchema = a.enum(language)

export const languageValidator = v.union(v.literal(language.en), v.literal(language.ru), v.literal(language.tj))

export function languageParseString<T>(s: string, fallback: T): Language | T {
  const parsed = a.safeParse(languageSchema, s)
  if (!parsed.success) return fallback
  return parsed.output
}

//
// languageOrNone
//

export type LanguageOrNone = keyof typeof languageOrNone

export const languageOrNone = {
  none: "none",
  ...language,
} as const

export const languageOrNoneSchema = a.enum(languageOrNone)

export const languageOrNoneValidator = v.union(
  v.literal(languageOrNone.none),
  v.literal(language.en),
  v.literal(language.ru),
  v.literal(language.tj),
)
