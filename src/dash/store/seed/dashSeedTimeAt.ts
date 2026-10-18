import { adminEventReleaseDateTimeToIso } from "../../../admin/adminEventReleaseDateTimeToIso.ts"
import { adminEventReleaseDateTimeFromIso } from "../../../admin/adminEventReleaseDateTimeFromIso.ts"

/** Berlin wall-clock time for `now` shifted by `dayOffset` days, as UTC ISO. */
export function dashSeedTimeAt(now: Date, dayOffset: number, time: string): string {
  const berlinDate = adminEventReleaseDateTimeFromIso(now.toISOString()).slice(0, 10)
  const noon = Date.parse(`${berlinDate}T12:00:00Z`)
  const shifted = new Date(noon + dayOffset * 86_400_000).toISOString().slice(0, 10)
  const result = adminEventReleaseDateTimeToIso(`${shifted}T${time}`)
  if (!result.success) throw new Error(`dashSeedTimeAt: ungueltige Zeit ${shifted}T${time}`)
  return result.data
}
