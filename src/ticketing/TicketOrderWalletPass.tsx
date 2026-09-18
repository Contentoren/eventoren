import { For, Show } from "solid-js"
import { Details } from "#ui/interactive/details/Details.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import type { TicketOrderProjection } from "./TicketOrderProjection.ts"
import { TicketQrCode } from "./TicketQrCode.tsx"
import { ticketOrderWalletPassStateCreate } from "./ticketOrderWalletPassStateCreate.ts"

export function TicketOrderWalletPass(props: { order: TicketOrderProjection }) {
  const state = ticketOrderWalletPassStateCreate({ order: () => props.order })

  return (
    <CardWrapper class="overflow-hidden border-border-strong bg-surface p-0 text-content">
      <header class="flex items-start justify-between gap-space-4 border-b border-border-subtle px-space-5 py-space-4 sm:px-space-6">
        <div>
          <p class="text-sm font-semibold uppercase tracking-widest text-brand-accent">Kaufübersicht</p>
          <h2 class="mt-space-1 text-xl font-semibold leading-snug text-content">{state.order().eventTitle}</h2>
        </div>
        <Badge variant={state.statusVariant()} class="shrink-0">
          {state.statusLabel()}
        </Badge>
      </header>

      <div class="flex flex-col gap-space-5 p-space-5 sm:p-space-6">
        <dl class="grid grid-cols-2 gap-x-space-4 gap-y-space-4">
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-content-muted">Datum</dt>
            <dd class="mt-space-1 text-sm font-medium text-content">{state.dateTime()}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-content-muted">Ort</dt>
            <dd class="mt-space-1 text-sm font-medium text-content">
              {state.order().venue}, {state.order().city}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-content-muted">Bestellnummer</dt>
            <dd class="mt-space-1 break-all font-mono text-xs font-medium text-content">{state.orderReference()}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-content-muted">Betrag</dt>
            <dd class="mt-space-1 text-sm font-semibold text-content">{state.total()}</dd>
          </div>
        </dl>

        <Show
          when={state.order().tickets.length > 0}
          fallback={
            <p class="rounded-control bg-surface-muted p-space-4 text-sm leading-relaxed text-content-muted">
              {state.ticketsUnavailableMessage()}
            </p>
          }
        >
          <div class="flex flex-col gap-space-3 border-t border-border-subtle pt-space-5">
            <div class="flex items-center justify-between gap-space-3">
              <h3 class="text-base font-semibold text-content">Deine Tickets</h3>
              <Badge variant="subtle">{state.ticketCountLabel()}</Badge>
            </div>
            <p class="text-sm text-content-muted">Öffne ein Ticket, um den QR-Code für den Einlass anzuzeigen.</p>
            <For each={state.order().tickets}>
              {(ticket) => (
                <Details
                  class="border-border-subtle bg-surface shadow-none dark:bg-surface"
                  summaryClass="flex-row items-center p-space-4"
                  title={state.ticketTitle(ticket)}
                  subtitle={state.participantName(ticket)}
                >
                  <div class="flex flex-col items-center gap-space-3 border-t border-border-subtle bg-surface-muted p-space-5">
                    <TicketQrCode value={ticket.code} label={state.ticketQrLabel(ticket)} />
                    <p class="max-w-sm text-center text-xs leading-relaxed text-content-muted">
                      Zeige diesen Code am Einlass vor. Gib ihn nicht an andere Personen weiter.
                    </p>
                  </div>
                </Details>
              )}
            </For>
          </div>
        </Show>
      </div>
    </CardWrapper>
  )
}
