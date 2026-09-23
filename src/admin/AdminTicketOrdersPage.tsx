import { Link } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { SelectSingle } from "#ui/input/select/SelectSingle.jsx"
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
      <UiContainer width="wide" class="flex flex-col gap-6 py-8">
        {props?.headerSlot}
        <header class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-content">Bestellungen</h1>
            <p class="mt-1 text-sm text-content-muted">
              Alle Ticketbestellungen, unabhängig vom zugeordneten Kundenkonto.
            </p>
          </div>
        </header>

        <div>
          <div class="grid gap-3 border-b border-border p-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <div class="hidden sm:block" />
            <SelectSingle
              class="min-w-0"
              buttonProps={{ class: "w-full min-w-0 justify-start truncate", innerClass: "min-w-64", type: "button" }}
              valueSignal={state.eventSignal}
              getOptions={state.eventOptions}
              valueText={state.eventText}
              renderItem={state.eventText}
              searchPlaceholder="Event suchen …"
              texts={{ selectEntry: "Alle Events", noEntries: "Keine Events gefunden" }}
              innerClass="flex flex-col"
              listOptionClass="w-full"
            />
          </div>

          <Show when={state.errorMessage()}>
            <div class="flex flex-wrap items-center gap-3 p-4">
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
                <p role="status" class="p-8 text-center text-sm text-content-muted">
                  Bestellungen werden geladen …
                </p>
              </Show>
            }
          >
            <Show
              when={state.orders().length > 0}
              fallback={
                <p class="p-8 text-center text-sm text-content-muted">
                  {state.eventSignal.get()
                    ? "Keine Bestellungen für dieses Event gefunden."
                    : "Es sind noch keine Bestellungen vorhanden."}
                </p>
              }
            >
              <ul
                class={
                  viewPreference?.view() === "tiles"
                    ? "grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3"
                    : "divide-y divide-border"
                }
              >
                <For each={state.orders()}>
                  {(order) => (
                    <li class="min-w-0">
                      <div class={viewPreference?.view() === "tiles" ? "h-full" : "hover:bg-surface-muted"}>
                        <div
                          class={
                            viewPreference?.view() === "tiles"
                              ? "grid h-full gap-3 rounded-md border border-border p-4"
                              : "grid min-w-0 gap-2 p-4 transition-colors sm:grid-cols-[minmax(0,1fr)_14rem_10rem_9rem] sm:items-center"
                          }
                        >
                          <div class="min-w-0">
                            <h2 class="truncate font-semibold text-content">
                              <Link
                                to="/admin/events/$eventKey"
                                params={{ eventKey: order.eventKey }}
                                search={{}}
                                class="hover:underline focus-visible:underline"
                              >
                                {order.eventTitle}
                              </Link>
                            </h2>
                            <p class="mt-1 truncate text-xs text-content-muted">
                              {state.customerName(order)} · {order.customerEmail}
                            </p>
                            <Show when={order.customerPhone}>
                              <p class="truncate text-xs text-content-muted">Telefon: {order.customerPhone}</p>
                            </Show>
                            <Show when={order.customerAddress}>
                              <p class="truncate text-xs text-content-muted">Adresse: {order.customerAddress}</p>
                            </Show>
                          </div>
                          <div class="min-w-0 text-sm text-content">
                            <p>
                              <span class="text-content-muted">Bestellt: </span>
                              {state.dateFormat(order.createdAt)}
                            </p>
                            <p class="mt-1">
                              <span class="text-content-muted">Event: </span>
                              {state.dateFormat(order.eventStartsAt)}
                            </p>
                          </div>
                          <p
                            class="min-w-0 break-all text-sm text-content-muted sm:truncate"
                            title={order.paymentReference}
                          >
                            {order.paymentReference}
                          </p>
                          <div class="flex flex-wrap items-center gap-2 sm:flex-col sm:items-start">
                            <UiBadge tone={state.paymentTone(order.paymentStatus)}>
                              {state.paymentLabel(order.paymentStatus)}
                            </UiBadge>
                            <p class="text-sm font-semibold text-content">{state.priceFormat(order.totalCents)}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              class="whitespace-nowrap"
                              onClick={() => void state.orderOpen(order.id)}
                            >
                              Details anzeigen
                            </Button>
                          </div>
                        </div>
                      </div>
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
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </Show>
        </div>

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
