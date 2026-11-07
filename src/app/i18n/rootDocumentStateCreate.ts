import { useLocation } from "@tanstack/solid-router"
import { createEffect, createMemo } from "solid-js"
import { themeSet } from "#ui/interactive/theme/themeSignal.js"
import { getThemeFromStorageOrBrowserPref } from "#ui/interactive/theme/themeVariant.js"
import { themeApply } from "../../theme/themeApply.ts"
import { rootDocumentLanguageFromPath } from "./rootDocumentLanguageFromPath.ts"

export function rootDocumentStateCreate() {
  const location = useLocation()
  // Derived from the pathname, so SSR/prerendered `<html lang>` is already correct before hydration.
  const selectedLanguage = createMemo(() => rootDocumentLanguageFromPath(location().pathname))
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
