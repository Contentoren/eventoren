import { For, Show } from "solid-js"
import { mdiCashMultiple } from "@adaptive-ds/mdi/mdiCashMultiple.js"
import { mdiDownload } from "@adaptive-ds/mdi/mdiDownload.js"
import { mdiSeat } from "@adaptive-ds/mdi/mdiSeat.js"
import { mdiTicket } from "@adaptive-ds/mdi/mdiTicket.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { veranstalterDashboardOverviewKpisStateCreate } from "../veranstalterDashboardOverviewKpisStateCreate.ts"
import {
  veranstalterDashboardOverviewCsvCreate,
  veranstalterDashboardOverviewDeltaFormat,
  veranstalterDashboardOverviewMoneyFormat,
} from "../veranstalterDashboardOverviewFormat.ts"

/** Live KPI section for the dashboard overview: revenue, tickets, occupancy and the Berlin sales curve. */
export function VeranstalterDashboardOverviewKpis(p: {
  state: ReturnType<typeof veranstalterDashboardOverviewKpisStateCreate>
}) {
  const downloadCsv = () => {
    const data = p.state.overview()
    if (!data || !("success" in data) || !data.success) return
    const csv = veranstalterDashboardOverviewCsvCreate(data.data)
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `kennzahlen-${data.data.fromDay}-${data.data.toDay}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Show
      when={(() => {
        const data = p.state.overview()
        return data && "success" in data && data.success ? data.data : undefined
      })()}
      fallback={<p class="text-sm text-content-muted">Kennzahlen werden geladen …</p>}
    >
      {(overview) => (
        <section aria-label="Kennzahlen" class="flex flex-col gap-4">
          <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <p class="flex items-center gap-1 text-xs text-content-muted">
                <Icon path={mdiCashMultiple} class="size-4" />
                Umsatz
              </p>
              <p class="mt-0.5 text-2xl font-semibold tabular-nums">
                {veranstalterDashboardOverviewMoneyFormat(overview().revenueCents)}
              </p>
              <p class="text-xs text-content-muted">
                {veranstalterDashboardOverviewDeltaFormat(overview().deltas.revenue)}
              </p>
            </div>
            <div>
              <p class="flex items-center gap-1 text-xs text-content-muted">
                <Icon path={mdiTicket} class="size-4" />
                Tickets
              </p>
              <p class="mt-0.5 text-2xl font-semibold tabular-nums">{overview().tickets}</p>
              <p class="text-xs text-content-muted">
                {veranstalterDashboardOverviewDeltaFormat(overview().deltas.tickets)}
              </p>
            </div>
            <div>
              <p class="flex items-center gap-1 text-xs text-content-muted">
                <Icon path={mdiSeat} class="size-4" />
                Auslastung
              </p>
              <p class="mt-0.5 text-2xl font-semibold tabular-nums">
                {new Intl.NumberFormat("de-DE", { style: "percent", maximumFractionDigits: 1 }).format(
                  overview().occupancyBps / 10000,
                )}
              </p>
              <p class="text-xs text-content-muted">kommende Events</p>
            </div>
            <div>
              <p class="flex items-center gap-1 text-xs text-content-muted">
                <Icon path={mdiCashMultiple} class="size-4" />Ø Bestellwert
              </p>
              <p class="mt-0.5 text-2xl font-semibold tabular-nums">
                {veranstalterDashboardOverviewMoneyFormat(overview().avgOrderCents)}
              </p>
              <p class="text-xs text-content-muted">
                {veranstalterDashboardOverviewDeltaFormat(overview().deltas.avgOrder)}
              </p>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <h2 class="font-semibold">Verkaufskurve (Berlin)</h2>
              <Button type="button" onClick={downloadCsv}>
                <Icon path={mdiDownload} class="size-4" />
                CSV exportieren
              </Button>
            </div>
            <ul class="flex flex-col gap-1">
              <For each={overview().series.slice(-14)}>
                {(point) => (
                  <li class="flex items-baseline justify-between gap-2 text-sm tabular-nums">
                    <span class="text-content-muted">{point.day}</span>
                    <span>
                      {veranstalterDashboardOverviewMoneyFormat(point.revenueCents)} · {point.tickets} Tickets ·{" "}
                      {point.orders} Bestellungen
                    </span>
                  </li>
                )}
              </For>
            </ul>
            <Show when={overview().truncated}>
              <p class="text-xs text-content-muted">Gekürzt: zu viele Datensätze für die vollständige Kurve.</p>
            </Show>
          </div>
        </section>
      )}
    </Show>
  )
}
