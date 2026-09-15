import { createMemo } from "solid-js"
import { language, languageDefault } from "./language.ts"
import { languageSignal } from "./languageSignal.ts"

export function languageSelectorStateCreate() {
  const selectedLanguage = createMemo(() => {
    if (typeof window === "undefined") return languageDefault
    return languageSignal.get() === language.de ? language.de : language.en
  })

  const text = createMemo(() =>
    selectedLanguage() === language.de
      ? { de: "Deutsch", en: "English", label: "Sprache" }
      : { de: "German", en: "English", label: "Language" },
  )

  const languageChange = (value: string) => {
    if (value === language.de || value === language.en) languageSignal.set(value)
  }

  return { language: selectedLanguage, languageChange, text }
}
