import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { LinkButtonExternal, LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import type { TicketOrderStatusPageState } from "./TicketOrderStatusPageState.ts"
import { TicketOrderWalletPass } from "./TicketOrderWalletPass.tsx"
import { ticketOrderStatusPageViewStateCreate } from "./ticketOrderStatusPageViewStateCreate.ts"

export function TicketOrderStatusPage(props: {
  orderIds: readonly string[]
  checkoutKey?: string
  state?: TicketOrderStatusPageState
  cartHref?: string
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
            <CardWrapper class="border-border-strong bg-surface text-content">
              <p class="text-sm text-content-muted" aria-live="polite">
                Bestellung wird geladen …
              </p>
            </CardWrapper>
          }
        >
          <Show when={state.hasOrders()}>
            <CardWrapper
              class={`relative overflow-visible p-0 text-content ${state.confirmationClass()}`}
              aria-live="polite"
            >
              <div class="flex flex-col gap-space-5 p-space-5 sm:p-space-6">
                <span
                  aria-hidden="true"
                  class={`absolute top-0 left-0 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xl font-bold ${state.confirmationSymbolClass()}`}
                >
                  {state.confirmationSymbol()}
                </span>
                <div class="min-w-0">
                  <p class="text-sm font-semibold uppercase tracking-widest text-content-muted">Deine Bestellung</p>
                  <h1 class="mt-space-1 text-2xl font-semibold tracking-tight text-content sm:text-3xl">
                    {state.confirmationTitle()}
                  </h1>
                  <p class="mt-space-2 text-sm leading-relaxed text-content-muted sm:text-base">
                    {state.confirmationMessage()}
                  </p>
                </div>
                <Show
                  when={state.hasTickets()}
                  fallback={
                    <Button
                      variant="outline"
                      class="w-full border-border-strong bg-surface sm:w-fit"
                      disabled={state.isRefreshing()}
                      onClick={state.refresh}
                    >
                      {state.refreshLabel()}
                    </Button>
                  }
                >
                  <LinkButtonExternal href="#deine-tickets" variant="contrast" size="lg" class="w-full sm:w-fit">
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
          <Show when={state.isRefreshing()}>
            <p class="text-center text-sm text-content-muted" aria-live="polite">
              Zahlungsstatus wird aktualisiert …
            </p>
          </Show>
          <section id="deine-tickets" aria-label="Bestellung und Tickets" class="flex flex-col gap-space-5 scroll-mt-6">
            <For each={state.orders()}>{(order) => <TicketOrderWalletPass order={order} />}</For>
          </section>
        </Show>

        <div class="flex flex-col gap-space-3 border-t border-border-subtle pt-space-5 sm:flex-row sm:flex-wrap">
          <Button
            variant="outline"
            class="w-full border-border-strong bg-surface sm:w-auto"
            disabled={state.isRefreshing()}
            onClick={state.refresh}
          >
            Status aktualisieren
          </Button>
          <LinkButtonInternal to="/" variant="outline" class="w-full sm:w-auto">
            Weitere Events entdecken
          </LinkButtonInternal>
          {props.cartHref ? (
            <LinkButtonExternal href={props.cartHref} variant="link" class="w-full sm:w-auto">
              Zum Warenkorb
            </LinkButtonExternal>
          ) : (
            <LinkButtonInternal to="/warenkorb" variant="link" class="w-full sm:w-auto">
              Zum Warenkorb
            </LinkButtonInternal>
          )}
        </div>
      </UiContainer>
    </main>
  )
}
