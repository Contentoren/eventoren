import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { VeranstalterDashboardPageFrame } from "../../ui/VeranstalterDashboardPageFrame.tsx"
import { organizerDashboardFinanceCsvCreate } from "../../finance/organizerDashboardFinanceCsvCreate.ts"
import {
  veranstalterDashboardFinanzenMoneyFormat,
  veranstalterDashboardFinanzenPageStateCreate,
  veranstalterDashboardFinanzenTimeFormat,
} from "./veranstalterDashboardFinanzenPageStateCreate.ts"
import type { VeranstalterDashboardFinanzenSearch } from "./veranstalterDashboardFinanzenSearchParse.ts"

export function VeranstalterDashboardFinanzenPage(p: {
  search: () => VeranstalterDashboardFinanzenSearch
  changeSearch: (search: VeranstalterDashboardFinanzenSearch) => void
}) {
  const state = veranstalterDashboardFinanzenPageStateCreate(p)
  const downloadCsv = () => {
    const data = state.overview()
    if (!data || !("success" in data) || !data.success) return
    const csv = organizerDashboardFinanceCsvCreate(
      data.data.events.map((event) => ({
        eventKey: event.eventKey,
        eventTitle: event.title,
        paidOrders: event.paidOrders,
        tickets: event.tickets,
        grossCents: event.grossCents,
        feeCents: event.feeCents,
        disputeCents: event.disputeCents,
        payoutCents: event.payoutCents,
      })),
    )
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `abrechnung-${data.data.fromDay}-${data.data.toDay}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <VeranstalterDashboardPageFrame state={state.page.shell}>
      <div class="flex flex-col gap-5">
        <header>
          <h1 class="text-xl font-semibold">Finanzen</h1>
          <p class="text-sm text-content-muted">
            Kennzahlen, Abrechnung je Veranstaltung und Auszahlungen. Alle Tage in Europe/Berlin, alle Beträge in Euro.
          </p>
        </header>
        <Show
          when={state.canRead()}
          fallback={<p>Keine Berechtigung: Finanzen sind nur für Inhaber, Admin und Finanzen sichtbar.</p>}
        >
          <Show
            when={(() => {
              const data = state.overview()
              return data && "success" in data && data.success ? data.data : undefined
            })()}
            fallback={<p>Finanzdaten werden geladen …</p>}
          >
            {(overview) => (
              <>
                <section aria-label="Kennzahlen" class="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div>
                    <p class="text-sm text-content-muted">Brutto</p>
                    <p class="text-lg font-semibold">
                      {veranstalterDashboardFinanzenMoneyFormat(overview().grossCents)}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-content-muted">Tickets</p>
                    <p class="text-lg font-semibold">{overview().tickets}</p>
                  </div>
                  <div>
                    <p class="text-sm text-content-muted">Eingecheckt</p>
                    <p class="text-lg font-semibold">{overview().checkedIn}</p>
                  </div>
                  <div>
                    <p class="text-sm text-content-muted">Offene Auszahlung</p>
                    <p class="text-lg font-semibold">
                      {veranstalterDashboardFinanzenMoneyFormat(
                        overview().events.reduce((sum, event) => sum + event.remainingPayoutCents, 0),
                      )}
                    </p>
                  </div>
                </section>
                <section class="flex flex-col gap-2">
                  <div class="flex items-center gap-2">
                    <h2 class="font-semibold">Abrechnung je Veranstaltung</h2>
                    <Button type="button" onClick={downloadCsv}>
                      CSV exportieren
                    </Button>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Veranstaltung</th>
                        <th>Bestellungen</th>
                        <th>Tickets</th>
                        <th>Brutto</th>
                        <th>Gebühren</th>
                        <th>Auszahlung</th>
                        <th>Offen</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={overview().events}>
                        {(event) => (
                          <tr>
                            <td>
                              <Button variant="ghost" onClick={() => state.selectEvent(event.eventKey)}>
                                {event.title}
                              </Button>
                            </td>
                            <td>{event.paidOrders}</td>
                            <td>
                              {event.tickets} / {event.capacity}
                            </td>
                            <td>{veranstalterDashboardFinanzenMoneyFormat(event.grossCents)}</td>
                            <td>{veranstalterDashboardFinanzenMoneyFormat(event.feeCents)}</td>
                            <td>{veranstalterDashboardFinanzenMoneyFormat(event.payoutCents)}</td>
                            <td>{veranstalterDashboardFinanzenMoneyFormat(event.remainingPayoutCents)}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </section>
                <Show when={overview().truncated}>
                  <p class="text-sm text-content-muted">
                    Sehr viele Datensätze: Die Zahlen sind auf die ersten Einträge begrenzt.
                  </p>
                </Show>
                <section class="flex flex-col gap-2">
                  <h2 class="font-semibold">Verkaufskurve (Berlin-Tage)</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Tag</th>
                        <th>Brutto</th>
                        <th>Tickets</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={overview().salesCurve}>
                        {(point) => (
                          <tr>
                            <td>{point.day}</td>
                            <td>{veranstalterDashboardFinanzenMoneyFormat(point.grossCents)}</td>
                            <td>{point.tickets}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </section>
              </>
            )}
          </Show>
          <section class="flex flex-col gap-2">
            <h2 class="font-semibold">Auszahlungen</h2>
            <Show
              when={(() => {
                const data = state.payouts()
                return data && "success" in data && data.success ? data.data : undefined
              })()}
              fallback={<p>Auszahlungen werden geladen …</p>}
            >
              {(result) => (
                <table>
                  <thead>
                    <tr>
                      <th>Veranstaltung</th>
                      <th>Betrag</th>
                      <th>Status</th>
                      <th>Vermerkt</th>
                      <th>Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={result().page}>
                      {(payout) => (
                        <tr>
                          <td>{payout.eventTitle ?? payout.eventKey}</td>
                          <td>{veranstalterDashboardFinanzenMoneyFormat(payout.amountCents)}</td>
                          <td>{payout.status}</td>
                          <td>{veranstalterDashboardFinanzenTimeFormat(payout.decidedAt)}</td>
                          <td>
                            <Show when={payout.status === "vorgemerkt"}>
                              <Button
                                type="button"
                                onClick={() => void state.markPayoutPaid(String(payout.payoutId))}
                                disabled={state.busy()}
                              >
                                Als ausgezahlt vermerken
                              </Button>
                            </Show>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              )}
            </Show>
            <Show
              when={state.selectedEvent()}
              fallback={<p class="text-sm">Veranstaltung wählen, um eine Auszahlung vorzumerken.</p>}
            >
              <form onSubmit={state.recordPayout} class="flex flex-col gap-2">
                <p class="text-sm">
                  Auszahlung für die gewählte Veranstaltung vormerken (Banküberweisung erfolgt außerhalb).
                </p>
                <Input
                  aria-label="Betrag in Euro"
                  placeholder="Betrag in Euro, z. B. 123,45"
                  value={state.amount()}
                  onInput={(e) => state.setAmount(e.currentTarget.value)}
                  disabled={state.busy()}
                />
                <Input
                  aria-label="Notiz"
                  placeholder="Notiz (optional)"
                  maxLength={500}
                  value={state.note()}
                  onInput={(e) => state.setNote(e.currentTarget.value)}
                  disabled={state.busy()}
                />
                <Button type="submit" disabled={state.busy()}>
                  Auszahlung vormerken
                </Button>
                <Show when={state.message()}>
                  <p class="text-sm">{state.message()}</p>
                </Show>
              </form>
            </Show>
          </section>
        </Show>
      </div>
    </VeranstalterDashboardPageFrame>
  )
}
