import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminEventItem } from "../../admin/AdminEventItem.ts"
import type { AdminTicketOrderSummary } from "../../admin/AdminTicketOrderSummary.ts"
import type { AdminTicketOrdersPageState } from "../../admin/AdminTicketOrdersPageState.ts"
import { adminTicketOrderBookingReference } from "../../admin/adminTicketOrderBookingReference.ts"
import { adminTicketOrderSearchMatches } from "../../admin/adminTicketOrderSearchMatches.ts"
import { eventAvailableTicketsCount } from "../../events/eventAvailableTicketsCount.ts"
import { eventListAvailableTicketsCount } from "../../events/eventListAvailableTicketsCount.ts"
import { ticketCountFormat } from "../../ticketing/ticketCountFormat.ts"
import { ticketPriceFormat } from "../../ticketing/ticketPriceFormat.ts"
import { demoAdminTicketOrders } from "../fixtures/demoAdminTicketOrders.ts"
import { demoCatalogEvents } from "../fixtures/demoCatalogEvents.ts"
import type { DemoFlowContextValue } from "./demoFlowContext.ts"
import { demoFlowContextUse } from "./demoFlowContextUse.ts"

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
})

export function demoAdminTicketOrdersPageStateCreate(inputs?: {
  readonly flow?: DemoFlowContextValue
  readonly orders?: readonly AdminTicketOrderSummary[]
  readonly events?: readonly AdminEventItem[]
}): AdminTicketOrdersPageState {
  const flow = inputs?.flow ?? demoFlowContextUse()
  const baseOrders = inputs?.orders ?? demoAdminTicketOrders
  const events = () => inputs?.events ?? demoCatalogEvents.map((event) => ({ ...event, status: "published" as const }))

  const ordersSignal = createSignalObject<readonly AdminTicketOrderSummary[]>(baseOrders)
  const selectedEvent = createSignalObject("")
  const searchInput = createSignalObject("")
  const searchQuery = createSignalObject("")
  const selectedOrderId = createSignalObject<string | null>(null)
  const isDone = createSignalObject(false)
  const isMoreLoading = createSignalObject(false)
  const baseErrorMessage = createSignalObject("")

  const hasFlow = () => flow.hasFlowStates()
  const isLoading = () => (hasFlow() ? flow.isLoading() : isMoreLoading.get())
  const isError = () => (hasFlow() ? flow.isError() : Boolean(baseErrorMessage.get()))
  const isEmpty = () => (hasFlow() ? flow.isEmpty() : false)

  const orders = () => {
    if (isLoading() || isError() || isEmpty()) return []
    return ordersSignal
      .get()
      .filter(
        (order) =>
          (!selectedEvent.get() || order.eventKey === selectedEvent.get()) &&
          adminTicketOrderSearchMatches(order, searchQuery.get()),
      )
  }

  const errorMessage = () => {
    if (isError()) return "Die Bestellungen konnten nicht geladen werden."
    return baseErrorMessage.get()
  }

  const reload = () => {
    if (hasFlow() && (flow.isError() || flow.isEmpty())) {
      flow.setState("loaded")
    }
    ordersSignal.set(baseOrders)
    isDone.set(false)
    baseErrorMessage.set("")
  }

  const loadMore = async () => {
    if (isLoading() || isDone.get()) return
    isMoreLoading.set(true)
    await Promise.resolve()
    isMoreLoading.set(false)
    isDone.set(true)
  }

  return {
    customerName: (order: AdminTicketOrderSummary) =>
      [order.customerGivenName, order.customerFamilyName].filter(Boolean).join(" ") || "Ohne Namen",
    dateFormat: (value: string) => dateFormatter.format(new Date(value)),
    errorMessage,
    isDone: isDone.get,
    isLoading,
    loadMore,
    orders,
    eventSignal: selectedEvent,
    searchInput,
    searchQuery: searchQuery.get,
    searchSubmit: (event?: Event) => {
      event?.preventDefault()
      searchQuery.set(searchInput.get().trim())
    },
    bookingReference: adminTicketOrderBookingReference,
    eventOptions: () => [
      { type: "item" as const, value: "" },
      ...Array.from(new Set(baseOrders.map((order) => order.eventKey)), (value) => ({ type: "item" as const, value })),
    ],
    eventText: (event) => baseOrders.find((order) => order.eventKey === event)?.eventTitle ?? "Alle Events",
    eventForOrder: (order: AdminTicketOrderSummary) => events().find((event) => event.id === order.eventKey),
    availableTicketsCount: () => {
      const selected = selectedEvent.get()
      if (selected) {
        const event = events().find((item) => item.id === selected)
        return event ? eventAvailableTicketsCount(event) : 0
      }
      return eventListAvailableTicketsCount(events())
    },
    availableTicketsLabel: () => {
      const selected = selectedEvent.get()
      const count = selected
        ? (() => {
            const event = events().find((item) => item.id === selected)
            return event ? eventAvailableTicketsCount(event) : 0
          })()
        : eventListAvailableTicketsCount(events())
      return `${ticketCountFormat(count)} ${count === 1 ? "Ticket" : "Tickets"} zum Kauf verfügbar`
    },
    availableTicketsForOrder: (order: AdminTicketOrderSummary) => {
      const event = events().find((item) => item.id === order.eventKey)
      return event ? eventAvailableTicketsCount(event) : undefined
    },
    availableTicketsLabelForOrder: (order: AdminTicketOrderSummary) => {
      const event = events().find((item) => item.id === order.eventKey)
      if (!event) return undefined
      const count = eventAvailableTicketsCount(event)
      return `${ticketCountFormat(count)} ${count === 1 ? "Ticket" : "Tickets"} zum Kauf verfügbar`
    },
    ticketCountFormat,
    paymentLabel: (status: AdminTicketOrderSummary["paymentStatus"], order?: AdminTicketOrderSummary) => {
      if (order?.cancellation) return "Storniert"
      if (order?.paymentStatus === "pending" && order.ticketsIssuedAt) return "SEPA in Bearbeitung"
      return { pending: "Offen", paid: "Bezahlt", failed: "Fehlgeschlagen", expired: "Abgelaufen" }[status]
    },
    paymentTone: (status: AdminTicketOrderSummary["paymentStatus"], order?: AdminTicketOrderSummary) => {
      if (order?.cancellation) return "danger" as const
      if (order?.paymentStatus === "pending" && order.ticketsIssuedAt) return "brand" as const
      return status === "paid"
        ? ("success" as const)
        : status === "pending"
          ? ("warning" as const)
          : ("danger" as const)
    },
    priceFormat: ticketPriceFormat,
    reload,
    details: () => {
      const id = selectedOrderId.get()
      if (!id) return null
      const order = baseOrders.find((o) => o.id === id)
      if (!order) return null
      const event = events().find((e) => e.id === order.eventKey)
      return {
        id: order.id,
        customerEmail: order.customerEmail,
        customerGivenName: order.customerGivenName ?? null,
        customerFamilyName: order.customerFamilyName ?? null,
        customerAddress: order.customerAddress ?? null,
        customerPhone: order.customerPhone ?? null,
        eventKey: order.eventKey,
        eventTitle: event?.title ?? order.eventTitle,
        eventSubtitle: event?.subtitle ?? "",
        eventStartsAt: event?.startsAt ?? order.eventStartsAt,
        eventEndsAt: event?.endsAt ?? order.eventStartsAt,
        eventDoorsAt: event?.doorsAt ?? order.eventStartsAt,
        venue: event?.venue ?? "",
        city: event?.city ?? "",
        eventAddress: event?.address ?? "",
        organizer: event?.organizer ?? "",
        subtotalCents: Math.round(order.totalCents * 0.9),
        feeCents: Math.round(order.totalCents * 0.1),
        totalCents: order.totalCents,
        paymentReference: order.paymentReference,
        billingOrderReference: `billing_${order.id}`,
        stripeMode: order.stripeMode,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        lines: [
          {
            tierName: event?.tiers[0]?.name ?? "Standard Ticket",
            quantity: 1,
            priceCents: Math.round(order.totalCents * 0.9),
            feeCents: Math.round(order.totalCents * 0.1),
          },
        ],
        stripeDetails: null,
        stripeError: null,
      }
    },
    selectedOrderId: selectedOrderId.get,
    detailsError: () => "",
    detailsLoading: () => false,
    orderOpen: async (orderId: string) => {
      selectedOrderId.set(orderId)
    },
    orderClose: () => {
      selectedOrderId.set(null)
    },
    orderToggle: (orderId: string) => {
      if (selectedOrderId.get() === orderId) {
        selectedOrderId.set(null)
      } else {
        selectedOrderId.set(orderId)
      }
    },
  }
}
