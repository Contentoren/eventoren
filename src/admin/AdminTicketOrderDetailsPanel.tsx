import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import type { AdminTicketOrderDetails } from "./AdminTicketOrderDetails.ts"
import { adminTicketOrderDetailsPanelStateCreate } from "./adminTicketOrderDetailsPanelStateCreate.ts"

export function AdminTicketOrderDetailsPanel(props: {
  readonly order: AdminTicketOrderDetails
  readonly close: () => void
  readonly dateFormat: (date: string) => string
  readonly priceFormat: (cents: number) => string
}) {
  const state = adminTicketOrderDetailsPanelStateCreate({ order: () => props.order })

  return (
    <CardWrapper class="flex flex-col gap-6" aria-label={`Bestelldetails ${props.order.id}`}>
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-content-muted">Bestelldetails</p>
          <h2 class="mt-1 text-xl font-semibold text-content">{props.order.eventTitle}</h2>
          <p class="text-sm text-content-muted">Bestellt am {props.dateFormat(props.order.createdAt)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={props.close}>
          Schließen
        </Button>
      </header>

      <section aria-labelledby="order-local-heading" class="flex flex-col gap-5 border-t border-border pt-5">
        <h3 id="order-local-heading" class="text-lg font-semibold text-content">
          Bestellungsinfo von unserer Webseite
        </h3>
        <div class="grid gap-6 md:grid-cols-2">
          <div class="flex min-w-0 flex-col gap-2 break-words text-sm">
            <h4 class="font-semibold text-content">Bestellung und Zahlung</h4>
            <p>Bestellstatus: {state.localStatusLabel(props.order.orderStatus)}</p>
            <p>Zahlungsstatus: {state.localStatusLabel(props.order.paymentStatus)}</p>
            <p>
              Zahlungsreferenz: <span class="break-all">{props.order.paymentReference}</span>
            </p>
            <p>
              Bestellreferenz: <span class="break-all">{props.order.billingOrderReference ?? "Nicht vorhanden"}</span>
            </p>
            <p>Zwischensumme: {props.priceFormat(props.order.subtotalCents)}</p>
            <p>Gebühren: {props.priceFormat(props.order.feeCents)}</p>
            <p class="font-semibold">Gesamt: {props.priceFormat(props.order.totalCents)}</p>
          </div>
          <div class="flex min-w-0 flex-col gap-2 break-words text-sm">
            <h4 class="font-semibold text-content">Kontakt</h4>
            <p>
              Name:{" "}
              {[props.order.customerGivenName, props.order.customerFamilyName].filter(Boolean).join(" ") ||
                "Nicht vorhanden"}
            </p>
            <p>E-Mail: {props.order.customerEmail || "Nicht vorhanden"}</p>
            <p>Telefon: {props.order.customerPhone || "Nicht vorhanden"}</p>
            <p>Adresse: {props.order.customerAddress || "Nicht vorhanden"}</p>
          </div>
          <div class="flex min-w-0 flex-col gap-2 break-words text-sm">
            <h4 class="font-semibold text-content">Veranstaltung</h4>
            <p>
              {props.order.eventTitle}
              {props.order.eventSubtitle ? ` · ${props.order.eventSubtitle}` : ""}
            </p>
            <p>
              {props.dateFormat(props.order.eventStartsAt)} – {props.dateFormat(props.order.eventEndsAt)} · Einlass{" "}
              {props.dateFormat(props.order.eventDoorsAt)}
            </p>
            <p>
              {props.order.venue}, {props.order.city} · {props.order.eventAddress}
            </p>
          </div>
          <div class="flex min-w-0 flex-col gap-2 break-words text-sm">
            <h4 class="font-semibold text-content">Positionen</h4>
            <For each={props.order.lines} fallback={<p class="text-content-muted">Keine Positionen vorhanden.</p>}>
              {(line) => (
                <p>
                  {line.quantity} × {line.tierName} — {props.priceFormat(line.priceCents + line.feeCents)} pro Ticket
                </p>
              )}
            </For>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="order-stripe-heading"
        class="flex min-w-0 flex-col gap-2 break-words border-t border-border pt-5 text-sm"
      >
        <h3 id="order-stripe-heading" class="mb-3 text-lg font-semibold text-content">
          Von Stripe empfangene Daten
        </h3>
        <Show
          when={state.stripe()}
          fallback={
            <p class="text-content-muted">
              {props.order.stripeError
                ? `Stripe-Details nicht verfügbar: ${props.order.stripeError}`
                : "Für diese Bestellung liegen keine Stripe-Details vor."}
            </p>
          }
        >
          <p>Stripe-Modus: {state.stripe()?.stripeMode === "live" ? "Live" : "Test"}</p>
          <p>Zahlungsart: {state.charge()?.paymentMethod?.type ?? "Nicht verfügbar"}</p>
          <p>Karte: {state.cardLabel()}</p>
          <p>
            Stripe-Betrag:{" "}
            {state.charge()
              ? state.amountFormat(state.charge()!.amountCents, state.charge()!.currency)
              : state.session()?.amountTotalCents !== null &&
                  state.session()?.amountTotalCents !== undefined &&
                  state.session()?.currency
                ? state.amountFormat(state.session()!.amountTotalCents!, state.session()!.currency!)
                : "Nicht verfügbar"}
          </p>
          <p>
            Stripe-Status: {state.stripeStatusLabel(state.charge()?.status ?? state.session()?.paymentStatus)}{" "}
            {state.session()?.status ? `· Sitzung ${state.session()?.status}` : ""}
          </p>
          <p>
            Stripe-Kontakt: {state.stripeContact()?.name || "Nicht verfügbar"} ·{" "}
            {state.stripeContact()?.email || "Nicht verfügbar"} · {state.stripeContact()?.phone || "Nicht verfügbar"}
          </p>
          <p>
            Stripe-Rechnungsname und Kontakt: {state.billingContact()?.name || "Nicht verfügbar"} ·{" "}
            {state.billingContact()?.email || "Nicht verfügbar"} · {state.billingContact()?.phone || "Nicht verfügbar"}
          </p>
          <p>
            Stripe-Rechnungsadresse:{" "}
            {state.address()
              ? [
                  state.address()?.line1,
                  state.address()?.line2,
                  state.address()?.city,
                  state.address()?.state,
                  state.address()?.postalCode,
                  state.address()?.country,
                ]
                  .filter(Boolean)
                  .join(", ")
              : "Nicht verfügbar"}
          </p>
          <Show when={state.charge()?.receiptUrl}>
            <p>
              <a
                class="text-link underline"
                href={state.charge()?.receiptUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
              >
                Stripe-Beleg öffnen
              </a>
            </p>
          </Show>
          <Show when={props.order.stripeError}>
            <p role="status" class="text-content-muted">
              Einige Zahlungsdetails konnten nicht geladen werden: {props.order.stripeError}
            </p>
          </Show>
        </Show>
      </section>
    </CardWrapper>
  )
}
