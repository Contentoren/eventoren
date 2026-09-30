import { useLocation } from "@tanstack/solid-router"
import { createEffect, createMemo } from "solid-js"
import { themeSet } from "#ui/interactive/theme/themeSignal.js"
import { getThemeFromStorageOrBrowserPref } from "#ui/interactive/theme/themeVariant.js"
import { themeApply } from "../../theme/themeApply.ts"
import { languageDefault } from "./language.ts"
import { languageSignalRegisterHandler } from "./languageSignal.ts"

export function rootDocumentStateCreate() {
  const selectedLanguage = createMemo(() => languageDefault)
  const location = useLocation()
  languageSignalRegisterHandler()
  createEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.lang = selectedLanguage()
  })
  createEffect(() => {
    const pathname = location().pathname
    if (
      pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      pathname === "/organizer" ||
      pathname.startsWith("/organizer/")
    ) {
      themeSet(getThemeFromStorageOrBrowserPref(), false)
      return
    }
    themeApply("light")
  })

  return { language: selectedLanguage }
}
