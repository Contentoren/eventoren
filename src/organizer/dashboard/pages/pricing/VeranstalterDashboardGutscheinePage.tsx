import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { VeranstalterDashboardPageFrame } from "../../ui/VeranstalterDashboardPageFrame.tsx"
import { veranstalterDashboardPreiseMoneyFormat } from "./veranstalterDashboardPreiseMoneyFormat.ts"
import { veranstalterDashboardPreiseTimeFormat } from "./veranstalterDashboardPreiseTimeFormat.ts"
import { veranstalterDashboardGutscheinePageStateCreate } from "./veranstalterDashboardGutscheinePageStateCreate.ts"
import type { VeranstalterDashboardGutscheineSearch } from "./veranstalterDashboardGutscheineSearchParse.ts"

export function VeranstalterDashboardGutscheinePage(p: {
  search: () => VeranstalterDashboardGutscheineSearch
  changeSearch: (search: VeranstalterDashboardGutscheineSearch) => void
}) {
  const state = veranstalterDashboardGutscheinePageStateCreate(p)
  return (
    <VeranstalterDashboardPageFrame state={state.page.shell}>
      <div class="flex flex-col gap-5">
        <header>
          <h1 class="text-xl font-semibold">Gutscheine</h1>
          <p class="text-sm text-content-muted">
            Organisationsgutscheine mit Laufzeit und Guthaben. Gilt nur für eigene Events. Alle Beträge in Euro.
          </p>
        </header>
        <Show when={state.message()}>
          <p class="text-sm" aria-live="polite">
            {state.message()}
          </p>
        </Show>
        <Show when={state.canEdit()} fallback={<p>Keine Berechtigung: Gutscheine brauchen gutscheine.bearbeiten.</p>}>
          <Show when={state.totals()} fallback={<p>Kennzahlen werden geladen …</p>}>
            {(totals) => (
              <section aria-label="Kennzahlen" class="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                  <p class="text-sm text-content-muted">Ausgegeben</p>
                  <p class="text-lg font-semibold">{veranstalterDashboardPreiseMoneyFormat(totals().issued)}</p>
                </div>
                <div>
                  <p class="text-sm text-content-muted">Offenes Guthaben</p>
                  <p class="text-lg font-semibold">{veranstalterDashboardPreiseMoneyFormat(totals().open)}</p>
                </div>
                <div>
                  <p class="text-sm text-content-muted">Eingelöst</p>
                  <p class="text-lg font-semibold">{totals().redeemed}</p>
                </div>
                <div>
                  <p class="text-sm text-content-muted">Gutscheine</p>
                  <p class="text-lg font-semibold">{totals().count}</p>
                </div>
              </section>
            )}
          </Show>
          <Show
            when={(() => {
              const data = state.vouchers()
              return data && "success" in data && data.success ? data.data : undefined
            })()}
            fallback={<p>Gutscheine werden geladen …</p>}
          >
            {(result) => (
              <section class="flex flex-col gap-2">
                <h2 class="font-semibold">Übersicht</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Wert</th>
                      <th>Rest</th>
                      <th>Ablauf</th>
                      <th>Status</th>
                      <th>Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={result().page}>
                      {(row) => (
                        <tr>
                          <td>{row.code}</td>
                          <td>{veranstalterDashboardPreiseMoneyFormat(row.initialCents)}</td>
                          <td>{veranstalterDashboardPreiseMoneyFormat(row.balanceCents)}</td>
                          <td>{row.expiresAt ? veranstalterDashboardPreiseTimeFormat(row.expiresAt) : "unbegrenzt"}</td>
                          <td>
                            {row.status}
                            {row.expired ? " (abgelaufen)" : ""}
                          </td>
                          <td>
                            <Show when={row.status === "aktiv"}>
                              <Button
                                type="button"
                                onClick={() => void state.deactivate(row.voucherId)}
                                disabled={state.busy()}
                              >
                                Deaktivieren
                              </Button>
                            </Show>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </section>
            )}
          </Show>
          <section class="flex flex-col gap-2">
            <h2 class="font-semibold">Gutschein ausstellen</h2>
            <form onSubmit={state.issue} class="flex flex-col gap-2">
              <Input
                aria-label="Code (optional, leer = zufällig)"
                placeholder="Code, z. B. DANK-2026"
                value={state.issueCode.get()}
                onInput={(e) => state.issueCode.set(e.currentTarget.value)}
                disabled={state.busy()}
              />
              <Input
                aria-label="Wert in Euro"
                placeholder="Wert in Euro, z. B. 25,00"
                value={state.issueAmount.get()}
                onInput={(e) => state.issueAmount.set(e.currentTarget.value)}
                disabled={state.busy()}
              />
              <label class="text-sm font-medium" for="gutscheine-validity">
                Laufzeit
              </label>
              <SelectSingleNative
                id="gutscheine-validity"
                valueSignal={state.issueValidity}
                getOptions={() => ["1-jahr", "2-jahre", "3-jahre-jahresende", "unbegrenzt", "datum"]}
              />
              <Show when={state.issueValidity.get() === "datum"}>
                <Input
                  aria-label="Eigenes Datum (JJJJ-MM-TT)"
                  placeholder="JJJJ-MM-TT, z. B. 2027-06-30"
                  value={state.issueDate.get()}
                  onInput={(e) => state.issueDate.set(e.currentTarget.value)}
                  disabled={state.busy()}
                />
              </Show>
              <Input
                aria-label="Empfängername (optional)"
                placeholder="Name"
                value={state.issueName.get()}
                onInput={(e) => state.issueName.set(e.currentTarget.value)}
                disabled={state.busy()}
              />
              <Input
                aria-label="Empfänger-E-Mail (optional)"
                placeholder="E-Mail"
                value={state.issueEmail.get()}
                onInput={(e) => state.issueEmail.set(e.currentTarget.value)}
                disabled={state.busy()}
              />
              <Button type="submit" disabled={state.busy()}>
                Ausstellen
              </Button>
            </form>
          </section>
          <section class="flex flex-col gap-2">
            <h2 class="font-semibold">Einlösen</h2>
            <form onSubmit={state.redeem} class="flex flex-col gap-2">
              <Input
                aria-label="Gutscheincode"
                placeholder="Code"
                value={state.redeemCode.get()}
                onInput={(e) => state.redeemCode.set(e.currentTarget.value)}
                disabled={state.busy()}
              />
              <Input
                aria-label="Betrag in Euro"
                placeholder="Betrag in Euro, z. B. 12,50"
                value={state.redeemAmount.get()}
                onInput={(e) => state.redeemAmount.set(e.currentTarget.value)}
                disabled={state.busy()}
              />
              <Input
                aria-label="Bestellreferenz"
                placeholder="Bestellung, z. B. EV-0001"
                value={state.redeemOrder.get()}
                onInput={(e) => state.redeemOrder.set(e.currentTarget.value)}
                disabled={state.busy()}
              />
              <Button type="submit" disabled={state.busy()}>
                Einlösen
              </Button>
            </form>
          </section>
        </Show>
      </div>
    </VeranstalterDashboardPageFrame>
  )
}
