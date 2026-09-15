import { createEffect, createMemo } from "solid-js"
import { languageSignal, languageSignalRegisterHandler } from "./languageSignal.ts"

export function rootDocumentStateCreate() {
  const selectedLanguage = createMemo(() => languageSignal.get())
  languageSignalRegisterHandler()
  createEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.lang = selectedLanguage()
  })

  return { language: selectedLanguage }
}
