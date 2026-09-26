import { createEffect, on, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { eventAvailableTicketsCount } from "../events/eventAvailableTicketsCount.ts"
import { eventListAvailableTicketsCount } from "../events/eventListAvailableTicketsCount.ts"
import { ticketCountFormat } from "../ticketing/ticketCountFormat.ts"
import { ticketPriceFormat } from "../ticketing/ticketPriceFormat.ts"
import type { AdminEventItem } from "./AdminEventItem.ts"
import type { AdminTicketOrderDetails } from "./AdminTicketOrderDetails.ts"
import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"
import type { adminTicketOrdersList } from "./adminTicketOrdersList.ts"
import { adminTicketOrderBookingReference } from "./adminTicketOrderBookingReference.ts"

const pageSize = 50
const dateFormatter = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" })

export function adminTicketOrdersPageStateCreate(
  inputs: {
    readonly list?: AdminTicketOrdersList
    readonly getDetails?: AdminTicketOrderDetailsGet
    readonly events?: () => readonly AdminEventItem[]
    readonly eventSignal?: { readonly get: () => string; readonly set: (event: string) => void }
    readonly searchSignal?: { readonly get: () => string; readonly set: (search: string) => void }
  } = {},
) {
  const list = inputs.list
  const defaultEvent = createSignalObject("")
  const eventSignal = inputs.eventSignal ?? defaultEvent
  const defaultSearch = createSignalObject("")
  const searchSignal = inputs.searchSignal ?? defaultSearch
  const searchInput = createSignalObject(searchSignal.get())
  const orders = createSignalObject<readonly AdminTicketOrderSummary[]>([])
  const cursor = createSignalObject<string | null>(null)
  const isDone = createSignalObject(false)
  const isLoading = createSignalObject(false)
  const errorMessage = createSignalObject("")
  const details = createSignalObject<AdminTicketOrderDetails | null>(null)
  const selectedOrderId = createSignalObject<string | null>(null)
  const detailsError = createSignalObject("")
  const detailsLoading = createSignalObject(false)
  let detailRequest = 0
  let listRequest = 0

  const pageLoad = async () => {
    if (!list) return errorMessage.set("Die Admin-Sitzung ist nicht verfügbar.")
    if (isLoading.get() || isDone.get()) return
    const request = listRequest
    isLoading.set(true)
    errorMessage.set("")
    // Convex permits one paginated read per query. Follow empty matching pages with
    // separate bounded requests, so a search does not stop at the first 50 orders.
    for (let scannedPages = 0; scannedPages < 10; scannedPages++) {
      const result = await list({
        eventKey: eventSignal.get() || undefined,
        search: searchSignal.get().trim() || undefined,
        paginationOpts: { cursor: cursor.get(), numItems: pageSize },
      })
      if (request !== listRequest) return
      if (!result.success) {
        isLoading.set(false)
        return errorMessage.set(result.errorMessage)
      }
      const knownIds = new Set(orders.get().map((order) => order.id))
      orders.set([...orders.get(), ...result.data.page.filter((order) => !knownIds.has(order.id))])
      cursor.set(result.data.continueCursor)
      isDone.set(result.data.isDone)
      if (result.data.page.length || result.data.isDone || !searchSignal.get().trim()) break
    }
    isLoading.set(false)
  }

  const reload = () => {
    listRequest++
    orderClose()
    orders.set([])
    cursor.set(null)
    isDone.set(false)
    isLoading.set(false)
    errorMessage.set("")
    void pageLoad()
  }

  const orderOpen = async (orderId: string) => {
    const request = ++detailRequest
    selectedOrderId.set(orderId)
    details.set(null)
    detailsError.set("")
    detailsLoading.set(true)
    const result = inputs.getDetails ? await inputs.getDetails({ orderId }) : null
    if (request !== detailRequest) return
    detailsLoading.set(false)
    if (!result) return detailsError.set("Bestelldetails sind nicht verfügbar.")
    if (!result.success) return detailsError.set(result.errorMessage)
    details.set(result.data)
  }

  const orderClose = () => {
    detailRequest++
    selectedOrderId.set(null)
    details.set(null)
    detailsError.set("")
    detailsLoading.set(false)
  }

  const orderToggle = (orderId: string) => {
    if (selectedOrderId.get() === orderId) {
      orderClose()
      return
    }
    void orderOpen(orderId)
  }

  const availableTicketsCount = () => {
    const allEvents = inputs.events?.() ?? []
    const selected = eventSignal.get()
    if (selected) {
      const event = allEvents.find((item) => item.id === selected)
      return event ? eventAvailableTicketsCount(event) : 0
    }
    return eventListAvailableTicketsCount(allEvents)
  }

  const availableTicketsForOrder = (order: AdminTicketOrderSummary) => {
    const event = (inputs.events?.() ?? []).find((item) => item.id === order.eventKey)
    return event ? eventAvailableTicketsCount(event) : undefined
  }

  const availableTicketsLabel = () => {
    const count = availableTicketsCount()
    return `${ticketCountFormat(count)} ${count === 1 ? "Ticket" : "Tickets"} zum Kauf verfügbar`
  }

  const availableTicketsLabelForOrder = (order: AdminTicketOrderSummary) => {
    const count = availableTicketsForOrder(order)
    if (count === undefined) return undefined
    return `${ticketCountFormat(count)} ${count === 1 ? "Ticket" : "Tickets"} zum Kauf verfügbar`
  }

  if (inputs.eventSignal || inputs.searchSignal)
    createEffect(
      on(
        () => [eventSignal.get(), searchSignal.get()],
        () => {
          searchInput.set(searchSignal.get())
          reload()
        },
      ),
    )
  else onMount(reload)

  return {
    customerName: (order: AdminTicketOrderSummary) =>
      [order.customerGivenName, order.customerFamilyName].filter(Boolean).join(" ") || "Ohne Namen",
    dateFormat: (value: string) => dateFormatter.format(new Date(value)),
    errorMessage: errorMessage.get,
    isDone: isDone.get,
    isLoading: isLoading.get,
    loadMore: pageLoad,
    orders: orders.get,
    eventSignal,
    searchInput,
    searchQuery: searchSignal.get,
    searchSubmit: (event?: Event) => {
      event?.preventDefault()
      const query = searchInput.get().trim().slice(0, 100)
      if (query === searchSignal.get()) return reload()
      searchSignal.set(query)
      if (!inputs.searchSignal) reload()
    },
    bookingReference: adminTicketOrderBookingReference,
    eventOptions: () => [
      { type: "item" as const, value: "" },
      ...(inputs.events?.() ?? []).map((event) => ({ type: "item" as const, value: event.id })),
    ],
    eventText: (event: string) => (inputs.events?.() ?? []).find((item) => item.id === event)?.title ?? "Alle Events",
    eventForOrder: (order: AdminTicketOrderSummary) =>
      (inputs.events?.() ?? []).find((event) => event.id === order.eventKey),
    availableTicketsCount,
    availableTicketsLabel,
    availableTicketsForOrder,
    availableTicketsLabelForOrder,
    ticketCountFormat,
    paymentLabel: (status: AdminTicketOrderSummary["paymentStatus"]) =>
      ({ pending: "Offen", paid: "Bezahlt", failed: "Fehlgeschlagen", expired: "Abgelaufen" })[status],
    paymentTone: (status: AdminTicketOrderSummary["paymentStatus"]) =>
      status === "paid" ? ("success" as const) : status === "pending" ? ("warning" as const) : ("danger" as const),
    priceFormat: ticketPriceFormat,
    reload,
    details: details.get,
    selectedOrderId: selectedOrderId.get,
    detailsError: detailsError.get,
    detailsLoading: detailsLoading.get,
    orderOpen,
    orderClose,
    orderToggle,
  }
}

type AdminTicketOrdersList = (input: {
  readonly eventKey?: string
  readonly search?: string
  readonly paginationOpts: Parameters<typeof adminTicketOrdersList>[0]["paginationOpts"]
}) => ReturnType<typeof adminTicketOrdersList>

type AdminTicketOrderDetailsGet = (input: {
  readonly orderId: string
}) => Promise<
  | { readonly success: true; readonly data: AdminTicketOrderDetails }
  | { readonly success: false; readonly errorMessage: string }
>
