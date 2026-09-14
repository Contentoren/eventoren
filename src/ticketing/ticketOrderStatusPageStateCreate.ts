import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { useNavigate } from "@tanstack/solid-router"
import { onCleanup, onMount } from "solid-js"
import { userTokenGet } from "../auth/ui/signals/userSessionSignal.ts"
import type { TicketOrderAccessRecord } from "./TicketOrderAccessRecord.ts"
import type { TicketOrderProjection } from "./TicketOrderProjection.ts"
import { ticketOrderAccessStorageLoad } from "./ticketOrderAccessStorageLoad.ts"
import { ticketOrderGet } from "./ticketOrderGet.ts"
import { ticketPaymentReconcile } from "./ticketPaymentReconcile.ts"

export function ticketOrderStatusPageStateCreate(inputs: {
  orderIds: () => readonly string[]
  checkoutKey: () => string | undefined
}) {
  const navigate = useNavigate()
  const orders = createSignalObject<readonly TicketOrderProjection[]>([])
  const isLoading = createSignalObject(true)
  const isRefreshing = createSignalObject(false)
  const errorMessage = createSignalObject("")

  const recordsResolve = (): readonly TicketOrderAccessRecord[] => {
    const loaded = ticketOrderAccessStorageLoad()
    if (!loaded.success) return []
    const orderIds = inputs.orderIds()
    const checkoutKey = inputs.checkoutKey()
    if (checkoutKey) return loaded.data.filter((record) => record.checkoutKey === checkoutKey)
    if (orderIds.length === 0) return []
    return orderIds
      .map((orderId) => loaded.data.find((record) => record.orderId === orderId) ?? { orderId, checkoutKey: "" })
      .filter((record) => record.orderId.length > 0)
  }

  const refresh = async () => {
    if (isRefreshing.get()) return
    isRefreshing.set(true)
    const token = userTokenGet()
    const records = recordsResolve()
    if (records.length === 0) {
      errorMessage.set("Diese Bestellung ist in diesem Browser nicht verfügbar.")
      isLoading.set(false)
      isRefreshing.set(false)
      return
    }

    const loadedOrders: TicketOrderProjection[] = []
    let firstError = ""
    for (const record of records) {
      const access = token ? { token } : { guestAccessToken: record.guestAccessToken }
      const loaded = await ticketOrderGet({ orderId: record.orderId, ...access })
      if (!loaded.success) {
        if (!firstError) firstError = loaded.errorMessage
        continue
      }
      loadedOrders.push(loaded.data)
    }

    if (loadedOrders.length > 0) orders.set(loadedOrders)
    if (loadedOrders.length === 0 && firstError) errorMessage.set(firstError)
    else if (loadedOrders.length > 0) errorMessage.set("")
    isLoading.set(false)

    for (const order of loadedOrders) {
      if (order.paymentStatus === "paid" || order.paymentStatus === "failed") continue
      const record = records.find((candidate) => candidate.orderId === order.id)
      if (!record) continue
      const access = token ? { token } : { guestAccessToken: record.guestAccessToken }
      const reconciled = await ticketPaymentReconcile({ orderId: order.id, ...access })
      if (!reconciled.success) continue
    }

    if (loadedOrders.some((order) => order.paymentStatus === "pending")) {
      const refreshedOrders: TicketOrderProjection[] = []
      for (const record of records) {
        const access = token ? { token } : { guestAccessToken: record.guestAccessToken }
        const loaded = await ticketOrderGet({ orderId: record.orderId, ...access })
        if (loaded.success) refreshedOrders.push(loaded.data)
      }
      if (refreshedOrders.length > 0) orders.set(refreshedOrders)
    }
    isRefreshing.set(false)
  }

  onMount(() => {
    void refresh()
    const interval = window.setInterval(() => void refresh(), 10_000)
    onCleanup(() => window.clearInterval(interval))
  })

  return {
    orders: orders.get,
    isLoading: isLoading.get,
    isRefreshing: isRefreshing.get,
    errorMessage: errorMessage.get,
    refresh,
    goToEvents: () => navigate({ to: "/" }),
  }
}
