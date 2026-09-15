import { createEffect, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import { userSessionBrowserRestore } from "../auth/ui/signals/userSessionBrowserRestore.ts"
import type { TicketOrderProjection } from "./TicketOrderProjection.ts"
import type { TicketOrderSummary } from "./TicketOrderSummary.ts"
import { ticketOrderGet } from "./ticketOrderGet.ts"
import { ticketOrderListMine } from "./ticketOrderListMine.ts"

const pageSize = 50

export function ticketOrderHistoryPageStateCreate(inputs: {
  readonly token: () => string
  readonly listMine?: typeof ticketOrderListMine
  readonly getOrder?: typeof ticketOrderGet
}) {
  const listMine = inputs.listMine ?? ticketOrderListMine
  const getOrder = inputs.getOrder ?? ticketOrderGet
  const orders = createSignalObject<readonly TicketOrderSummary[]>([])
  const cursor = createSignalObject<string | null>(null)
  const isDone = createSignalObject(false)
  const isLoading = createSignalObject(false)
  const listError = createSignalObject("")
  const selectedOrderId = createSignalObject<string | null>(null)
  const selectedOrder = createSignalObject<TicketOrderProjection | null>(null)
  const isDetailLoading = createSignalObject(false)
  const detailError = createSignalObject("")
  let listRevision = 0
  let detailRevision = 0
  let activeToken: string | undefined
  const isAuthenticated = createSignalObject(false)

  const detailReset = () => {
    detailRevision += 1
    selectedOrderId.set(null)
    selectedOrder.set(null)
    isDetailLoading.set(false)
    detailError.set("")
  }

  const pageLoad = async (pageCursor: string | null, revision: number, token: string) => {
    if (!token || isLoading.get()) return
    isLoading.set(true)
    listError.set("")
    const result = await listMine({ token, paginationOpts: { numItems: pageSize, cursor: pageCursor } })
    if (revision !== listRevision || token !== activeToken) return

    isLoading.set(false)
    if (!result.success) {
      listError.set(result.errorMessage)
      return
    }

    const knownIds = new Set(orders.get().map((order) => order.id))
    const nextOrders = result.data.page.filter((order) => !knownIds.has(order.id))
    orders.set([...orders.get(), ...nextOrders])
    cursor.set(result.data.continueCursor)
    isDone.set(result.data.isDone)
  }

  const reset = () => {
    listRevision += 1
    const revision = listRevision
    orders.set([])
    cursor.set(null)
    isDone.set(false)
    isLoading.set(false)
    listError.set("")
    detailReset()
    const token = activeToken ?? ""
    if (!token) return
    void pageLoad(null, revision, token)
  }

  const loadMore = () => {
    const token = activeToken ?? ""
    if (!token || isLoading.get() || isDone.get()) return
    void pageLoad(cursor.get(), listRevision, token)
  }

  const retryList = () => {
    if (orders.get().length === 0) {
      reset()
      return
    }
    loadMore()
  }

  const selectOrder = async (orderId: string) => {
    const token = activeToken ?? ""
    if (!token) return
    detailRevision += 1
    const revision = detailRevision
    selectedOrderId.set(orderId)
    selectedOrder.set(null)
    detailError.set("")
    isDetailLoading.set(true)
    const result = await getOrder({ orderId, token })
    if (revision !== detailRevision || token !== activeToken || selectedOrderId.get() !== orderId) return

    isDetailLoading.set(false)
    if (!result.success) {
      detailError.set(result.errorMessage)
      return
    }
    selectedOrder.set(result.data)
  }

  const sessionSync = () => {
    userSessionBrowserRestore()
    const token = inputs.token()
    if (token === activeToken) return
    activeToken = token
    isAuthenticated.set(Boolean(token))
    reset()
  }

  onMount(sessionSync)
  createEffect(sessionSync)

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
    retryDetail: () => {
      const orderId = selectedOrderId.get()
      if (orderId) void selectOrder(orderId)
    },
    closeDetail: detailReset,
    sessionSync,
  }
}
