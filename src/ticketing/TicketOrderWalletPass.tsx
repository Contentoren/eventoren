import { For, Show } from "solid-js"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { UiBadge } from "../ui/UiBadge.tsx"
import { UiButton } from "../ui/UiButton.tsx"
import { TicketAppleWalletButton } from "./TicketAppleWalletButton.tsx"
import { TicketGoogleWalletButton } from "./TicketGoogleWalletButton.tsx"
import type { TicketOrderProjection } from "./TicketOrderProjection.ts"
import { TicketQrCode } from "./TicketQrCode.tsx"
import { TicketWalletDialog } from "./TicketWalletDialog.tsx"
import { ticketOrderWalletPassStateCreate } from "./ticketOrderWalletPassStateCreate.ts"

export function TicketOrderWalletPass(props: { order: TicketOrderProjection }) {
  const state = ticketOrderWalletPassStateCreate({ order: () => props.order })

  return (
    <CardWrapper class="overflow-hidden rounded-card border-border-subtle bg-surface p-0 text-content shadow-none">
      <header class="flex items-start justify-between gap-space-4 border-b border-border-subtle px-space-5 py-space-4 sm:px-space-6">
        <div class="min-w-0">
          <p class="text-sm font-semibold uppercase tracking-widest text-brand-accent">Kaufübersicht</p>
          <h2 class="mt-space-1 text-xl font-semibold leading-snug text-content">{state.order().eventTitle}</h2>
        </div>
        <UiBadge tone={state.statusTone()} class="shrink-0">
          {state.statusLabel()}
        </UiBadge>
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
          <Show when={state.orderReferenceDisplay()}>
            {(orderReference) => (
              <div>
                <dt class="text-xs font-medium uppercase tracking-wide text-content-muted">{orderReference().label}</dt>
                <dd class="mt-space-1 break-all font-mono text-xs font-medium text-content">
                  {orderReference().value}
                </dd>
              </div>
            )}
          </Show>
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
              <UiBadge>{state.ticketCountLabel()}</UiBadge>
            </div>
            <p class="text-sm text-content-muted">Zeige den QR-Code für den Einlass vor.</p>
            <For each={state.order().tickets}>
              {(ticket) => (
                <section class="overflow-hidden rounded-control border border-border-subtle bg-surface shadow-none">
                  <div class="flex items-start justify-between gap-space-4 p-space-4">
                    <div>
                      <h4 class="text-xl font-semibold text-content">{state.ticketTitle(ticket)}</h4>
                      <p class="mt-space-1 text-content-muted">{state.participantName(ticket)}</p>
                    </div>
                    <Show when={ticket.cancelled}>
                      <UiBadge tone="danger">Storniert</UiBadge>
                    </Show>
                  </div>
                  <Show
                    when={!ticket.cancelled}
                    fallback={
                      <div class="flex flex-col items-center gap-space-2 border-t border-border-subtle bg-danger-soft p-space-5 text-center">
                        <p class="text-sm font-semibold text-danger">Ticket storniert – Nicht gültig für Einlass</p>
                        <p class="max-w-sm text-xs leading-relaxed text-content-muted">
                          Die zugehörige Zahlung ist fehlgeschlagen oder wurde zurückgebucht. Dieses Ticket berechtigt
                          nicht zum Einlass.
                        </p>
                      </div>
                    }
                  >
                    <div class="flex flex-col items-center gap-space-3 border-t border-border-subtle bg-surface-muted p-space-5">
                      <TicketQrCode value={ticket.code} label={state.ticketQrLabel(ticket)} />
                      <p class="max-w-sm text-center text-xs leading-relaxed text-content-muted">
                        Zeige diesen Code am Einlass vor. Gib ihn nicht an andere Personen weiter.
                      </p>
                      <div class="flex flex-wrap items-center justify-center gap-space-2 print:hidden">
                        <UiButton
                          variant="secondary"
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              window.print()
                            }
                          }}
                        >
                          Ticket drucken
                        </UiButton>
                        <Show when={state.isAppleWalletAvailable(ticket)}>
                          <TicketAppleWalletButton onClick={() => state.openAppleWallet(ticket)} />
                        </Show>
                        <Show when={state.isGoogleWalletAvailable(ticket)}>
                          <TicketGoogleWalletButton onClick={() => state.openGoogleWallet(ticket)} />
                        </Show>
                      </div>
                    </div>
                  </Show>
                </section>
              )}
            </For>
          </div>
        </Show>
      </div>

      <TicketWalletDialog
        walletType={state.selectedWalletType}
        ticket={state.selectedTicket}
        eventTitle={() => state.order().eventTitle}
        onClose={state.closeWalletDialog}
      />
    </CardWrapper>
  )
}
