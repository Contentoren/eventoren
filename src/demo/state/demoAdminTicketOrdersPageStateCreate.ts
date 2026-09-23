import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminTicketOrderSummary } from "../../admin/AdminTicketOrderSummary.ts"
import type { AdminTicketOrdersPageState } from "../../admin/AdminTicketOrdersPageState.ts"
import { ticketPriceFormat } from "../../ticketing/ticketPriceFormat.ts"
import { demoAdminTicketOrders } from "../fixtures/demoAdminTicketOrders.ts"
import type { DemoFlowContextValue } from "./demoFlowContext.ts"
import { demoFlowContextUse } from "./demoFlowContextUse.ts"

const dateFormatter = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" })

export function demoAdminTicketOrdersPageStateCreate(inputs?: {
  readonly flow?: DemoFlowContextValue
  readonly orders?: readonly AdminTicketOrderSummary[]
}): AdminTicketOrdersPageState {
  const flow = inputs?.flow ?? demoFlowContextUse()
  const baseOrders = inputs?.orders ?? demoAdminTicketOrders

  const ordersSignal = createSignalObject<readonly AdminTicketOrderSummary[]>(baseOrders)
  const selectedEvent = createSignalObject("")
  const isDone = createSignalObject(false)
  const isMoreLoading = createSignalObject(false)
  const baseErrorMessage = createSignalObject("")

  const hasFlow = () => flow.hasFlowStates()
  const isLoading = () => (hasFlow() ? flow.isLoading() : isMoreLoading.get())
  const isError = () => (hasFlow() ? flow.isError() : Boolean(baseErrorMessage.get()))
  const isEmpty = () => (hasFlow() ? flow.isEmpty() : false)

  const orders = () => {
    if (isLoading() || isError() || isEmpty()) return []
    return ordersSignal.get().filter((order) => !selectedEvent.get() || order.eventKey === selectedEvent.get())
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
    eventOptions: () => [
      { type: "item" as const, value: "" },
      ...Array.from(new Set(baseOrders.map((order) => order.eventKey)), (value) => ({ type: "item" as const, value })),
    ],
    eventText: (event) => baseOrders.find((order) => order.eventKey === event)?.eventTitle ?? "Alle Events",
    paymentLabel: (status: AdminTicketOrderSummary["paymentStatus"]) =>
      ({ pending: "Offen", paid: "Bezahlt", failed: "Fehlgeschlagen", expired: "Abgelaufen" })[status],
    paymentTone: (status: AdminTicketOrderSummary["paymentStatus"]) =>
      status === "paid" ? ("success" as const) : status === "pending" ? ("warning" as const) : ("danger" as const),
    priceFormat: ticketPriceFormat,
    reload,
    details: () => null,
    selectedOrderId: () => null,
    detailsError: () => "",
    detailsLoading: () => false,
    orderOpen: async () => {},
    orderClose: () => {},
  }
}
