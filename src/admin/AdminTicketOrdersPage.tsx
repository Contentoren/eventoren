import { Link } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { UiBadge } from "../ui/UiBadge.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import { adminListViewPreferenceContextUse } from "../viewPreference/adminListViewPreferenceContextUse.ts"
import { AdminTicketOrderDetailsPanel } from "./AdminTicketOrderDetailsPanel.tsx"
import type { AdminTicketOrdersPageState } from "./AdminTicketOrdersPageState.ts"
import { adminTicketOrdersPageStateCreate } from "./adminTicketOrdersPageStateCreate.ts"

export function AdminTicketOrdersPage(props?: {
  readonly state?: AdminTicketOrdersPageState
  readonly headerSlot?: JSX.Element
}) {
  const state = props?.state ?? adminTicketOrdersPageStateCreate()
  const viewPreference = adminListViewPreferenceContextUse()

  return (
    <main id="content" tabindex="-1">
      <UiContainer width="wide" class="flex flex-col gap-8 py-10">
        {props?.headerSlot}
        <header class="flex flex-col gap-3">
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
            <div
              class={
                viewPreference?.view() === "tiles" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-2"
              }
            >
              <For each={state.orders()}>
                {(order) => (
                  <div class="flex min-w-0 flex-col gap-2">
                    <CardWrapper
                      class={
                        viewPreference?.view() === "tiles"
                          ? "flex flex-col gap-4"
                          : "grid gap-3 p-space-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center"
                      }
                    >
                      <div class="min-w-0">
                        <p class="text-xs font-semibold uppercase tracking-wide text-content-muted">
                          {state.dateFormat(order.createdAt)}
                        </p>
                        <h2 class="mt-2 truncate text-lg font-semibold text-content">
                          <Link
                            to="/admin/events/$eventKey"
                            params={{ eventKey: order.eventKey }}
                            search={{}}
                            class="hover:underline focus-visible:underline"
                          >
                            {order.eventTitle}
                          </Link>
                        </h2>
                        <p class="mt-1 truncate text-sm text-content-muted">
                          {state.customerName(order)} · {order.customerEmail}
                        </p>
                        <Show when={order.customerPhone}>
                          <p class="mt-1 text-sm text-content-muted">Telefon: {order.customerPhone}</p>
                        </Show>
                        <Show when={order.customerAddress}>
                          <p class="mt-1 text-sm text-content-muted">Adresse: {order.customerAddress}</p>
                        </Show>
                      </div>
                      <div class="min-w-0 text-sm">
                        <p class="truncate text-content-muted">{order.paymentReference}</p>
                        <p class="mt-1 text-content-muted">Veranstaltung: {state.dateFormat(order.eventStartsAt)}</p>
                      </div>
                      <div class="flex items-center justify-between gap-4 md:flex-col md:items-end">
                        <UiBadge tone={state.paymentTone(order.paymentStatus)}>
                          {state.paymentLabel(order.paymentStatus)}
                        </UiBadge>
                        <p class="font-semibold text-content">{state.priceFormat(order.totalCents)}</p>
                        <Button size="sm" variant="outline" onClick={() => void state.orderOpen(order.id)}>
                          Details anzeigen
                        </Button>
                      </div>
                    </CardWrapper>
                    <Show when={state.selectedOrderId() === order.id}>
                      <Show when={state.detailsLoading()}>
                        <CardWrapper>
                          <p role="status" class="text-sm text-content-muted">
                            Bestelldetails werden geladen …
                          </p>
                        </CardWrapper>
                      </Show>
                      <Show when={state.detailsError()}>
                        <p
                          role="alert"
                          class="rounded-md border border-danger/50 bg-danger-soft px-4 py-3 text-sm text-danger"
                        >
                          {state.detailsError()}
                        </p>
                      </Show>
                      <Show when={state.details()?.id === order.id && state.details()}>
                        {(details) => (
                          <AdminTicketOrderDetailsPanel
                            order={details()}
                            close={state.orderClose}
                            dateFormat={state.dateFormat}
                            priceFormat={state.priceFormat}
                          />
                        )}
                      </Show>
                    </Show>
                  </div>
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
