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
import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"
import { adminTicketOrdersPageStateCreate } from "./adminTicketOrdersPageStateCreate.ts"

export function AdminTicketOrdersPage(props?: {
  readonly state?: AdminTicketOrdersPageState
  readonly headerSlot?: JSX.Element
}) {
  const state = props?.state ?? adminTicketOrdersPageStateCreate()
  const viewPreference = adminListViewPreferenceContextUse()

  const orderDetails = (order: AdminTicketOrderSummary, tile: boolean) => (
    <>
      <div class="min-w-0">
        <h2 class="truncate font-semibold text-content">
          <Link
            to="/admin/events/$eventKey"
            params={{ eventKey: order.eventKey }}
            search={{}}
            class="hover:underline focus-visible:underline"
          >
            {state.eventForOrder(order)?.title ?? order.eventTitle}
          </Link>
        </h2>
        <Show when={tile}>
          <p class="mt-1 truncate text-xs text-content-muted">
            {[state.eventForOrder(order)?.venue, state.eventForOrder(order)?.city].filter(Boolean).join(", ") ||
              "Ort offen"}
          </p>
        </Show>
      </div>
      <div class="min-w-0 text-sm text-content-muted">
        <p class="truncate text-content">{state.customerName(order)}</p>
        <p class="truncate text-xs" title={order.customerEmail}>
          {order.customerEmail}
        </p>
        <Show when={tile}>
          <Show when={order.customerPhone}>
            <p class="truncate text-xs">Telefon: {order.customerPhone}</p>
          </Show>
          <Show when={order.customerAddress}>
            <p class="truncate text-xs">Adresse: {order.customerAddress}</p>
          </Show>
        </Show>
      </div>
      <p class="min-w-0 text-sm text-content">
        <span class={tile ? "text-content-muted" : "text-content-muted xl:hidden"}>Bestellt: </span>
        {state.dateFormat(order.createdAt)}
      </p>
      <p class="min-w-0 text-sm text-content">
        <span class={tile ? "text-content-muted" : "text-content-muted xl:hidden"}>Event: </span>
        {state.dateFormat(state.eventForOrder(order)?.startsAt ?? order.eventStartsAt)}
      </p>
      <p class="min-w-0 truncate text-sm font-semibold text-content">
        <span class={tile ? "font-normal text-content-muted" : "font-normal text-content-muted xl:hidden"}>
          Betrag:{" "}
        </span>
        {state.priceFormat(order.totalCents)}
      </p>
      <div class={tile ? "absolute right-3 top-3" : "flex items-center gap-1"}>
        <Show when={!tile}>
          <span class="text-sm text-content-muted xl:hidden">Status:</span>
        </Show>
        <UiBadge tone={state.paymentTone(order.paymentStatus)}>{state.paymentLabel(order.paymentStatus)}</UiBadge>
      </div>
      <div class="min-w-0">
        <Button size="sm" variant="outline" class="whitespace-nowrap" onClick={() => void state.orderOpen(order.id)}>
          Details anzeigen
        </Button>
        <Show when={tile}>
          <p class="mt-2 truncate text-xs text-content-muted" title={order.paymentReference}>
            Referenz: {order.paymentReference}
          </p>
        </Show>
      </div>
    </>
  )

  return (
    <main id="content" tabindex="-1">
      <UiContainer width="wide" class="flex flex-col gap-6 py-8">
        {props?.headerSlot}
        <header class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-content">Bestellungen</h1>
            <p class="mt-1 text-sm text-content-muted">{state.orders().length} Bestellungen geladen</p>
          </div>
        </header>

        <div>
          <div class="grid gap-3 border-b border-border p-4 sm:grid-cols-[minmax(0,1fr)_14rem_12rem]">
            <SelectSingle
              class="min-w-0 sm:col-start-3"
              buttonProps={{
                variant: "none",
                size: "none",
                class:
                  "w-full min-w-0 justify-start truncate rounded-lg border border-input bg-surface-muted p-2.5 text-sm text-content focus:border-ring focus:ring-ring",
                innerClass: "min-w-64",
                type: "button",
              }}
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
              <Show when={viewPreference?.view() !== "tiles"}>
                <div class="hidden items-center border-b border-border text-xs font-semibold text-content-muted xl:flex">
                  <div class="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,9rem)_minmax(0,9rem)_minmax(0,9rem)_6rem_9rem_9rem] gap-2 px-4 py-3">
                    <span>Event</span>
                    <span>Kunde</span>
                    <span>Bestellt</span>
                    <span>Eventdatum</span>
                    <span>Betrag</span>
                    <span>Status</span>
                    <span>Aktion</span>
                  </div>
                </div>
              </Show>
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
                      <Show
                        when={viewPreference?.view() === "tiles"}
                        fallback={
                          <div class="flex items-center hover:bg-surface-muted">
                            <div class="grid min-w-0 flex-1 gap-2 p-4 transition-colors xl:grid-cols-[minmax(0,1fr)_minmax(0,9rem)_minmax(0,9rem)_minmax(0,9rem)_6rem_9rem_9rem] xl:items-center">
                              {orderDetails(order, false)}
                            </div>
                          </div>
                        }
                      >
                        <CardWrapper class="relative p-0 lg:p-0">
                          <div class="grid gap-3 p-4 pt-12 transition-colors hover:bg-surface-muted">
                            {orderDetails(order, true)}
                          </div>
                        </CardWrapper>
                      </Show>
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
