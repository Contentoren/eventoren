import { Link } from "@tanstack/solid-router"
import { mdiChevronDown } from "@adaptive-ds/mdi/mdiChevronDown.js"
import { mdiChevronUp } from "@adaptive-ds/mdi/mdiChevronUp.js"
import { mdiRestore } from "@adaptive-ds/mdi/mdiRestore.js"
import { mdiUnfoldMoreHorizontal } from "@adaptive-ds/mdi/mdiUnfoldMoreHorizontal.js"
import type { JSX } from "solid-js"
import { For, Show } from "solid-js"
import { ButtonIconOnly } from "#ui/interactive/button/ButtonIconOnly.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { SelectSingle } from "#ui/input/select/SelectSingle.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { UiBadge } from "../ui/UiBadge.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import { adminListViewPreferenceContextUse } from "../viewPreference/adminListViewPreferenceContextUse.ts"
import { adminActivationCodeBlobDownload } from "./adminActivationCodeBlobDownload.ts"
import { AdminOrderVoucherBadge } from "./AdminOrderVoucherBadge.tsx"
import { AdminTicketOrderDrawer } from "./AdminTicketOrderDrawer.tsx"
import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"
import { AdminTicketOrderStatusFilterSelect } from "./AdminTicketOrderStatusFilterSelect.tsx"
import { adminTicketOrderPaymentMethodLabel } from "./adminTicketOrderPaymentMethodLabel.ts"
import type { AdminTicketOrdersSortBy } from "./adminTicketOrdersSort.ts"
import { adminTicketOrdersCsvFormat } from "./adminTicketOrdersCsvFormat.ts"
import { adminTicketOrdersExportFilename } from "./adminTicketOrdersExportFilename.ts"
import { adminTicketOrdersExportRows } from "./adminTicketOrdersExportRows.ts"
import type { AdminTicketOrdersPageState } from "./AdminTicketOrdersPageState.ts"
import { adminTicketOrdersPageStateCreate } from "./adminTicketOrdersPageStateCreate.ts"
import { adminTicketOrdersColumnWidthsStateCreate } from "./adminTicketOrdersColumnWidthsStateCreate.ts"

const adminTicketOrdersColumnLabels = [
  "Nummer",
  "Käufer",
  "Event",
  "Tickets",
  "Betrag",
  "Gutschein",
  "Zahlart",
  "Datum",
  "Eventdatum",
  "Status",
] as const

const adminTicketOrdersSortableColumns: Record<string, AdminTicketOrdersSortBy> = {
  Nummer: "nummer",
  Käufer: "kaeufer",
  Betrag: "betrag",
  Gutschein: "gutschein",
  Datum: "datum",
  Status: "status",
}

function adminTicketOrdersSortAria(sortOrder: "asc" | "desc"): "ascending" | "descending" {
  return sortOrder === "asc" ? "ascending" : "descending"
}

const adminTicketOrderBerlinDayFormat = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Berlin",
})

const adminTicketOrderBerlinTimeFormat = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/Berlin",
})

function adminTicketOrderBerlinDayKey(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value)
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? ""
  return `${part("year")}-${part("month")}-${part("day")}`
}

function adminTicketOrderRelativeFormat(iso: string, now = new Date()): string {
  const target = new Date(iso)
  const diffMs = target.getTime() - now.getTime()
  const absoluteMs = Math.abs(diffMs)
  if (absoluteMs < 60_000) return "gerade eben"
  if (absoluteMs < 3_600_000) {
    const minutes = Math.floor(absoluteMs / 60_000)
    return diffMs < 0 ? `vor ${minutes} Min.` : `in ${minutes} Min.`
  }
  const dayDiff = Math.round(
    (Date.parse(adminTicketOrderBerlinDayKey(target)) - Date.parse(adminTicketOrderBerlinDayKey(now))) / 86_400_000,
  )
  if (dayDiff === 0) {
    const hours = Math.floor(absoluteMs / 3_600_000)
    return diffMs < 0 ? `vor ${hours} Std.` : `in ${hours} Std.`
  }
  const time = adminTicketOrderBerlinTimeFormat.format(target)
  if (dayDiff === -1) return `gestern, ${time}`
  if (dayDiff === 1) return `morgen, ${time}`
  if (dayDiff < 0) {
    if (dayDiff > -7) return `vor ${Math.abs(dayDiff)} Tagen`
    return adminTicketOrderBerlinDayFormat.format(target)
  }
  if (dayDiff < 30) return `in ${dayDiff} Tagen`
  return adminTicketOrderBerlinDayFormat.format(target)
}

export function AdminTicketOrdersPage(props?: {
  readonly state?: AdminTicketOrdersPageState
  readonly headerSlot?: JSX.Element
}) {
  const state = props?.state ?? adminTicketOrdersPageStateCreate()
  const viewPreference = adminListViewPreferenceContextUse()
  const columnWidths = adminTicketOrdersColumnWidthsStateCreate()
  let headerGrid: HTMLDivElement | undefined

  const ticketLabel = (order: { readonly id: string; readonly ticketCount?: number }): string => {
    const count =
      typeof order.ticketCount === "number" && Number.isFinite(order.ticketCount)
        ? order.ticketCount
        : (() => {
            const loaded = state.details()
            if (!loaded || loaded.id !== order.id) return undefined
            return loaded.lines.reduce((sum, line) => sum + line.quantity, 0)
          })()
    if (typeof count !== "number" || !Number.isFinite(count)) return "—"
    return `${count} ${count === 1 ? "Ticket" : "Tickets"}`
  }

  const orderDetails = (order: AdminTicketOrderSummary, tile: boolean) => (
    <>
      <div class="min-w-0">
        <p class="truncate text-[13px] font-medium text-content" title={state.bookingReference(order)}>
          <Show when={state.bookingReference(order)} fallback={order.paymentReference}>
            {(reference) => (tile ? <>Nummer: {reference()}</> : reference())}
          </Show>
        </p>
        <Show when={!state.bookingReference(order)}>
          <p class="truncate text-xs text-content-muted" title={order.id}>
            {order.paymentReference}
          </p>
        </Show>
      </div>
      <div class="min-w-0 text-sm text-content-muted">
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
      <div class="min-w-0">
        <h2 class="truncate text-sm font-semibold tracking-tight text-content">
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
      <p class="min-w-0 text-sm text-content">
        <span class={tile ? "text-content-muted" : "text-content-muted xl:hidden"}>Tickets: </span>
        {ticketLabel(order)}
      </p>
      <p class="min-w-0 truncate text-sm font-semibold text-content">
        <span class={tile ? "font-normal text-content-muted" : "font-normal text-content-muted xl:hidden"}>
          Betrag:{" "}
        </span>
        {state.priceFormat(order.totalCents)}
      </p>
      <div class="min-w-0 text-sm text-content">
        <span class={tile ? "text-content-muted" : "text-content-muted xl:hidden"}>Gutschein: </span>
        <AdminOrderVoucherBadge voucher={order.voucher} />
      </div>
      <p class="min-w-0 truncate text-sm text-content" title={order.paymentMethodType ?? undefined}>
        <span class={tile ? "text-content-muted" : "text-content-muted xl:hidden"}>Zahlart: </span>
        {adminTicketOrderPaymentMethodLabel(order.paymentMethodType)}
      </p>
      <p class="min-w-0 text-sm text-content">
        <span class={tile ? "text-content-muted" : "text-content-muted xl:hidden"}>Datum: </span>
        <time datetime={order.createdAt} title={state.dateFormat(order.createdAt)}>
          {adminTicketOrderRelativeFormat(order.createdAt)}
        </time>
      </p>
      <Show when={!tile}>
        <p class="hidden min-w-0 text-xs text-content lg:block">
          <span class="text-content-muted xl:hidden">Eventdatum: </span>
          {state.dateFormat(state.eventForOrder(order)?.startsAt ?? order.eventStartsAt)}
        </p>
      </Show>
      <Show when={tile}>
        <p class="min-w-0 text-xs text-content">
          <span class="text-content-muted">Eventdatum: </span>
          {state.dateFormat(state.eventForOrder(order)?.startsAt ?? order.eventStartsAt)}
        </p>
        <div class="min-w-0">
          <p class="truncate text-xs text-content-muted" title={order.paymentReference}>
            Referenz: {order.paymentReference}
          </p>
        </div>
      </Show>
      <div class={tile ? "absolute right-3 top-3" : "flex min-w-0 flex-wrap items-center gap-1"}>
        <Show when={!tile}>
          <span class="text-xs text-content-muted xl:hidden">Status:</span>
        </Show>
        <UiBadge tone={state.paymentTone(order.paymentStatus, order)} class="ring-0">
          {state.paymentLabel(order.paymentStatus, order)}
        </UiBadge>
      </div>
    </>
  )

  const selectedOrder = () => {
    const id = state.selectedOrderId()
    if (!id) return null
    return state.orders().find((order) => order.id === id) ?? null
  }

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
          <div class="flex flex-wrap items-center gap-3">
            <div
              aria-label="Summe der ausgewählten Bestellungen"
              class="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-surface-muted/70 px-4 py-2.5 text-sm shadow-sm shadow-slate-900/5 dark:bg-slate-800/70 dark:shadow-black/20"
            >
              <p class="font-semibold text-content">{state.isDone() ? "Gesamtsumme" : "Zwischensumme (geladen)"}</p>
              <p class="font-semibold text-content">
                <span class="font-normal text-content-muted">Tickets: </span>
                {state.ticketCountFormat(state.totals().ticketCount)}
                {" von "}
                {state.ticketCountFormat(state.ticketCapacities().reduce((sum, event) => sum + event.ticketCount, 0))}{" "}
                gebucht
              </p>
              <p class="font-semibold text-content">
                <span class="font-normal text-content-muted">Betrag: </span>
                {state.priceFormat(state.totals().totalCents)}
              </p>
            </div>
          </div>
        </header>

        <div class="min-w-0 overflow-hidden rounded-xl bg-surface shadow-lg shadow-slate-900/10 dark:shadow-black/30">
          <div class="grid gap-2 bg-surface-muted/60 p-3 dark:bg-slate-800/60 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center">
            <form class="flex min-w-0 flex-col gap-2 sm:flex-row" onSubmit={state.searchSubmit} role="search">
              <Input
                type="search"
                aria-label="Bestellungen suchen"
                placeholder="Bestellnummer, E-Mail oder Name suchen …"
                class="h-9 min-w-0 w-full flex-1 rounded-md border-0 bg-surface text-sm shadow-sm shadow-slate-900/5 dark:bg-slate-900/80 dark:shadow-black/20"
                value={state.searchInput.get()}
                onInput={(event) => state.searchInput.set(event.currentTarget.value)}
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                class="h-9 w-full rounded-md border-0 bg-surface text-sm shadow-sm shadow-slate-900/5 dark:bg-slate-700 dark:shadow-black/20 sm:w-auto"
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
                  "h-9 w-full min-w-0 justify-start truncate rounded-md border-0 bg-surface p-2 text-sm text-content shadow-sm shadow-slate-900/5 dark:bg-slate-900/80 dark:shadow-black/20 focus-visible:ring-2 focus-visible:ring-ring",
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
          <div class={viewPreference?.view() === "tiles" ? "px-3 pb-3" : "px-3 pb-3 xl:hidden"}>
            <AdminTicketOrderStatusFilterSelect state={state} />
          </div>
          <div class="flex flex-wrap gap-2 px-3 pb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const rows = adminTicketOrdersExportRows(state.orders(), {
                  bookingReference: state.bookingReference,
                  customerName: state.customerName,
                  dateFormat: state.dateFormat,
                  eventTitle: (order) => state.eventForOrder(order)?.title ?? order.eventTitle,
                  paymentLabel: state.paymentLabel,
                  paymentMethodLabel: adminTicketOrderPaymentMethodLabel,
                  priceFormat: state.priceFormat,
                })
                adminActivationCodeBlobDownload(
                  new Blob([adminTicketOrdersCsvFormat(rows)], { type: "text/csv;charset=utf-8" }),
                  adminTicketOrdersExportFilename(),
                )
              }}
              disabled={state.orders().length === 0}
              class="min-h-11"
            >
              CSV exportieren
            </Button>
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
                  <div class="hidden items-center bg-surface-muted/40 text-xs font-semibold tracking-wide text-content-muted dark:bg-slate-800/40 xl:flex xl:min-w-full">
                    <div
                      ref={(element) => {
                        headerGrid = element
                      }}
                      class="grid min-w-0 flex-1 grid-cols-[var(--admin-orders-cols)] gap-2 px-3 py-2"
                    >
                      <For each={adminTicketOrdersColumnLabels}>
                        {(label, index) => {
                          const sortBy = () => adminTicketOrdersSortableColumns[label]
                          return (
                            <span class="relative flex min-w-0 items-center gap-1 pr-4">
                              <Show when={label === "Status"}>
                                <AdminTicketOrderStatusFilterSelect state={state} compact />
                              </Show>
                              <Show when={sortBy()} fallback={<span>{label}</span>}>
                                {(key) => (
                                  <button
                                    type="button"
                                    aria-sort={
                                      state.sortBy() === key() ? adminTicketOrdersSortAria(state.sortOrder()) : "none"
                                    }
                                    aria-label={`Nach ${label} sortieren`}
                                    title={`Nach ${label} sortieren`}
                                    onClick={() => state.sortToggle(key())}
                                    class="inline-flex max-w-full items-center gap-1 rounded-sm hover:text-content focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                                  >
                                    <Show when={label !== "Status"}>
                                      <span class="truncate">{label}</span>
                                    </Show>
                                    <Icon
                                      path={
                                        state.sortBy() === key()
                                          ? state.sortOrder() === "asc"
                                            ? mdiChevronUp
                                            : mdiChevronDown
                                          : mdiUnfoldMoreHorizontal
                                      }
                                      class="size-3.5 shrink-0"
                                    />
                                  </button>
                                )}
                              </Show>
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
                                  columnWidths.columnKeyResize(
                                    index(),
                                    event.key,
                                    columnWidths.columnMeasure(headerGrid),
                                  )
                                }}
                              >
                                <span aria-hidden="true" class="h-full w-px bg-slate-300 dark:bg-slate-600" />
                              </span>
                            </span>
                          )
                        }}
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
                      ? "grid gap-2 p-2 sm:grid-cols-2 sm:p-3 xl:grid-cols-3"
                      : "xl:min-w-full"
                  }
                >
                  <For each={state.orders()}>
                    {(order) => (
                      <li class="min-w-0 even:bg-surface-muted/35 dark:even:bg-slate-800/30">
                        <Show
                          when={viewPreference?.view() === "tiles"}
                          fallback={
                            <div class="flex items-center transition-colors hover:bg-surface-muted/60 xl:min-w-full">
                              <div
                                role="button"
                                tabindex="0"
                                aria-label={`Bestellung ${order.id} Details anzeigen`}
                                class="grid min-w-0 flex-1 cursor-pointer gap-1.5 px-3 py-2 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring xl:grid-cols-[var(--admin-orders-cols)] xl:items-center"
                                onClick={() => void state.orderOpen(order.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault()
                                    void state.orderOpen(order.id)
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
                              aria-label={`Bestellung ${order.id} Details anzeigen`}
                              class="grid cursor-pointer gap-1.5 rounded-lg p-3 pt-11 text-sm transition-colors hover:bg-surface-muted/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                              onClick={() => void state.orderOpen(order.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault()
                                  void state.orderOpen(order.id)
                                }
                              }}
                            >
                              {orderDetails(order, true)}
                            </div>
                          </CardWrapper>
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
              {state.eventSignal.get()
                ? "Alle Bestellungen anzeigen"
                : state.searchQuery() && !state.orders().length
                  ? "Weitere Bestellungen durchsuchen"
                  : "Weitere Bestellungen laden"}
            </Button>
          </div>
        </Show>
        <Show when={state.orders().length > 0 && state.isDone()}>
          <p class="text-center text-sm text-content-muted">Alle Bestellungen wurden geladen.</p>
        </Show>
        <AdminTicketOrderDrawer
          open={state.selectedOrderId() !== null}
          onClose={state.orderClose}
          details={state.details()}
          summary={selectedOrder()}
          loading={state.detailsLoading()}
          error={state.detailsError()}
          dateFormat={state.dateFormat}
          priceFormat={state.priceFormat}
          paymentLabel={state.paymentLabel}
          paymentTone={state.paymentTone}
        />
      </UiContainer>
    </main>
  )
}
