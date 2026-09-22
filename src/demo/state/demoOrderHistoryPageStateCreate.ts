import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { TicketOrderHistoryPageState } from "../../ticketing/TicketOrderHistoryPageState.ts"
import type { TicketOrderProjection } from "../../ticketing/TicketOrderProjection.ts"
import { demoTicketOrders } from "../fixtures/demoTicketOrders.ts"
import type { DemoFlowContextValue } from "./demoFlowContext.ts"
import { demoFlowContextUse } from "./demoFlowContextUse.ts"

export function demoOrderHistoryPageStateCreate(
  inputs?:
    | "populated"
    | "empty"
    | "error"
    | "signed-out"
    | {
        scenario?: "populated" | "empty" | "error" | "signed-out"
        flow?: DemoFlowContextValue
      },
): TicketOrderHistoryPageState {
  const scenario = typeof inputs === "string" ? inputs : (inputs?.scenario ?? "populated")
  const flow = typeof inputs === "object" && inputs?.flow ? inputs.flow : demoFlowContextUse()

  const isAuthenticated = createSignalObject(scenario !== "signed-out")
  const isDone = createSignalObject(true)
  const selectedOrderId = createSignalObject<string | null>(null)
  const selectedOrder = createSignalObject<TicketOrderProjection | null>(null)
  const isDetailLoading = createSignalObject(false)
  const detailError = createSignalObject("")

  const hasFlow = () => flow.hasFlowStates()
  const isLoading = () => (hasFlow() ? flow.isLoading() : false)
  const isError = () => (hasFlow() ? flow.isError() : scenario === "error")
  const isEmpty = () => (hasFlow() ? flow.isEmpty() : scenario === "empty")

  const orders = () => {
    if (isLoading() || isError() || isEmpty() || scenario === "signed-out") return []
    return demoTicketOrders.summaries
  }

  const listError = () => {
    if (isError()) return "Die Demo-Bestellungen konnten nicht geladen werden."
    return ""
  }

  const retryList = () => {
    flow.setState("loaded")
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
    orders,
    isDone: isDone.get,
    isLoading,
    listError,
    selectedOrderId: selectedOrderId.get,
    selectedOrder: selectedOrder.get,
    isDetailLoading: isDetailLoading.get,
    detailError: detailError.get,
    isAuthenticated: isAuthenticated.get,
    loadMore: () => undefined,
    retryList,
    selectOrder,
    retryDetail,
    closeDetail,
    sessionSync: () => undefined,
  }
}
