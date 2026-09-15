import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { TicketOrderHistoryPageState } from "../../ticketing/TicketOrderHistoryPageState.ts"
import type { TicketOrderProjection } from "../../ticketing/TicketOrderProjection.ts"
import { demoTicketOrders } from "../fixtures/demoTicketOrders.ts"

export function demoOrderHistoryPageStateCreate(
  scenario: "populated" | "empty" | "error" | "signed-out" = "populated",
): TicketOrderHistoryPageState {
  const orders = createSignalObject(scenario === "populated" ? demoTicketOrders.summaries : [])
  const isDone = createSignalObject(true)
  const isLoading = createSignalObject(false)
  const listError = createSignalObject(
    scenario === "error" ? "Die Demo-Bestellungen konnten nicht geladen werden." : "",
  )
  const selectedOrderId = createSignalObject<string | null>(null)
  const selectedOrder = createSignalObject<TicketOrderProjection | null>(null)
  const isDetailLoading = createSignalObject(false)
  const detailError = createSignalObject("")
  const isAuthenticated = createSignalObject(scenario !== "signed-out")

  const loadMore = () => undefined
  const retryList = () => {
    if (scenario !== "error") return
    orders.set(demoTicketOrders.summaries)
    listError.set("")
  }
  const selectOrder = async (orderId: string) => {
    selectedOrderId.set(orderId)
    selectedOrder.set(null)
    detailError.set("")
    isDetailLoading.set(true)
    await Promise.resolve()
    const order = demoTicketOrders.details[orderId]
    isDetailLoading.set(false)
    if (!order) {
      detailError.set("Die ausgewählten Demo-Details sind nicht verfügbar.")
      return
    }
    selectedOrder.set(order)
  }
  const retryDetail = () => {
    const orderId = selectedOrderId.get()
    if (orderId) void selectOrder(orderId)
  }
  const closeDetail = () => {
    selectedOrderId.set(null)
    selectedOrder.set(null)
    detailError.set("")
    isDetailLoading.set(false)
  }

  return {
    orders: orders.get,
    isDone: isDone.get,
    isLoading: isLoading.get,
    listError: listError.get,
    selectedOrderId: selectedOrderId.get,
    selectedOrder: selectedOrder.get,
    isDetailLoading: isDetailLoading.get,
    detailError: detailError.get,
    isAuthenticated: isAuthenticated.get,
    loadMore,
    retryList,
    selectOrder,
    retryDetail,
    closeDetail,
    sessionSync: () => undefined,
  }
}
