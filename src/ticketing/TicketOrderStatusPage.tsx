import { For, Show } from "solid-js"
import { LinkButtonExternal, LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { UiButton } from "../ui/UiButton.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import type { TicketOrderStatusPageState } from "./TicketOrderStatusPageState.ts"
import { TicketOrderWalletPass } from "./TicketOrderWalletPass.tsx"
import { ticketOrderStatusPageViewStateCreate } from "./ticketOrderStatusPageViewStateCreate.ts"

export function TicketOrderStatusPage(props: {
  orderIds: readonly string[]
  checkoutKey?: string
  state?: TicketOrderStatusPageState
  cartHref?: string
  eventsHref?: string
  ordersHref?: string
  hideRefreshingMessage?: boolean
}) {
  const state = ticketOrderStatusPageViewStateCreate({
    orderIds: () => props.orderIds,
    checkoutKey: () => props.checkoutKey,
    state: () => props.state,
  })

  return (
    <main id="content" tabindex="-1">
      <UiContainer width="narrow" class="flex flex-col gap-space-6 py-space-6 sm:py-10">
        <Show
          when={!state.isLoading()}
          fallback={
            <CardWrapper class="rounded-card border-border-subtle bg-surface text-content shadow-none">
              <p class="text-sm text-content-muted" aria-live="polite">
                Bestellung wird geladen …
              </p>
            </CardWrapper>
          }
        >
          <Show when={state.hasOrders()}>
            <CardWrapper
              class={`rounded-card p-0 text-content shadow-none ${state.confirmationClass()}`}
              aria-live="polite"
            >
              <div class="flex flex-col gap-space-4 p-space-5 sm:p-space-6">
                <div class="flex items-start gap-space-4">
                  <span
                    aria-hidden="true"
                    class={`flex size-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${state.confirmationSymbolClass()}`}
                  >
                    {state.confirmationSymbol()}
                  </span>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold uppercase tracking-widest text-brand-accent">Deine Bestellung</p>
                    <h1 class="mt-space-1 text-2xl font-semibold tracking-tight text-content sm:text-3xl">
                      {state.confirmationTitle()}
                    </h1>
                    <p class="mt-space-2 text-sm leading-relaxed text-content-muted sm:text-base">
                      {state.confirmationMessage()}
                    </p>
                  </div>
                </div>
                <Show
                  when={state.hasTickets()}
                  fallback={
                    <UiButton
                      variant="secondary"
                      class="w-full sm:w-fit"
                      disabled={state.isRefreshing()}
                      onClick={state.refresh}
                    >
                      {state.refreshLabel()}
                    </UiButton>
                  }
                >
                  <LinkButtonExternal
                    href="#deine-tickets"
                    variant="none"
                    class="focus-ring h-11 w-full rounded-control bg-brand px-space-6 font-semibold text-brand-content hover:bg-brand-strong sm:w-fit"
                  >
                    Tickets öffnen
                  </LinkButtonExternal>
                </Show>
              </div>
            </CardWrapper>
          </Show>

          <Show when={state.errorMessage()}>
            <p
              role="alert"
              class="rounded-control border border-danger/50 bg-danger-soft px-space-4 py-space-3 text-sm text-danger"
            >
              {state.errorMessage()}
            </p>
          </Show>
          <Show when={!state.hasOrders() && !state.errorMessage()}>
            <CardWrapper class="rounded-card border-border-subtle bg-surface text-content shadow-none">
              <p class="text-sm text-content-muted">Keine Bestelldaten gefunden.</p>
            </CardWrapper>
          </Show>
          <Show when={state.isRefreshing() && !props.hideRefreshingMessage}>
            <p class="text-center text-sm text-content-muted" aria-live="polite">
              Zahlungsstatus wird aktualisiert …
            </p>
          </Show>
          <section id="deine-tickets" aria-label="Bestellung und Tickets" class="flex flex-col gap-space-5 scroll-mt-6">
            <For each={state.orders()}>{(order) => <TicketOrderWalletPass order={order} />}</For>
          </section>
        </Show>

        <div class="flex flex-col gap-space-3 border-t border-border-subtle pt-space-5 sm:flex-row sm:flex-wrap sm:items-center">
          <LinkButtonInternal
            to={props.eventsHref ?? "/"}
            variant="none"
            class="focus-ring h-11 w-full rounded-control bg-brand px-space-6 font-semibold text-brand-content hover:bg-brand-strong sm:w-auto"
          >
            Weitere Events entdecken
          </LinkButtonInternal>
          <UiButton
            variant="secondary"
            class="w-full sm:w-auto"
            disabled={state.isRefreshing()}
            onClick={state.refresh}
          >
            Status aktualisieren
          </UiButton>
          <Show when={props.ordersHref}>
            {(ordersHref) => (
              <LinkButtonInternal
                to={ordersHref()}
                variant="none"
                class="focus-ring h-11 w-full rounded-control px-space-4 font-semibold text-brand-accent hover:underline sm:w-auto"
              >
                Meine Bestellungen
              </LinkButtonInternal>
            )}
          </Show>
          {props.cartHref ? (
            <LinkButtonExternal
              href={props.cartHref}
              variant="none"
              class="focus-ring h-11 w-full rounded-control px-space-4 font-semibold text-brand-accent hover:underline sm:w-auto"
            >
              Zum Warenkorb
            </LinkButtonExternal>
          ) : (
            <LinkButtonInternal
              to="/warenkorb"
              variant="none"
              class="focus-ring h-11 w-full rounded-control px-space-4 font-semibold text-brand-accent hover:underline sm:w-auto"
            >
              Zum Warenkorb
            </LinkButtonInternal>
          )}
        </div>
      </UiContainer>
    </main>
  )
}
