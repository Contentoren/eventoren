import { createEffect, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import type { TicketOrderProjection } from "./TicketOrderProjection.ts"
import type { TicketOrderSummary } from "./TicketOrderSummary.ts"
import { ticketOrderGet } from "./ticketOrderGet.ts"
import { ticketOrderListMine } from "./ticketOrderListMine.ts"
import { ticketingServerRead } from "./ticketingServerRead.ts"

const pageSize = 50

export function ticketOrderHistoryPageStateCreate(inputs: {
  readonly authenticated?: () => boolean
  readonly authenticationKey?: () => string | undefined
  readonly ready?: () => boolean
  /** Legacy test seam; production uses the cookie-backed server operations. */
  readonly token?: () => string
  readonly listMine?: typeof ticketOrderListMine
  readonly getOrder?: typeof ticketOrderGet
}) {
  const listMine = inputs.listMine
  const getOrder = inputs.getOrder
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
  let activeAuthentication = false
  let activeAuthenticationKey = ""
  const isAuthenticated = createSignalObject(false)

  const detailReset = () => {
    detailRevision += 1
    selectedOrderId.set(null)
    selectedOrder.set(null)
    isDetailLoading.set(false)
    detailError.set("")
  }

  const pageLoad = async (
    pageCursor: string | null,
    revision: number,
    authenticated: boolean,
    authenticationKey: string,
  ) => {
    if (!authenticated || isLoading.get()) return
    isLoading.set(true)
    listError.set("")
    const paginationOpts = { numItems: pageSize, cursor: pageCursor }
    const result = listMine
      ? await listMine({ token: inputs.token?.() ?? "", paginationOpts })
      : await (await ticketingServerRead()).orderListMine({ data: { paginationOpts } })
    if (revision !== listRevision || authenticationKey !== activeAuthenticationKey) return

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
    if (!activeAuthentication) return
    void pageLoad(null, revision, activeAuthentication, activeAuthenticationKey)
  }

  const loadMore = () => {
    if (!activeAuthentication || isLoading.get() || isDone.get()) return
    void pageLoad(cursor.get(), listRevision, activeAuthentication, activeAuthenticationKey)
  }

  const retryList = () => {
    if (orders.get().length === 0) {
      reset()
      return
    }
    loadMore()
  }

  const selectOrder = async (orderId: string) => {
    if (!activeAuthentication) return
    detailRevision += 1
    const revision = detailRevision
    selectedOrderId.set(orderId)
    selectedOrder.set(null)
    detailError.set("")
    isDetailLoading.set(true)
    const result = getOrder
      ? await getOrder({ orderId, token: inputs.token?.() ?? "" })
      : await (await ticketingServerRead()).orderGet({ data: { orderId } })
    if (
      revision !== detailRevision ||
      authenticationStateRead() !== activeAuthentication ||
      authenticationKeyRead() !== activeAuthenticationKey ||
      selectedOrderId.get() !== orderId
    )
      return

    isDetailLoading.set(false)
    if (!result.success) {
      detailError.set(result.errorMessage)
      return
    }
    selectedOrder.set(result.data)
  }

  const sessionSync = () => {
    if (inputs.ready && !inputs.ready()) return
    const authenticated = inputs.authenticated ? inputs.authenticated() : Boolean(inputs.token?.())
    const authenticationKey = authenticationKeyRead()
    if (authenticated === activeAuthentication && authenticationKey === activeAuthenticationKey) return
    activeAuthentication = authenticated
    activeAuthenticationKey = authenticationKey
    isAuthenticated.set(authenticated)
    reset()
  }

  const authenticationStateRead = () => (inputs.authenticated ? inputs.authenticated() : Boolean(inputs.token?.()))
  const authenticationKeyRead = () => inputs.authenticationKey?.() ?? inputs.token?.() ?? ""

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
