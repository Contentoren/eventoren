import { createEffect, on, onMount, useContext } from "solid-js"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import type { FunctionReference, PaginationOptions } from "convex/server"
import type { Result } from "#result"
import { queryPaginatedCreate } from "#src/utils/convex_client/queryPaginatedCreate.ts"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { eventAvailableTicketsCount } from "../events/eventAvailableTicketsCount.ts"
import { eventListAvailableTicketsCount } from "../events/eventListAvailableTicketsCount.ts"
import { ticketCountFormat } from "../ticketing/ticketCountFormat.ts"
import { ticketPriceFormat } from "../ticketing/ticketPriceFormat.ts"
import type { AdminEventItem } from "./AdminEventItem.ts"
import type { AdminTicketOrderDetails } from "./AdminTicketOrderDetails.ts"
import type { AdminTicketOrderBillingDetails } from "./AdminTicketOrderBillingDetails.ts"
import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"
import type { adminTicketOrdersList } from "./adminTicketOrdersList.ts"
import { adminTicketOrderBookingReference } from "./adminTicketOrderBookingReference.ts"
import { eventorenAuthContext } from "#src/auth/ui/eventorenAuthContext.ts"

const pageSize = 50
const dateFormatter = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" })

export function adminTicketOrdersPageStateCreate(
  inputs: {
    readonly list?: AdminTicketOrdersList
    readonly getDetails?: AdminTicketOrderDetailsGet
    readonly getBillingDetails?: AdminTicketOrderBillingDetailsGet
    readonly useNativeQueries?: boolean
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
  const auth = useContext(eventorenAuthContext)
  const nativeList = list
    ? undefined
    : queryPaginatedCreate(
        api.ticketing.ticketOrderListAdminPaginatedQuery as AdminOrdersPageQuery,
        () =>
          auth.token()
            ? {
                eventKey: eventSignal.get() || undefined,
                search: searchSignal.get().trim() || undefined,
              }
            : undefined,
        { pageSize },
      )
  const nativeDetailsArgs = createSignalObject<{ orderId: Id<"ticketOrders"> } | undefined>(undefined)
  const nativeDetailsResult = queryCreate(api.ticketing.ticketOrderGetAdminQuery as AdminOrderDetailsQuery, () => {
    const args = nativeDetailsArgs.get()
    return args
  })
  let detailRequest = 0
  let billingRequestKey: string | null = null
  let billingResolvedKey: string | null = null
  let listRequest = 0
  let activeToken = auth.token()
  let detailToken: string | null = null

  const pageLoad = async () => {
    if (!list && !inputs.useNativeQueries) return errorMessage.set("Die Admin-Sitzung ist nicht verfügbar.")
    if (isLoading.get() || isDone.get()) return
    const request = listRequest
    isLoading.set(true)
    errorMessage.set("")
    if (!list) {
      return
    }
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

  createEffect(() => {
    if (list || !inputs.useNativeQueries) return
    const result = nativeList?.result()
    if (!result) {
      isLoading.set(nativeList?.isLoading() ?? false)
      return
    }
    if ("success" in result && !result.success) {
      isLoading.set(false)
      errorMessage.set(result.errorMessage)
      return
    }
    if (!("success" in result) || !result.success) return
    orders.set(result.data)
    isDone.set(nativeList?.isDone() ?? false)
    isLoading.set(nativeList?.isLoading() ?? false)
    if (!result.data.length && !nativeList?.isDone() && searchSignal.get().trim()) nativeList?.loadMore()
  })

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
    billingRequestKey = null
    billingResolvedKey = null
    details.set(null)
    detailsError.set("")
    detailsLoading.set(true)
    if (inputs.useNativeQueries) {
      detailToken = auth.token()
      nativeDetailsArgs.set({ orderId: orderId as Id<"ticketOrders"> })
    }
    if (inputs.getDetails && !inputs.useNativeQueries) {
      const result = await inputs.getDetails({ orderId })
      if (request !== detailRequest) return
      detailsLoading.set(false)
      if (!result) return detailsError.set("Bestelldetails sind nicht verfügbar.")
      if (!result.success) return detailsError.set(result.errorMessage)
      details.set(result.data)
    }
  }

  createEffect(() => {
    if (!inputs.useNativeQueries) return
    const result = nativeDetailsResult()
    const orderId = selectedOrderId.get()
    const queryArgs = nativeDetailsArgs.get()
    const currentToken = auth.token()
    if (!result || !orderId || !queryArgs || queryArgs.orderId !== orderId || currentToken !== detailToken) return
    if ("success" in result && !result.success) {
      detailsLoading.set(false)
      detailsError.set(result.errorMessage)
      return
    }
    if (!("success" in result) || !result.success) return
    const data: AdminTicketOrderLocalDetails = result.data
    if (data.id !== orderId) return
    const existing = details.get()
    const requestKey = `${orderId}:${currentToken ?? ""}:${data.billingOrderReference ?? ""}:${data.paymentReference}`
    const billingUnchanged =
      existing?.id === orderId &&
      existing.billingOrderReference === data.billingOrderReference &&
      existing.paymentReference === data.paymentReference &&
      (!data.billingOrderReference || billingResolvedKey === requestKey)
    details.set({
      ...data,
      ...(billingUnchanged
        ? {
            bookingNumber: existing.bookingNumber,
            bookingReference: existing.bookingReference,
            stripeDetails: existing.stripeDetails,
            stripeError: existing.stripeError,
          }
        : { stripeDetails: null, stripeError: data.billingOrderReference ? "Billing-Details werden geladen." : null }),
    })
    detailsLoading.set(false)
    if (inputs.getBillingDetails && data.billingOrderReference && !billingUnchanged) {
      const orderRequest = detailRequest
      if (billingRequestKey === requestKey) return
      billingRequestKey = requestKey
      void inputs.getBillingDetails({ orderId }).then((billingResult) => {
        if (orderRequest !== detailRequest || selectedOrderId.get() !== orderId || auth.token() !== currentToken) return
        if (!billingResult) return
        if (!billingResult.success) {
          billingResolvedKey = requestKey
          const latest = details.get()
          if (latest?.id === orderId)
            details.set({ ...latest, stripeError: billingResult.errorMessage, stripeDetails: null })
          return
        }
        billingResolvedKey = requestKey
        const latest = details.get()
        if (!latest || latest.id !== orderId) return
        details.set({ ...latest, ...billingResult.data })
      })
    }
  })

  const orderClose = () => {
    detailRequest++
    billingRequestKey = null
    billingResolvedKey = null
    selectedOrderId.set(null)
    nativeDetailsArgs.set(undefined)
    detailToken = null
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
  else if (!list && inputs.useNativeQueries) onMount(reload)

  createEffect(() => {
    if (!inputs.useNativeQueries || list) return
    const token = auth.token()
    const ready = auth.ready()
    if (token === activeToken) return
    activeToken = token
    listRequest++
    orderClose()
    orders.set([])
    cursor.set(null)
    isDone.set(false)
    isLoading.set(false)
    errorMessage.set("")
    if (ready && token && inputs.useNativeQueries) void pageLoad()
  })

  return {
    customerName: (order: AdminTicketOrderSummary) =>
      [order.customerGivenName, order.customerFamilyName].filter(Boolean).join(" ") || "Ohne Namen",
    dateFormat: (value: string) => dateFormatter.format(new Date(value)),
    errorMessage: errorMessage.get,
    isDone: isDone.get,
    isLoading: isLoading.get,
    loadMore: async () => {
      if (inputs.useNativeQueries && !list) {
        nativeList?.loadMore()
        return
      }
      await pageLoad()
    },
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

type AdminOrdersPage = {
  readonly page: readonly AdminTicketOrderSummary[]
  readonly continueCursor: string
  readonly isDone: boolean
  readonly pageStatus?: "SplitRecommended" | "SplitRequired" | null
}
type AdminOrdersPageQuery = FunctionReference<
  "query",
  "public",
  {
    readonly token: string
    readonly eventKey?: string
    readonly search?: string
    readonly paginationOpts: PaginationOptions
  },
  Result<AdminOrdersPage>
>
type AdminTicketOrderLocalDetails = Omit<AdminTicketOrderDetails, "stripeDetails" | "stripeError">
type AdminOrderDetailsQuery = FunctionReference<
  "query",
  "public",
  { readonly token: string; readonly orderId: Id<"ticketOrders"> },
  Result<AdminTicketOrderLocalDetails>
>

type AdminTicketOrderDetailsGet = (input: {
  readonly orderId: string
}) => Promise<
  | { readonly success: true; readonly data: AdminTicketOrderDetails }
  | { readonly success: false; readonly errorMessage: string }
>

type AdminTicketOrderBillingDetailsGet = (input: {
  readonly orderId: string
}) => Promise<
  | { readonly success: true; readonly data: AdminTicketOrderBillingDetails }
  | { readonly success: false; readonly errorMessage: string }
>
