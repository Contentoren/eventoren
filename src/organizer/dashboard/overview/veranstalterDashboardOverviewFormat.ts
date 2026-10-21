import { dashCsvCreate } from "#src/dash/export/dashCsvCreate.ts"
import type { OrganizerDashboardOverview } from "./convex/organizerDashboardOverviewQuery.ts"

type OverviewData = OrganizerDashboardOverview

const euroFormat = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })

export function veranstalterDashboardOverviewMoneyFormat(cents: number): string {
  return euroFormat.format(cents / 100)
}

export function veranstalterDashboardOverviewDeltaFormat(delta: number | null): string {
  if (delta === null) return "—"
  const percent = new Intl.NumberFormat("de-DE", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format(delta)
  return `${percent} zur Vorperiode`
}

/** Series CSV (semicolon, BOM) for the overview sales curve. */
export function veranstalterDashboardOverviewCsvCreate(data: OverviewData): string {
  return dashCsvCreate(
    ["Tag (Berlin)", "Umsatz (€)", "Tickets", "Bestellungen"],
    data.series.map((point) => [
      point.day,
      (point.revenueCents / 100).toFixed(2).replace(".", ","),
      point.tickets,
      point.orders,
    ]),
  )
}
