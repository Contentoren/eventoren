import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { TicketOrderStatusPageState } from "../../ticketing/TicketOrderStatusPageState.ts"
import { demoTicketOrders } from "../fixtures/demoTicketOrders.ts"
import type { DemoFlowContextValue } from "./demoFlowContext.ts"
import { demoFlowContextUse } from "./demoFlowContextUse.ts"

export function demoOrderStatusPageStateCreate(
  inputs?:
    | "paid"
    | "pending"
    | "error"
    | {
        scenario?: "paid" | "pending" | "error"
        flow?: DemoFlowContextValue
        navigate?: (opts: { to: string }) => void
      },
): TicketOrderStatusPageState {
  const scenario = typeof inputs === "string" ? inputs : (inputs?.scenario ?? "paid")
  const flow = typeof inputs === "object" && inputs?.flow ? inputs.flow : demoFlowContextUse()
  const navigate = typeof inputs === "object" ? inputs?.navigate : undefined

  const selectedOrder =
    scenario === "pending"
      ? demoTicketOrders.details["demo-order-pending"]
      : demoTicketOrders.details["demo-order-paid"]

  const isRefreshing = createSignalObject(false)

  const hasFlow = () => flow.hasFlowStates()
  const isLoading = () => (hasFlow() ? flow.isLoading() : false)
  const isError = () => (hasFlow() ? flow.isError() : scenario === "error")
  const isEmpty = () => (hasFlow() ? flow.isEmpty() : false)

  const orders = () => {
    if (isLoading() || isError() || isEmpty() || !selectedOrder) return []
    return [selectedOrder]
  }

  const errorMessage = () => {
    if (isError()) return "Die Demo-Bestellung konnte nicht geladen werden."
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
      if (navigate) {
        await navigate({ to: "/demo/customer/events" })
        return
      }
      if (typeof window !== "undefined") {
        window.location.assign("/demo/customer/events")
      }
    },
  }
}
