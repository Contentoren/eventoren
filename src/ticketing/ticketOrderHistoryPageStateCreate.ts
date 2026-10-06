import { createEffect, onMount, useContext } from "solid-js"
import { api } from "#convex/_generated/api.js"
import type { FunctionReference, PaginationOptions } from "convex/server"
import type { Result } from "#result"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import { queryPaginatedCreate } from "#src/utils/convex_client/queryPaginatedCreate.ts"
import { eventorenAuthContext } from "#src/auth/ui/eventorenAuthContext.ts"
import type { TicketOrderProjection } from "./TicketOrderProjection.ts"
import type { TicketOrderListPage } from "./TicketOrderListPage.ts"
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
  readonly useNativeQueries?: boolean
}) {
  const listMine = inputs.listMine
  const getOrder = inputs.getOrder
  const auth = useContext(eventorenAuthContext)
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
  let detailAuthenticationKey = ""
  const isAuthenticated = createSignalObject(false)
  const nativeList = queryPaginatedCreate(
    api.ticketing.ticketOrderListMinePaginatedQuery as TicketOrderHistoryPageQuery,
    () => (isAuthenticated.get() ? {} : undefined),
    { pageSize },
  )
  const nativeDetailArgs = createSignalObject<
    { readonly orderId: import("#convex/_generated/dataModel.js").Id<"ticketOrders"> } | undefined
  >(undefined)
  const nativeDetailResult = queryCreate(
    api.ticketing.ticketOrderGetQuery as TicketOrderDetailsQuery,
    nativeDetailArgs.get,
  )

  const detailReset = () => {
    detailRevision += 1
    nativeDetailArgs.set(undefined)
    detailAuthenticationKey = ""
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
    if (inputs.useNativeQueries) {
      nativeList.loadMore()
      return
    }
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

  createEffect(() => {
    if (!inputs.useNativeQueries) return
    const result = nativeList.result()
    if (!result) {
      isLoading.set(nativeList.isLoading())
      return
    }
    if ("success" in result && !result.success) {
      isLoading.set(false)
      listError.set(result.errorMessage)
      return
    }
    if (!("success" in result) || !result.success) return
    orders.set(result.data)
    isDone.set(nativeList.isDone())
    isLoading.set(nativeList.isLoading())
  })

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
    if (inputs.useNativeQueries) {
      detailAuthenticationKey = activeAuthenticationKey
      nativeDetailArgs.set({ orderId: orderId as import("#convex/_generated/dataModel.js").Id<"ticketOrders"> })
      return
    }
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

  createEffect(() => {
    if (!inputs.useNativeQueries) return
    const result = nativeDetailResult()
    const orderId = selectedOrderId.get()
    const queryArgs = nativeDetailArgs.get()
    if (
      !result ||
      !orderId ||
      !queryArgs ||
      queryArgs.orderId !== orderId ||
      detailAuthenticationKey !== activeAuthenticationKey
    )
      return
    if ("success" in result && !result.success) {
      isDetailLoading.set(false)
      detailError.set(result.errorMessage)
      return
    }
    if (!("success" in result) || !result.success) return
    isDetailLoading.set(false)
    if (!result.data) {
      detailError.set("Bestellung konnte nicht geladen werden.")
      return
    }
    if (result.data.id !== orderId) return
    selectedOrder.set(result.data)
  })

  const sessionSync = () => {
    if (!inputs.useNativeQueries && inputs.ready && !inputs.ready()) return
    const authenticated = inputs.authenticated
      ? inputs.authenticated()
      : inputs.useNativeQueries
        ? Boolean(auth.token())
        : Boolean(inputs.token?.())
    const authenticationKey = authenticationKeyRead()
    if (authenticated === activeAuthentication && authenticationKey === activeAuthenticationKey) return
    activeAuthentication = authenticated
    activeAuthenticationKey = authenticationKey
    isAuthenticated.set(authenticated)
    reset()
  }

  const authenticationStateRead = () => (inputs.authenticated ? inputs.authenticated() : Boolean(inputs.token?.()))
  const authenticationKeyRead = () =>
    inputs.authenticationKey?.() ?? (inputs.useNativeQueries ? (auth.token() ?? "") : (inputs.token?.() ?? ""))

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

type TicketOrderHistoryPageQuery = FunctionReference<
  "query",
  "public",
  { readonly token: string; readonly paginationOpts: PaginationOptions },
  Result<TicketOrderListPage>
>
type TicketOrderDetailsQuery = FunctionReference<
  "query",
  "public",
  { readonly token: string; readonly orderId: import("#convex/_generated/dataModel.js").Id<"ticketOrders"> },
  Result<TicketOrderProjection | null>
>
