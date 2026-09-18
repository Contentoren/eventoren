import { createEffect, createMemo } from "solid-js"
import { languageDefault } from "./language.ts"
import { languageSignalRegisterHandler } from "./languageSignal.ts"

export function rootDocumentStateCreate() {
  const selectedLanguage = createMemo(() => languageDefault)
  languageSignalRegisterHandler()
  createEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.lang = selectedLanguage()
  })

  return { language: selectedLanguage }
}
