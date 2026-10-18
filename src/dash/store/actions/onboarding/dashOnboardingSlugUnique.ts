import { dashSlugCreate } from "../../../model/dashSlugCreate.ts"

/** Ermittelt einen freien Organisations-Slug (hängt bei Bedarf „-2“, „-3“ … an). */
export function dashOnboardingSlugUnique(base: string, taken: readonly string[]): string {
  const normalized = dashSlugCreate(base) || "veranstalter"
  if (!taken.includes(normalized)) return normalized
  let suffix = 2
  let candidate = `${normalized}-${suffix}`
  while (taken.includes(candidate)) {
    suffix += 1
    candidate = `${normalized}-${suffix}`
  }
  return candidate
}
