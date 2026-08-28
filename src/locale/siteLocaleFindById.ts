import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { SiteLocale } from "./SiteLocale.ts"
import { siteLocaleOptions } from "./siteLocaleOptions.ts"

const op = "siteLocaleFindById"

export function siteLocaleFindById(id: unknown): Result<SiteLocale> {
  if (typeof id !== "string" || id.length === 0) return createResultError(op, "Locale-Id fehlt.", id)

  const match = siteLocaleOptions.find((candidate) => candidate.id === id)
  if (!match) return createResultError(op, "Unbekannte Locale-Id.", id)

  return createResult(match)
}
