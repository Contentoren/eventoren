import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { SiteLocale } from "./SiteLocale.ts"
import { siteLocaleStorageKey } from "./siteLocaleStorageKey.ts"

const op = "siteLocaleSave"

export function siteLocaleSave(locale: SiteLocale): Result<null> {
  if (typeof localStorage === "undefined") return createResult(null)

  try {
    localStorage.setItem(siteLocaleStorageKey, locale.id)
  } catch (error) {
    return createResultError(op, "Spracheinstellung konnte nicht gespeichert werden.", error)
  }
  return createResult(null)
}
