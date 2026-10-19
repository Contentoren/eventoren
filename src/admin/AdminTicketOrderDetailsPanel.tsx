import { For, Show } from "solid-js"
import { CopyButton } from "#ui/interactive/copy/CopyButton.jsx"
import type { AdminTicketOrderDetails } from "./AdminTicketOrderDetails.ts"
import { AdminOrderVoucherBadge } from "./AdminOrderVoucherBadge.tsx"
import { adminTicketOrderDetailsPanelStateCreate } from "./adminTicketOrderDetailsPanelStateCreate.ts"
import { adminTicketOrderPaymentMethodLabel } from "./adminTicketOrderPaymentMethodLabel.ts"

export function AdminTicketOrderDetailsPanel(props: {
  readonly order: AdminTicketOrderDetails
  readonly dateFormat: (date: string) => string
  readonly priceFormat: (cents: number) => string
}) {
  const state = adminTicketOrderDetailsPanelStateCreate({ order: () => props.order })

  return (
    <div class="flex flex-col gap-6" aria-label={`Bestelldetails ${props.order.id}`}>
      <div class="flex flex-wrap items-baseline justify-between gap-2 rounded-control border border-border-subtle bg-surface-muted px-4 py-3">
        <div class="text-xs text-content-muted">Bestellt {props.dateFormat(props.order.createdAt)}</div>
        <div class="text-2xl font-semibold tabular-nums">{props.priceFormat(props.order.totalCents)}</div>
      </div>

      <section aria-label="Käufer">
        <h2 class="text-sm font-semibold">Käufer</h2>
        <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span class="font-medium">
            {[props.order.customerGivenName, props.order.customerFamilyName].filter(Boolean).join(" ") ||
              "Nicht vorhanden"}
          </span>
          <span class="text-content-muted">{props.order.customerEmail || "Nicht vorhanden"}</span>
          <Show when={props.order.customerEmail}>
            <CopyButton value={props.order.customerEmail} size="sm" />
          </Show>
        </div>
        <dl class="mt-2 flex flex-col gap-1 text-sm">
          <div class="flex flex-wrap gap-x-2">
            <dt class="text-content-muted">Telefon:</dt>
            <dd>{props.order.customerPhone || "Nicht vorhanden"}</dd>
          </div>
          <div class="flex flex-wrap gap-x-2">
            <dt class="text-content-muted">Adresse:</dt>
            <dd class="break-words">{props.order.customerAddress || "Nicht vorhanden"}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Tickets">
        <h2 class="text-sm font-semibold">Tickets · {state.ticketTotal()}</h2>
        <ul class="mt-2 flex flex-col gap-2">
          <For
            each={props.order.lines}
            fallback={<p class="text-sm text-content-muted">Keine Positionen vorhanden.</p>}
          >
            {(line) => (
              <li class="rounded-control border border-border-subtle px-3 py-2 text-sm">
                <div class="flex flex-wrap items-baseline justify-between gap-2">
                  <span class="font-medium">
                    {line.quantity} × {line.tierName}
                  </span>
                  <span class="tabular-nums">{props.priceFormat(line.priceCents + line.feeCents)} pro Ticket</span>
                </div>
              </li>
            )}
          </For>
        </ul>
      </section>

      <section aria-label="Zahlung">
        <h2 class="text-sm font-semibold">Zahlung</h2>
        <dl class="mt-2 flex flex-col gap-1 text-sm">
          <For each={props.order.lines}>
            {(line) => (
              <div class="flex items-baseline justify-between gap-3">
                <dt class="min-w-0 text-content-muted">
                  {line.quantity} × {line.tierName}
                </dt>
                <dd class="shrink-0 tabular-nums">{props.priceFormat(line.priceCents * line.quantity)}</dd>
              </div>
            )}
          </For>
          <Show when={props.order.voucher}>
            {(voucher) => (
              <div class="flex items-center justify-between gap-3">
                <dt class="flex min-w-0 items-center gap-1 text-content-muted">
                  <span class="truncate">Gutschein ({voucher().code})</span>
                  <AdminOrderVoucherBadge voucher={voucher()} />
                </dt>
                <dd class="shrink-0 tabular-nums">−{props.priceFormat(voucher().amountCents)}</dd>
              </div>
            )}
          </Show>
          <Show when={props.order.feeCents > 0}>
            <div class="flex items-baseline justify-between gap-3">
              <dt class="min-w-0 text-content-muted">Gebühren</dt>
              <dd class="shrink-0 tabular-nums">{props.priceFormat(props.order.feeCents)}</dd>
            </div>
          </Show>
          <div class="flex items-baseline justify-between gap-3 border-t border-border-subtle pt-1 font-semibold">
            <dt>Summe</dt>
            <dd class="tabular-nums">{props.priceFormat(props.order.totalCents)}</dd>
          </div>
        </dl>
        <dl class="mt-2 flex flex-col gap-1 text-sm">
          <div class="flex flex-wrap gap-x-2">
            <dt class="text-content-muted">Zahlart:</dt>
            <dd>
              {state.charge()?.paymentMethod?.type ?? adminTicketOrderPaymentMethodLabel(props.order.paymentMethodType)}
            </dd>
          </div>
          <div class="flex flex-wrap gap-x-2">
            <dt class="text-content-muted">Rechnung:</dt>
            <dd class="break-all">{props.order.billingOrderReference ?? "Nicht vorhanden"}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Verlauf">
        <h2 class="text-sm font-semibold">Verlauf</h2>
        <ol class="mt-2 flex flex-col">
          <For each={state.timeline()}>
            {(entry, index) => (
              <li class="relative flex gap-3 pb-4 last:pb-0">
                <Show when={index() < state.timeline().length - 1}>
                  <span aria-hidden="true" class="absolute top-4 left-[5px] h-full w-px bg-border-subtle" />
                </Show>
                <span
                  aria-hidden="true"
                  class="mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-brand bg-surface"
                />
                <div class="min-w-0 text-sm">
                  <p class="font-medium">{entry.title}</p>
                  <Show when={entry.detail}>{(detail) => <p class="truncate text-content-muted">{detail()}</p>}</Show>
                  <p class="text-xs text-content-muted">{props.dateFormat(entry.at)}</p>
                </div>
              </li>
            )}
          </For>
        </ol>
      </section>

      <details class="rounded-control border border-border-subtle px-3 py-2 text-sm">
        <summary class="cursor-pointer font-semibold">Stripe-Details</summary>
        <div class="mt-2 flex min-w-0 flex-col gap-2 break-words text-sm">
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
              {state.billingContact()?.email || "Nicht verfügbar"} ·{" "}
              {state.billingContact()?.phone || "Nicht verfügbar"}
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
        </div>
      </details>
    </div>
  )
}
