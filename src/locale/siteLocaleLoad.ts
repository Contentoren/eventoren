import type { SiteLocale } from "./SiteLocale.ts"
import { siteLocaleDefault } from "./siteLocaleDefault.ts"
import { siteLocaleFindById } from "./siteLocaleFindById.ts"
import { siteLocaleStorageKey } from "./siteLocaleStorageKey.ts"

export function siteLocaleLoad(): SiteLocale {
  if (typeof localStorage === "undefined") return siteLocaleDefault

  let raw: string | null = null
  try {
    raw = localStorage.getItem(siteLocaleStorageKey)
  } catch {
    return siteLocaleDefault
  }
  if (raw === null) return siteLocaleDefault

  const found = siteLocaleFindById(raw)
  if (!found.success) return siteLocaleDefault

  return found.data
}
