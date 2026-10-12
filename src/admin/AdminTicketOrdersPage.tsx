import { Link } from "@tanstack/solid-router"
import { mdiRestore } from "@adaptive-ds/mdi/mdiRestore.js"
import type { JSX } from "solid-js"
import { For, Show } from "solid-js"
import { ButtonIconOnly } from "#ui/interactive/button/ButtonIconOnly.jsx"
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
import { adminTicketOrdersColumnWidthsStateCreate } from "./adminTicketOrdersColumnWidthsStateCreate.ts"

const adminTicketOrdersColumnLabels = [
  "Event",
  "Kunde",
  "Bestellnummer",
  "Bestellt",
  "Eventdatum",
  "Betrag",
  "Status",
] as const

export function AdminTicketOrdersPage(props?: {
  readonly state?: AdminTicketOrdersPageState
  readonly headerSlot?: JSX.Element
}) {
  const state = props?.state ?? adminTicketOrdersPageStateCreate()
  const viewPreference = adminListViewPreferenceContextUse()
  const columnWidths = adminTicketOrdersColumnWidthsStateCreate()
  let headerGrid: HTMLDivElement | undefined

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
          <Show when={state.bookingReference(order)}>
            {(reference) => (tile ? <>Bestellnummer: {reference()}</> : reference())}
          </Show>
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
        <UiBadge tone={state.paymentTone(order.paymentStatus)} class="ring-0">
          {state.paymentLabel(order.paymentStatus)}
        </UiBadge>
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
          <div class="flex items-center gap-2 rounded-xl bg-surface-muted/70 px-4 py-2.5 text-sm shadow-sm shadow-slate-900/5 dark:bg-slate-800/70 dark:shadow-black/20">
            <span class="text-content-muted">Zum Kauf verfügbar:</span>
            <span class="font-semibold text-content">
              {state.ticketCountFormat(state.availableTicketsCount())}{" "}
              {state.availableTicketsCount() === 1 ? "Ticket" : "Tickets"}
            </span>
          </div>
        </header>

        <div class="min-w-0 overflow-hidden rounded-xl bg-surface shadow-lg shadow-slate-900/10 dark:shadow-black/30">
          <div class="grid gap-3 bg-surface-muted/60 p-4 dark:bg-slate-800/60 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center sm:p-5">
            <form class="flex min-w-0 flex-col gap-2 sm:flex-row" onSubmit={state.searchSubmit} role="search">
              <Input
                type="search"
                aria-label="Bestellungen suchen"
                placeholder="Bestellnummer, E-Mail oder Name suchen …"
                class="min-h-11 min-w-0 w-full flex-1 rounded-lg border-0 bg-surface shadow-sm shadow-slate-900/5 dark:bg-slate-900/80 dark:shadow-black/20"
                value={state.searchInput.get()}
                onInput={(event) => state.searchInput.set(event.currentTarget.value)}
              />
              <Button
                type="submit"
                variant="outline"
                class="min-h-11 w-full rounded-lg border-0 bg-surface shadow-sm shadow-slate-900/5 dark:bg-slate-700 dark:shadow-black/20 sm:w-auto"
              >
                Suchen
              </Button>
            </form>
            <SelectSingle
              class="min-w-0"
              buttonProps={{
                variant: "none",
                size: "none",
                class:
                  "min-h-11 w-full min-w-0 justify-start truncate rounded-lg border-0 bg-surface p-2.5 text-sm text-content shadow-sm shadow-slate-900/5 dark:bg-slate-900/80 dark:shadow-black/20 focus-visible:ring-2 focus-visible:ring-ring",
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
            <div class="flex flex-wrap items-center gap-3 bg-surface-muted/30 p-4 sm:p-5">
              <p role="alert" class="flex-1 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
                {state.errorMessage()}
              </p>
              <Button
                size="sm"
                variant="outline"
                class="rounded-lg border-0 bg-surface shadow-sm shadow-slate-900/5 dark:bg-slate-700 dark:shadow-black/20"
                onClick={state.reload}
              >
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
              <div class="overflow-x-auto" style={{ "--admin-orders-cols": columnWidths.gridTemplate() }}>
                <Show when={viewPreference?.view() !== "tiles"}>
                  <div class="hidden items-center bg-surface-muted/40 text-xs font-semibold tracking-wide text-content-muted dark:bg-slate-800/40 xl:flex xl:w-max xl:min-w-full">
                    <div
                      ref={(element) => {
                        headerGrid = element
                      }}
                      class="grid min-w-0 flex-1 grid-cols-[var(--admin-orders-cols)] gap-2 px-5 py-3.5"
                    >
                      <For each={adminTicketOrdersColumnLabels}>
                        {(label, index) => (
                          <span class="relative min-w-0 truncate pr-4">
                            {label}
                            <span
                              tabindex="0"
                              role="separator"
                              aria-orientation="vertical"
                              aria-label={`Spaltenbreite für ${label} ändern`}
                              title={`Spaltenbreite für ${label} ändern`}
                              class="absolute top-0.5 right-0.5 bottom-0.5 flex w-3 cursor-col-resize touch-none items-center justify-center rounded select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                              onPointerDown={(event) => {
                                if (event.button !== 0) return
                                columnWidths.columnDragStart(
                                  index(),
                                  event.clientX,
                                  columnWidths.columnMeasure(headerGrid),
                                )
                              }}
                              onKeyDown={(event) => {
                                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
                                event.preventDefault()
                                columnWidths.columnKeyResize(index(), event.key, columnWidths.columnMeasure(headerGrid))
                              }}
                            >
                              <span aria-hidden="true" class="h-full w-px bg-slate-300 dark:bg-slate-600" />
                            </span>
                          </span>
                        )}
                      </For>
                    </div>
                    <ButtonIconOnly
                      type="button"
                      variant="ghost"
                      icon={mdiRestore}
                      title="Spaltenbreiten zurücksetzen"
                      aria-label="Spaltenbreiten zurücksetzen"
                      class="mr-3 size-6 shrink-0 p-1 text-content-muted"
                      onClick={columnWidths.columnReset}
                    />
                  </div>
                </Show>
                <ul
                  class={
                    viewPreference?.view() === "tiles"
                      ? "grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3"
                      : "xl:w-max xl:min-w-full"
                  }
                >
                  <For each={state.orders()}>
                    {(order) => (
                      <li
                        class={
                          viewPreference?.view() === "tiles" && state.selectedOrderId() === order.id
                            ? "contents"
                            : "min-w-0 even:bg-surface-muted/35 dark:even:bg-slate-800/30"
                        }
                      >
                        <Show
                          when={viewPreference?.view() === "tiles"}
                          fallback={
                            <div class="flex items-center transition-colors hover:bg-surface-muted/60 xl:w-max xl:min-w-full">
                              <div
                                role="button"
                                tabindex="0"
                                aria-expanded={state.selectedOrderId() === order.id}
                                aria-label={`Bestellung ${order.id} Details ${state.selectedOrderId() === order.id ? "schließen" : "anzeigen"}`}
                                class="grid min-w-0 flex-1 cursor-pointer gap-2.5 px-4 py-5 transition-colors aria-expanded:bg-brand-soft/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring sm:px-5 xl:grid-cols-[var(--admin-orders-cols)] xl:items-center"
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
                              <span aria-hidden="true" class="hidden w-9 shrink-0 xl:block" />
                            </div>
                          }
                        >
                          <CardWrapper class="relative overflow-hidden rounded-xl border-0 p-0 shadow-md shadow-slate-900/10 dark:shadow-black/25 lg:p-0">
                            <div
                              role="button"
                              tabindex="0"
                              aria-expanded={state.selectedOrderId() === order.id}
                              aria-label={`Bestellung ${order.id} Details ${state.selectedOrderId() === order.id ? "schließen" : "anzeigen"}`}
                              class="grid cursor-pointer gap-3 rounded-xl p-4 pt-12 transition-colors hover:bg-surface-muted/60 aria-expanded:bg-brand-soft/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
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
                                ? "col-span-full rounded-xl bg-surface-muted/70 p-3 shadow-sm shadow-slate-900/5 dark:bg-slate-800/60 dark:shadow-black/20 sm:p-4 [&_.border]:border-0 [&_.border-t]:border-t-0"
                                : "bg-surface-muted/70 px-3 py-4 dark:bg-slate-800/60 sm:px-5 [&_.border]:border-0 [&_.border-t]:border-t-0"
                            }
                          >
                            <Show when={state.detailsLoading()}>
                              <CardWrapper class="rounded-xl border-0 shadow-sm shadow-slate-900/5 dark:shadow-black/20">
                                <p role="status" class="text-sm text-content-muted">
                                  Bestelldetails werden geladen …
                                </p>
                              </CardWrapper>
                            </Show>
                            <Show when={state.detailsError()}>
                              <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
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
              </div>
            </Show>
          </Show>
        </div>

        <Show when={!state.isDone() && !state.isLoading() && !state.errorMessage()}>
          <div class="flex justify-center">
            <Button
              variant="outline"
              class="min-h-11 rounded-lg border-0 bg-surface shadow-sm shadow-slate-900/10 dark:bg-slate-800 dark:shadow-black/25"
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
