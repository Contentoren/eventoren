import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"
import { CheckBoolean } from "#ui/input/check/CheckBoolean.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { VeranstalterDashboardPageFrame } from "../../ui/VeranstalterDashboardPageFrame.tsx"
import { veranstalterDashboardAbendkassePageStateCreate } from "./veranstalterDashboardAbendkassePageStateCreate.ts"
import { veranstalterDashboardOrdersMoneyFormat } from "../orders/veranstalterDashboardOrdersMoneyFormat.ts"
import type { VeranstalterDashboardAbendkasseSearch } from "./veranstalterDashboardAbendkasseSearchParse.ts"

const statusLabels: Record<string, string> = {
  wartet: "Wartend",
  bezahlt: "Bezahlt",
  abgebrochen: "Abgebrochen",
}

export function VeranstalterDashboardAbendkassePage(p: {
  search: () => VeranstalterDashboardAbendkasseSearch
  changeSearch: (search: VeranstalterDashboardAbendkasseSearch) => void
  eventKey: () => string
}) {
  const state = veranstalterDashboardAbendkassePageStateCreate(p)
  return (
    <VeranstalterDashboardPageFrame state={state.shell}>
      <section class="flex flex-col gap-4">
        <h1 class="text-2xl font-semibold">Abendkasse</h1>
        <Show when={state.canUse()} fallback={<p role="alert">Keine Berechtigung für diesen Bereich.</p>}>
          <Show when={state.salesError()}>
            <p role="alert">{state.salesError()}</p>
          </Show>
          <h2 class="text-lg font-semibold">Offene und abgeschlossene Vorgänge</h2>
          <ul class="flex flex-col gap-2">
            <For each={state.rows()} fallback={<li class="text-sm text-content-muted">Keine Kassenvorgänge.</li>}>
              {(sale) => (
                <li class="flex flex-wrap items-center gap-2 rounded-card border border-border-subtle bg-surface p-4 text-sm">
                  <span class="font-medium">{sale.tierName}</span>
                  <span class="text-content-muted tabular-nums">
                    · {sale.quantity}× {veranstalterDashboardOrdersMoneyFormat(sale.unitPriceCents)} ={" "}
                    {veranstalterDashboardOrdersMoneyFormat(sale.totalCents)}
                  </span>
                  <span>{statusLabels[sale.status] ?? sale.status}</span>
                  <Show when={sale.testHarness}>
                    <span class="text-content-muted">(TEST-Harness)</span>
                  </Show>
                  <Show when={sale.status === "wartet"}>
                    <Link to="/abendkasse/$saleId" params={{ saleId: sale.saleId }} class="underline">
                      Gast-Seite öffnen
                    </Link>
                  </Show>
                  <Show when={state.canPrice() && sale.status === "wartet"}>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={state.busy()}
                      onClick={() => void state.cancelSale(sale.saleId)}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={state.busy()}
                      onClick={() => void state.completeSale(sale.saleId)}
                    >
                      Mit bezahlter Bestellung abschließen
                    </Button>
                  </Show>
                </li>
              )}
            </For>
          </ul>
          <Show when={state.canPrice()}>
            <h2 class="text-lg font-semibold">Neuer Kassenvorgang</h2>
            <p class="text-sm text-content-muted">
              Preis und Kontingent legst du hier fest. Echter Abschluss nur mit bereits bezahlter Bestellung.
            </p>
            <form onSubmit={state.createSale} class="flex flex-wrap items-end gap-2">
              <label class="flex flex-col gap-1 text-sm">
                Ticketart-Schlüssel
                <Input
                  value={state.tierKey.get()}
                  onInput={(event) => state.tierKey.set(event.currentTarget.value)}
                  maxLength={200}
                  required
                />
              </label>
              <label class="flex flex-col gap-1 text-sm">
                Anzahl
                <Input
                  value={state.quantity.get()}
                  onInput={(event) => state.quantity.set(event.currentTarget.value)}
                  inputMode="numeric"
                  required
                />
              </label>
              <label class="flex flex-col gap-1 text-sm">
                Preis € (leer = Tarifpreis)
                <Input
                  value={state.unitPrice.get()}
                  onInput={(event) => state.unitPrice.set(event.currentTarget.value)}
                  inputMode="decimal"
                  placeholder="28,00"
                />
              </label>
              <CheckBoolean
                valueSignal={state.testSale}
                valueText={(value) => (value ? "TEST-Harness: an" : "TEST-Harness: aus")}
              />
              <Button type="submit" variant="filled" disabled={state.busy()}>
                Vorgang anlegen
              </Button>
            </form>
            <label class="flex flex-col gap-1 text-sm">
              Bezahlte Bestell-ID für echten Abschluss
              <Input
                value={state.completeOrderId.get()}
                onInput={(event) => state.completeOrderId.set(event.currentTarget.value)}
                autocomplete="off"
                placeholder="Bestell-ID aus dem Checkout"
              />
            </label>
            <Show when={state.message()}>
              <p aria-live="polite" class="text-sm">
                {state.message()}
              </p>
            </Show>
          </Show>
        </Show>
      </section>
    </VeranstalterDashboardPageFrame>
  )
}
