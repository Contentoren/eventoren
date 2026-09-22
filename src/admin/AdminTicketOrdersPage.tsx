import type { JSX } from "solid-js"
import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { UiBadge } from "../ui/UiBadge.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import type { AdminTicketOrdersPageState } from "./AdminTicketOrdersPageState.ts"
import { adminTicketOrdersPageStateCreate } from "./adminTicketOrdersPageStateCreate.ts"

export function AdminTicketOrdersPage(props?: {
  readonly state?: AdminTicketOrdersPageState
  readonly headerSlot?: JSX.Element
}) {
  const state = props?.state ?? adminTicketOrdersPageStateCreate()

  return (
    <main id="content" tabindex="-1">
      <UiContainer width="wide" class="flex flex-col gap-8 py-10">
        {props?.headerSlot}
        <header class="flex flex-col gap-3">
          <p class="text-sm font-semibold uppercase tracking-widest text-brand-accent">Verwaltung</p>
          <h1 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">Bestellungen</h1>
          <p class="max-w-3xl text-sm leading-relaxed text-content-muted">
            Alle Ticketbestellungen, unabhängig vom zugeordneten Kundenkonto.
          </p>
        </header>

        <Show when={state.errorMessage()}>
          <div class="flex flex-wrap items-center gap-3">
            <p
              role="alert"
              class="flex-1 rounded-md border border-danger/50 bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              {state.errorMessage()}
            </p>
            <Button size="sm" variant="outline" onClick={state.reload}>
              Erneut versuchen
            </Button>
          </div>
        </Show>

        <Show
          when={(!state.isLoading() || state.orders().length > 0) && !state.errorMessage()}
          fallback={
            <Show when={!state.errorMessage()}>
              <CardWrapper>
                <p role="status" class="text-sm text-content-muted">
                  Bestellungen werden geladen …
                </p>
              </CardWrapper>
            </Show>
          }
        >
          <Show
            when={state.orders().length > 0}
            fallback={
              <CardWrapper>
                <p class="text-sm text-content-muted">Es sind noch keine Bestellungen vorhanden.</p>
              </CardWrapper>
            }
          >
            <div class="flex flex-col gap-4">
              <For each={state.orders()}>
                {(order) => (
                  <CardWrapper class="grid gap-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center">
                    <div class="min-w-0">
                      <p class="text-xs font-semibold uppercase tracking-wide text-content-muted">
                        {state.dateFormat(order.createdAt)}
                      </p>
                      <h2 class="mt-2 truncate text-lg font-semibold text-content">{order.eventTitle}</h2>
                      <p class="mt-1 truncate text-sm text-content-muted">
                        {state.customerName(order)} · {order.customerEmail}
                      </p>
                    </div>
                    <div class="min-w-0 text-sm">
                      <p class="truncate text-content">{order.paymentReference}</p>
                      <p class="mt-1 text-content-muted">Veranstaltung: {state.dateFormat(order.eventStartsAt)}</p>
                    </div>
                    <div class="flex items-center justify-between gap-4 md:flex-col md:items-end">
                      <UiBadge tone={state.paymentTone(order.paymentStatus)}>
                        {state.paymentLabel(order.paymentStatus)}
                      </UiBadge>
                      <p class="font-semibold text-content">{state.priceFormat(order.totalCents)}</p>
                    </div>
                  </CardWrapper>
                )}
              </For>
            </div>
          </Show>
        </Show>

        <Show when={state.orders().length > 0 && !state.isDone()}>
          <div class="flex justify-center">
            <Button variant="outline" disabled={state.isLoading()} onClick={() => void state.loadMore()}>
              {state.isLoading() ? "Weitere Bestellungen werden geladen …" : "Weitere Bestellungen laden"}
            </Button>
          </div>
        </Show>
        <Show when={state.orders().length > 0 && state.isDone()}>
          <p class="text-center text-sm text-content-muted">Alle Bestellungen wurden geladen.</p>
        </Show>
      </UiContainer>
    </main>
  )
}
