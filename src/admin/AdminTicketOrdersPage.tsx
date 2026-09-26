import { Link } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { SelectSingle } from "#ui/input/select/SelectSingle.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { UiBadge } from "../ui/UiBadge.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import { adminListViewPreferenceContextUse } from "../viewPreference/adminListViewPreferenceContextUse.ts"
import { AdminTicketOrderDetailsPanel } from "./AdminTicketOrderDetailsPanel.tsx"
import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"
import type { AdminTicketOrdersPageState } from "./AdminTicketOrdersPageState.ts"
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
        <h2 class="truncate text-base font-semibold tracking-tight text-content">
          <Link
            to="/events/$eventId"
            params={{ eventId: order.eventKey }}
            onClick={(event) => event.stopPropagation()}
            class="hover:underline focus-visible:underline"
          >
            {state.eventForOrder(order)?.title ?? order.eventTitle}
          </Link>
        </h2>
        <p class="mt-0.5 truncate text-xs text-content-muted">
          <Link
            to="/events/$eventId"
            params={{ eventId: order.eventKey }}
            onClick={(event) => event.stopPropagation()}
            class="font-mono hover:underline focus-visible:underline"
          >
            {order.eventKey}
          </Link>
        </p>
        <Show when={tile}>
          <p class="mt-1 truncate text-xs text-content-muted">
            {[state.eventForOrder(order)?.venue, state.eventForOrder(order)?.city].filter(Boolean).join(", ") ||
              "Ort offen"}
          </p>
        </Show>
        <Show when={state.availableTicketsLabelForOrder(order)}>
          {(label) => <p class="mt-0.5 truncate text-xs text-content-muted">{label()}</p>}
        </Show>
      </div>
      <div class="min-w-0 space-y-0.5 text-sm text-content-muted">
        <p class="truncate font-medium text-content">{state.customerName(order)}</p>
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
      <Show when={!tile || state.bookingReference(order)}>
        <p class="min-w-0 truncate text-sm font-medium text-content" title={state.bookingReference(order)}>
          <Show when={state.bookingReference(order)}>{(reference) => <>Bestellnummer: {reference()}</>}</Show>
        </p>
      </Show>
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
      <Show when={tile}>
        <div class="min-w-0">
          <p class="truncate text-xs text-content-muted" title={order.paymentReference}>
            Referenz: {order.paymentReference}
          </p>
        </div>
      </Show>
    </>
  )

  return (
    <main id="content" tabindex="-1">
      <UiContainer width="wide" class="flex flex-col gap-6 py-6 sm:py-8">
        {props?.headerSlot}
        <header class="flex flex-wrap items-end justify-between gap-4 sm:gap-6">
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">Bestellungen</h1>
            <p class="mt-1 text-sm text-content-muted">
              {state.orders().length} {state.orders().length === 1 ? "Bestellung" : "Bestellungen"} geladen ·{" "}
              {state.availableTicketsLabel()}
            </p>
          </div>
          <div class="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm shadow-sm">
            <span class="text-content-muted">Zum Kauf verfügbar:</span>
            <span class="font-semibold text-content">
              {state.ticketCountFormat(state.availableTicketsCount())}{" "}
              {state.availableTicketsCount() === 1 ? "Ticket" : "Tickets"}
            </span>
          </div>
        </header>

        <div class="min-w-0 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <div class="grid gap-3 border-b border-border bg-surface-muted/50 p-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center sm:p-5">
            <form class="flex min-w-0 flex-col gap-2 sm:flex-row" onSubmit={state.searchSubmit} role="search">
              <Input
                type="search"
                aria-label="Bestellungen suchen"
                placeholder="Bestellnummer, E-Mail oder Name suchen …"
                class="min-h-11 min-w-0 w-full flex-1 rounded-lg bg-surface"
                value={state.searchInput.get()}
                onInput={(event) => state.searchInput.set(event.currentTarget.value)}
              />
              <Button type="submit" variant="outline" class="min-h-11 w-full rounded-lg bg-surface sm:w-auto">
                Suchen
              </Button>
            </form>
            <SelectSingle
              class="min-w-0"
              buttonProps={{
                variant: "none",
                size: "none",
                class:
                  "min-h-11 w-full min-w-0 justify-start truncate rounded-lg border border-input bg-surface p-2.5 text-sm text-content focus:border-ring focus:ring-ring",
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
            <div class="flex flex-wrap items-center gap-3 border-b border-border p-4 sm:p-5">
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
                  {!state.isDone()
                    ? "In den bisher durchsuchten Bestellungen kein Treffer. Weitere Bestellungen durchsuchen."
                    : state.searchQuery()
                      ? "Keine Bestellungen für diese Suche gefunden."
                      : state.eventSignal.get()
                        ? "Keine Bestellungen für dieses Event gefunden."
                        : "Es sind noch keine Bestellungen vorhanden."}
                </p>
              }
            >
              <Show when={viewPreference?.view() !== "tiles"}>
                <div class="hidden items-center border-b border-border bg-surface-muted/40 text-xs font-semibold tracking-wide text-content-muted xl:flex">
                  <div class="grid min-w-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)] gap-2 px-5 py-3.5">
                    <span>Event</span>
                    <span>Kunde</span>
                    <span>Bestellnummer</span>
                    <span>Bestellt</span>
                    <span>Eventdatum</span>
                    <span>Betrag</span>
                    <span>Status</span>
                  </div>
                </div>
              </Show>
              <ul
                class={
                  viewPreference?.view() === "tiles"
                    ? "grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3"
                    : "divide-y divide-border"
                }
              >
                <For each={state.orders()}>
                  {(order) => (
                    <li
                      class={
                        viewPreference?.view() === "tiles" && state.selectedOrderId() === order.id
                          ? "contents"
                          : "min-w-0"
                      }
                    >
                      <Show
                        when={viewPreference?.view() === "tiles"}
                        fallback={
                          <div class="flex items-center transition-colors hover:bg-surface-muted/60">
                            <div
                              role="button"
                              tabindex="0"
                              aria-expanded={state.selectedOrderId() === order.id}
                              aria-label={`Bestellung ${order.id} Details ${state.selectedOrderId() === order.id ? "schließen" : "anzeigen"}`}
                              class="grid min-w-0 flex-1 cursor-pointer gap-2.5 px-4 py-5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring sm:px-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)] xl:items-center"
                              onClick={() => state.orderToggle(order.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault()
                                  state.orderToggle(order.id)
                                }
                              }}
                            >
                              {orderDetails(order, false)}
                            </div>
                          </div>
                        }
                      >
                        <CardWrapper class="relative overflow-hidden rounded-xl p-0 shadow-sm lg:p-0">
                          <div
                            role="button"
                            tabindex="0"
                            aria-expanded={state.selectedOrderId() === order.id}
                            aria-label={`Bestellung ${order.id} Details ${state.selectedOrderId() === order.id ? "schließen" : "anzeigen"}`}
                            class="grid cursor-pointer gap-3 rounded-xl p-4 pt-12 transition-colors hover:bg-surface-muted/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => state.orderToggle(order.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                state.orderToggle(order.id)
                              }
                            }}
                          >
                            {orderDetails(order, true)}
                          </div>
                        </CardWrapper>
                      </Show>
                      <Show when={state.selectedOrderId() === order.id}>
                        <div
                          class={
                            viewPreference?.view() === "tiles"
                              ? "col-span-full rounded-xl border border-border bg-surface-muted/50 p-3 shadow-sm sm:p-4"
                              : "border-t border-border bg-surface-muted/50 px-3 py-4 sm:px-5"
                          }
                        >
                          <Show when={state.detailsLoading()}>
                            <CardWrapper class="rounded-xl shadow-sm">
                              <p role="status" class="text-sm text-content-muted">
                                Bestelldetails werden geladen …
                              </p>
                            </CardWrapper>
                          </Show>
                          <Show when={state.detailsError()}>
                            <p
                              role="alert"
                              class="rounded-xl border border-danger/50 bg-danger-soft px-4 py-3 text-sm text-danger"
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
                        </div>
                      </Show>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </Show>
        </div>

        <Show when={!state.isDone() && !state.isLoading() && !state.errorMessage()}>
          <div class="flex justify-center">
            <Button
              variant="outline"
              class="min-h-11 rounded-lg"
              disabled={state.isLoading()}
              onClick={() => void state.loadMore()}
            >
              {state.searchQuery() && !state.orders().length
                ? "Weitere Bestellungen durchsuchen"
                : "Weitere Bestellungen laden"}
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
