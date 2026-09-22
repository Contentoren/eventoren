import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { TicketOrderStatusPageState } from "../../ticketing/TicketOrderStatusPageState.ts"
import { demoTicketOrders } from "../fixtures/demoTicketOrders.ts"
import type { DemoFlowContextValue } from "./demoFlowContext.ts"
import { demoFlowContextUse } from "./demoFlowContextUse.ts"

export function demoCheckoutStatusPageStateCreate(
  inputs:
    | "loading"
    | "loaded"
    | {
        scenario?: "loading" | "loaded"
        flow?: DemoFlowContextValue
      },
): TicketOrderStatusPageState {
  const scenario = typeof inputs === "string" ? inputs : (inputs?.scenario ?? "loaded")
  const flow = typeof inputs === "object" && inputs?.flow ? inputs.flow : demoFlowContextUse()

  const isRefreshing = createSignalObject(false)

  const hasFlow = () => flow.hasFlowStates()
  const isLoading = () => (hasFlow() ? flow.isLoading() : scenario === "loading")
  const isError = () => (hasFlow() ? flow.isError() : false)
  const isEmpty = () => (hasFlow() ? flow.isEmpty() : false)

  const orders = () => {
    if (isLoading() || isError() || isEmpty()) return []
    const paid = demoTicketOrders.details["demo-order-paid"]
    return paid ? [paid] : []
  }

  const errorMessage = () => {
    if (isError()) return "Die Checkout-Bestätigung konnte nicht geladen werden."
    return ""
  }

  const refresh = async () => {
    isRefreshing.set(true)
    await Promise.resolve()
    if (hasFlow() && (flow.isError() || flow.isEmpty())) {
      flow.setState("loaded")
    }
    isRefreshing.set(false)
  }

  return {
    orders,
    isLoading,
    isRefreshing: isRefreshing.get,
    errorMessage,
    refresh,
    goToEvents: async () => {
      return
    },
  }
}
