import { For } from "solid-js"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { organizerPricingSummaryStateCreate } from "./organizerPricingSummaryStateCreate.ts"

export function OrganizerPricingSummary(p: { readonly payer?: "kaeufer" | "veranstalter" }) {
  const state = organizerPricingSummaryStateCreate({ payer: () => p.payer ?? "kaeufer" })
  return (
    <CardWrapper class="rounded-card border-border-subtle shadow-none">
      <section class="flex flex-col gap-3 p-4 sm:p-6" aria-label="Preis- und Leistungsübersicht">
        <h2 class="text-lg font-semibold">Ein Tarif. Keine Grundgebühr.</h2>
        <p class="text-xl font-semibold">
          {state.rate} + {state.fixed} je verkauftem Ticket
        </p>
        <p class="text-sm text-content-muted">
          Inklusive gesetzlicher Umsatzsteuer und regulärer Zahlungsabwicklung. Berechnung auf den Brutto-Ticketpreis,
          auf Cent gerundet, pro Ticket – nicht pro Bestellung. Kostenlose Tickets: 0 €. Keine Einrichtungsgebühr, kein
          Monatsbeitrag, kein Mindestumsatz.
        </p>
        <p class="text-sm">
          Enthalten: Veranstaltungs- und Ticketverwaltung, Online-Verkauf, digitale Tickets, Einlasskontrolle und
          Abrechnungsübersicht. Sonderleistungen nur nach gesonderter Vereinbarung.
        </p>
        <div class="grid gap-3 sm:grid-cols-3">
          <For each={state.examples()}>
            {(example) => (
              <dl class="rounded-control bg-surface-muted p-3 text-sm">
                <dt class="font-semibold">Ticketpreis {example.price}</dt>
                <dd>Eventoren-Gebühr: {example.fee}</dd>
                <dd>Käufer zahlt: {example.buyer}</dd>
                <dd>Veranstalteranteil: {example.organizer}</dd>
              </dl>
            )}
          </For>
        </div>
        <p class="text-xs text-content-muted">
          Beispiele mit Kostenübernahme durch {p.payer === "veranstalter" ? "den Veranstalter" : "die Käufer"}.
          Veranstalteranteil vor eigenen Steuern, Erstattungen und begründeten Rücklagen. Die Umsatzsteuer auf deine
          Veranstaltung ist von der Umsatzsteuer auf unsere Gebühr zu unterscheiden.
        </p>
      </section>
    </CardWrapper>
  )
}
