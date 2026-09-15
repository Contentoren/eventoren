import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { userTokenGet } from "../auth/ui/signals/userSessionSignal.ts"
import { eventDateFormat } from "../events/eventDateFormat.ts"
import { eventTimeFormat } from "../events/eventTimeFormat.ts"
import { UiBadge } from "../ui/UiBadge.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import type { TicketOrderHistoryPageState } from "./TicketOrderHistoryPageState.ts"
import { TicketOrderWalletPass } from "./TicketOrderWalletPass.tsx"
import { ticketOrderHistoryPageStateCreate } from "./ticketOrderHistoryPageStateCreate.ts"
import { ticketPriceFormat } from "./ticketPriceFormat.ts"

export function TicketOrderHistoryPage(
  props: { readonly state?: TicketOrderHistoryPageState; readonly signInHref?: string } = {},
) {
  const state = props.state ?? ticketOrderHistoryPageStateCreate({ token: userTokenGet })

  return (
    <main id="content" tabindex="-1">
      <UiContainer class="flex flex-col gap-space-7 py-space-8 sm:py-12">
        <div class="flex flex-col gap-space-3">
          <p class="text-sm font-semibold uppercase tracking-widest text-brand-accent">Dein Konto</p>
          <h1 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">Meine Bestellungen</h1>
          <p class="max-w-2xl text-sm leading-relaxed text-content-muted">
            Hier findest du deine Bestellungen. Tickets und weitere Angaben werden erst geöffnet, wenn du eine
            Bestellung auswählst.
          </p>
        </div>

        <Show
          when={state.isAuthenticated()}
          fallback={
            <CardWrapper class="flex flex-col items-start gap-space-4">
              <p class="text-sm text-content-muted">Melde dich an, um deine Bestellhistorie zu sehen.</p>
              {props.signInHref ? (
                <a
                  href={props.signInHref}
                  class="focus-ring rounded-control text-sm font-semibold text-brand-accent underline underline-offset-4"
                >
                  Zur Anmeldung
                </a>
              ) : (
                <Link
                  to="/sign-in"
                  search={{ returnTo: "/bestellungen" }}
                  class="focus-ring rounded-control text-sm font-semibold text-brand-accent underline underline-offset-4"
                >
                  Zur Anmeldung
                </Link>
              )}
            </CardWrapper>
          }
        >
          <Show when={state.listError()}>
            <div class="flex flex-wrap items-center justify-between gap-space-3 rounded-control border border-danger/50 bg-danger-soft px-space-4 py-space-3">
              <p role="alert" class="text-sm text-danger">
                {state.listError()}
              </p>
              <Button variant="outline" size="sm" onClick={state.retryList}>
                Erneut versuchen
              </Button>
            </div>
          </Show>

          <Show when={state.isLoading() && state.orders().length === 0}>
            <CardWrapper>
              <p class="text-sm text-content-muted" aria-live="polite">
                Bestellungen werden geladen …
              </p>
            </CardWrapper>
          </Show>

          <Show when={!state.isLoading() && !state.listError() && state.orders().length === 0}>
            <CardWrapper class="flex flex-col gap-space-3">
              <h2 class="text-lg font-semibold text-content">Noch keine Bestellungen</h2>
              <p class="text-sm text-content-muted">Sobald du Tickets bestellst, erscheinen sie hier.</p>
            </CardWrapper>
          </Show>

          <div class="flex flex-col gap-space-5">
            <For each={state.orders()}>
              {(order) => (
                <CardWrapper class="flex flex-col gap-space-5">
                  <div class="flex flex-col justify-between gap-space-4 sm:flex-row sm:items-start">
                    <div class="flex flex-col gap-space-2">
                      <p class="text-xs font-semibold uppercase tracking-widest text-content-muted">
                        Bestellt am {eventDateFormat(order.createdAt)}
                      </p>
                      <h2 class="text-xl font-semibold text-content">{order.eventTitle}</h2>
                      <p class="text-sm text-content-muted">
                        {eventDateFormat(order.eventStartsAt)} · {eventTimeFormat(order.eventStartsAt)} · {order.venue},{" "}
                        {order.city}
                      </p>
                    </div>
                    <UiBadge
                      tone={
                        order.paymentStatus === "paid"
                          ? "success"
                          : order.paymentStatus === "pending"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {order.paymentStatus === "paid"
                        ? "Bezahlt"
                        : order.paymentStatus === "pending"
                          ? "Zahlung offen"
                          : order.paymentStatus === "expired"
                            ? "Abgelaufen"
                            : "Zahlung fehlgeschlagen"}
                    </UiBadge>
                  </div>

                  <div class="flex flex-wrap items-center justify-between gap-space-4 border-t border-border-subtle pt-space-4">
                    <p class="text-sm text-content-muted">
                      Gesamt <strong class="text-content">{ticketPriceFormat(order.totalCents)}</strong>
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-expanded={state.selectedOrderId() === order.id}
                      onClick={() =>
                        state.selectedOrderId() === order.id ? state.closeDetail() : void state.selectOrder(order.id)
                      }
                    >
                      {state.selectedOrderId() === order.id ? "Details schließen" : "Tickets & Details anzeigen"}
                    </Button>
                  </div>

                  <Show when={state.selectedOrderId() === order.id}>
                    <div class="flex flex-col gap-space-4 border-t border-border-subtle pt-space-5">
                      <Show when={state.isDetailLoading()}>
                        <p class="text-sm text-content-muted" aria-live="polite">
                          Tickets und Details werden geladen …
                        </p>
                      </Show>
                      <Show when={state.detailError()}>
                        <div class="flex flex-wrap items-center justify-between gap-space-3 rounded-control border border-danger/50 bg-danger-soft px-space-4 py-space-3">
                          <p role="alert" class="text-sm text-danger">
                            {state.detailError()}
                          </p>
                          <Button variant="outline" size="sm" onClick={state.retryDetail}>
                            Details erneut laden
                          </Button>
                        </div>
                      </Show>
                      <Show when={state.selectedOrder()}>{(detail) => <TicketOrderWalletPass order={detail()} />}</Show>
                    </div>
                  </Show>
                </CardWrapper>
              )}
            </For>
          </div>

          <Show when={state.orders().length > 0 && !state.isDone()}>
            <div class="flex justify-center">
              <Button variant="outline" disabled={state.isLoading()} onClick={state.loadMore}>
                {state.isLoading() ? "Weitere Bestellungen werden geladen …" : "Weitere Bestellungen laden"}
              </Button>
            </div>
          </Show>
          <Show when={state.orders().length > 0 && state.isDone()}>
            <p class="text-center text-sm text-content-muted">Alle Bestellungen wurden geladen.</p>
          </Show>
        </Show>
      </UiContainer>
    </main>
  )
}
