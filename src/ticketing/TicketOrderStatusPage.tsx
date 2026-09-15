import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"
import { UiButton } from "../ui/UiButton.tsx"
import { UiCard } from "../ui/UiCard.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import type { TicketOrderStatusPageState } from "./TicketOrderStatusPageState.ts"
import { TicketOrderWalletPass } from "./TicketOrderWalletPass.tsx"
import { ticketOrderStatusPageStateCreate } from "./ticketOrderStatusPageStateCreate.ts"

export function TicketOrderStatusPage(props: {
  orderIds: readonly string[]
  checkoutKey?: string
  state?: TicketOrderStatusPageState
  cartHref?: string
}) {
  const state =
    props.state ??
    ticketOrderStatusPageStateCreate({
      orderIds: () => props.orderIds,
      checkoutKey: () => props.checkoutKey,
    })

  return (
    <main id="content" tabindex="-1">
      <UiContainer class="flex flex-col gap-space-6 py-space-8 sm:py-12">
        <div class="flex flex-col gap-space-3">
          <p class="text-sm font-semibold uppercase tracking-widest text-brand-accent">Deine Bestellung</p>
          <h1 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">Zahlungsstatus & Wallet</h1>
          <p class="max-w-2xl text-sm leading-relaxed text-content-muted">
            Der Status wird serverseitig bestätigt. Eine Weiterleitung allein markiert die Bestellung nicht als bezahlt.
          </p>
        </div>

        <Show
          when={!state.isLoading()}
          fallback={
            <UiCard>
              <p class="text-sm text-content-muted" aria-live="polite">
                Bestellung wird geladen …
              </p>
            </UiCard>
          }
        >
          <Show when={state.errorMessage()}>
            <p
              role="alert"
              class="rounded-control border border-danger/50 bg-danger-soft px-space-4 py-space-3 text-sm text-danger"
            >
              {state.errorMessage()}
            </p>
          </Show>
          <Show when={state.isRefreshing()}>
            <p class="text-sm text-content-muted" aria-live="polite">
              Zahlungsstatus wird aktualisiert …
            </p>
          </Show>
          <For each={state.orders()}>{(order) => <TicketOrderWalletPass order={order} />}</For>
        </Show>

        <div class="flex flex-wrap gap-space-3">
          <UiButton variant="secondary" onClick={() => state.refresh()}>
            Status aktualisieren
          </UiButton>
          <UiButton onClick={state.goToEvents}>Weitere Events entdecken</UiButton>
          {props.cartHref ? (
            <a
              href={props.cartHref}
              class="focus-ring inline-flex h-11 items-center rounded-control px-space-5 text-sm font-semibold text-content-muted underline underline-offset-4"
            >
              Zum Warenkorb
            </a>
          ) : (
            <Link
              to="/warenkorb"
              class="focus-ring inline-flex h-11 items-center rounded-control px-space-5 text-sm font-semibold text-content-muted underline underline-offset-4"
            >
              Zum Warenkorb
            </Link>
          )}
        </div>
      </UiContainer>
    </main>
  )
}
