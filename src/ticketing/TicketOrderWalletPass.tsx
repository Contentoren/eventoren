import { For, Show } from "solid-js"
import { UiBadge } from "../ui/UiBadge.tsx"
import { UiCard } from "../ui/UiCard.tsx"
import { eventDateFormat } from "../events/eventDateFormat.ts"
import { eventTimeFormat } from "../events/eventTimeFormat.ts"
import { ticketPriceFormat } from "./ticketPriceFormat.ts"
import { TicketQrCode } from "./TicketQrCode.tsx"
import type { TicketOrderProjection } from "./TicketOrderProjection.ts"

export function TicketOrderWalletPass(props: { order: TicketOrderProjection }) {
  const order = () => props.order
  return (
    <UiCard class="overflow-hidden p-0">
      <header class="flex flex-col gap-space-2 bg-linear-to-br from-brand-strong to-brand px-space-6 py-space-6 text-brand-content">
        <p class="text-sm font-semibold uppercase tracking-widest text-white/90">Eventoren Wallet-Ticket</p>
        <h2 class="text-xl font-semibold leading-snug">{order().eventTitle}</h2>
        <p class="text-sm font-medium text-white/90">
          {eventDateFormat(order().eventStartsAt)} · {eventTimeFormat(order().eventStartsAt)}
        </p>
      </header>

      <div class="flex flex-col gap-space-6 p-space-6">
        <dl class="grid gap-space-4 sm:grid-cols-2">
          <div>
            <dt class="text-sm text-content-muted">Ort</dt>
            <dd class="text-sm font-medium text-content">
              {order().venue}, {order().city}
            </dd>
            <dd class="text-sm text-content-muted">{order().address}</dd>
          </div>
          <div>
            <dt class="text-sm text-content-muted">Ticketinhaber:in</dt>
            <dd class="text-sm font-medium text-content">
              {order().contact.givenName} {order().contact.familyName}
            </dd>
            <dd class="text-sm text-content-muted">{order().contact.email}</dd>
          </div>
          <div>
            <dt class="text-sm text-content-muted">Status</dt>
            <dd class="text-sm font-medium text-content">
              {order().paymentStatus === "paid"
                ? "Bezahlt"
                : order().paymentStatus === "pending"
                  ? "Zahlung wird bestätigt"
                  : "Zahlung fehlgeschlagen"}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-content-muted">Gesamt inkl. Gebühren</dt>
            <dd class="text-sm font-semibold text-content">{ticketPriceFormat(order().totalCents)}</dd>
          </div>
        </dl>

        <Show
          when={order().tickets.length > 0}
          fallback={
            <p class="rounded-control bg-surface-muted p-space-4 text-sm text-content-muted">
              Der digitale Pass wird nach bestätigter Zahlung angezeigt.
            </p>
          }
        >
          <div class="flex flex-col gap-space-4 border-t border-border-subtle pt-space-5">
            <h3 class="text-base font-semibold text-content">Deine Tickets</h3>
            <For each={order().tickets}>
              {(ticket) => (
                <div class="flex flex-col gap-space-4 rounded-card border border-border-subtle p-space-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p class="font-medium text-content">{ticket.tierName}</p>
                    <p class="text-sm text-content-muted">
                      Ticket {ticket.sequence} · {ticket.code}
                    </p>
                  </div>
                  <TicketQrCode value={ticket.code} label={`QR-Code für Ticket ${ticket.code}`} />
                </div>
              )}
            </For>
            <UiBadge tone="success">
              {order().tickets.length} {order().tickets.length === 1 ? "Ticket" : "Tickets"}
            </UiBadge>
          </div>
        </Show>
      </div>
    </UiCard>
  )
}
