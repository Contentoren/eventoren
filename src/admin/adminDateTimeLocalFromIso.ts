import { adminEventReleaseDateTimeFromIso } from "./adminEventReleaseDateTimeFromIso.ts"

export function adminDateTimeLocalFromIso(value: string): string {
  return adminEventReleaseDateTimeFromIso(value)
}
