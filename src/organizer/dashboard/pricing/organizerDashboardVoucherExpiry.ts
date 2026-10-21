import { adminEventReleaseDateTimeFromIso } from "#src/admin/adminEventReleaseDateTimeFromIso.ts"
import { adminEventReleaseDateTimeToIso } from "#src/admin/adminEventReleaseDateTimeToIso.ts"
import type { OrganizerDashboardVoucherValidity } from "./organizerDashboardVoucherSchema.ts"

function organizerDashboardVoucherEndOfDayIso(dateOnly: string): string | null {
  const raw = adminEventReleaseDateTimeToIso(`${dateOnly}T23:59`)
  if (!raw.success) return null
  return raw.data
}

function organizerDashboardVoucherDateOnlyOfIso(createdAt: string): string | null {
  if (!createdAt || Number.isNaN(Date.parse(createdAt))) return null
  const berlin = adminEventReleaseDateTimeFromIso(new Date(createdAt).toISOString())
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(berlin)) return null
  return berlin.slice(0, 10)
}

function organizerDashboardVoucherAddCalendarYears(
  month: string,
  day: string,
  year: number,
  years: number,
): string | null {
  const monthNumber = Number(month)
  const dayNumber = Number(day)
  if (!Number.isInteger(monthNumber) || !Number.isInteger(dayNumber)) return null
  const targetYear = year + years
  const lastDay = new Date(Date.UTC(targetYear, monthNumber, 0)).getUTCDate()
  const clampedDay = Math.min(dayNumber, lastDay)
  return `${String(targetYear).padStart(4, "0")}-${month}-${String(clampedDay).padStart(2, "0")}`
}

/**
 * Computes the voucher expiry instant (stored UTC, end of day in
 * Europe/Berlin) from the validity choice. `unbegrenzt` yields null.
 */
export function organizerDashboardVoucherExpiry(
  createdAt: string,
  validity: OrganizerDashboardVoucherValidity,
  customDate: string | null,
): string | null {
  if (validity === "unbegrenzt") return null
  if (validity === "datum") {
    if (!customDate || !/^\d{4}-\d{2}-\d{2}$/u.test(customDate)) return null
    const time = Date.parse(`${customDate}T00:00:00Z`)
    if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== customDate) return null
    return organizerDashboardVoucherEndOfDayIso(customDate)
  }
  const createdDate = organizerDashboardVoucherDateOnlyOfIso(createdAt)
  if (!createdDate) return null
  if (validity === "3-jahre-jahresende") {
    return organizerDashboardVoucherEndOfDayIso(`${Number(createdDate.slice(0, 4)) + 3}-12-31`)
  }
  const years = validity === "1-jahr" ? 1 : 2
  const shifted = organizerDashboardVoucherAddCalendarYears(
    createdDate.slice(5, 7),
    createdDate.slice(8, 10),
    Number(createdDate.slice(0, 4)),
    years,
  )
  if (!shifted) return null
  return organizerDashboardVoucherEndOfDayIso(shifted)
}
