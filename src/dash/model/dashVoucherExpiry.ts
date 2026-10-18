import { adminEventReleaseDateTimeFromIso } from "../../admin/adminEventReleaseDateTimeFromIso.ts"
import { adminEventReleaseDateTimeToIso } from "../../admin/adminEventReleaseDateTimeToIso.ts"
import type { DashVoucherValidity } from "./dashVoucherValiditySchema.ts"

function dashVoucherEndOfDayIso(dateOnly: string): string | null {
  const raw = adminEventReleaseDateTimeToIso(`${dateOnly}T23:59`)
  if (!raw.success) return null
  return raw.data
}

function dashVoucherDateOnlyOfIso(createdAt: string): string | null {
  if (!createdAt || Number.isNaN(Date.parse(createdAt))) return null
  const berlin = adminEventReleaseDateTimeFromIso(new Date(createdAt).toISOString())
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(berlin)) return null
  return berlin.slice(0, 10)
}

function dashVoucherAddCalendarYears(month: string, day: string, year: number, years: number): string | null {
  const monthNumber = Number(month)
  const dayNumber = Number(day)
  if (!Number.isInteger(monthNumber) || !Number.isInteger(dayNumber)) return null
  const targetYear = year + years
  const lastDay = new Date(Date.UTC(targetYear, monthNumber, 0)).getUTCDate()
  const clampedDay = Math.min(dayNumber, lastDay)
  return `${String(targetYear).padStart(4, "0")}-${month}-${String(clampedDay).padStart(2, "0")}`
}

export function dashVoucherExpiry(
  createdAt: string,
  validity: DashVoucherValidity,
  customDate: string | null,
): string | null {
  if (validity === "unbegrenzt") return null
  if (validity === "datum") {
    if (!customDate || !/^\d{4}-\d{2}-\d{2}$/u.test(customDate)) return null
    const time = Date.parse(`${customDate}T00:00:00Z`)
    if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== customDate) return null
    return dashVoucherEndOfDayIso(customDate)
  }
  const createdDate = dashVoucherDateOnlyOfIso(createdAt)
  if (!createdDate) return null
  if (validity === "3-jahre-jahresende") return dashVoucherEndOfDayIso(`${Number(createdDate.slice(0, 4)) + 3}-12-31`)
  const years = validity === "1-jahr" ? 1 : 2
  const shifted = dashVoucherAddCalendarYears(
    createdDate.slice(5, 7),
    createdDate.slice(8, 10),
    Number(createdDate.slice(0, 4)),
    years,
  )
  if (!shifted) return null
  return dashVoucherEndOfDayIso(shifted)
}
