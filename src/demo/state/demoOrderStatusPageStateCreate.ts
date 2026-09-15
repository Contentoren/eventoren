import { useNavigate } from "@tanstack/solid-router"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { TicketOrderStatusPageState } from "../../ticketing/TicketOrderStatusPageState.ts"
import { demoTicketOrders } from "../fixtures/demoTicketOrders.ts"

export function demoOrderStatusPageStateCreate(
  scenario: "paid" | "pending" | "error" = "paid",
): TicketOrderStatusPageState {
  const navigate = useNavigate()
  const selectedOrder =
    scenario === "pending"
      ? demoTicketOrders.details["demo-order-pending"]
      : demoTicketOrders.details["demo-order-paid"]
  const initialOrders = scenario === "error" || !selectedOrder ? [] : [selectedOrder]
  const orders = createSignalObject<readonly NonNullable<typeof selectedOrder>[]>(initialOrders)
  const isLoading = createSignalObject(false)
  const isRefreshing = createSignalObject(false)
  const errorMessage = createSignalObject(
    scenario === "error" ? "Die Demo-Bestellung konnte nicht geladen werden." : "",
  )

  const refresh = async () => {
    if (scenario === "error") return
    isRefreshing.set(true)
    await Promise.resolve()
    isRefreshing.set(false)
  }

  return {
    orders: orders.get,
    isLoading: isLoading.get,
    isRefreshing: isRefreshing.get,
    errorMessage: errorMessage.get,
    refresh,
    goToEvents: () => navigate({ to: "/demo/events" }),
  }
}
