import { adminEventReleaseDateTimeToIso } from "./adminEventReleaseDateTimeToIso.ts"

export function adminDateTimeIsoFromLocal(value: string): string | null {
  const result = adminEventReleaseDateTimeToIso(value)
  return result.success ? result.data : null
}
