import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { ticketPriceFormat } from "../ticketing/ticketPriceFormat.ts"
import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"
import type { AdminTicketOrderDetails } from "./AdminTicketOrderDetails.ts"
import type { adminTicketOrdersList } from "./adminTicketOrdersList.ts"

const pageSize = 50
const dateFormatter = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" })

export function adminTicketOrdersPageStateCreate(
  inputs: { readonly list?: AdminTicketOrdersList; readonly getDetails?: AdminTicketOrderDetailsGet } = {},
) {
  const list = inputs.list
  const orders = createSignalObject<readonly AdminTicketOrderSummary[]>([])
  const cursor = createSignalObject<string | null>(null)
  const isDone = createSignalObject(false)
  const isLoading = createSignalObject(false)
  const errorMessage = createSignalObject("")
  const details = createSignalObject<AdminTicketOrderDetails | null>(null)
  const selectedOrderId = createSignalObject<string | null>(null)
  const detailsError = createSignalObject("")
  const detailsLoading = createSignalObject(false)
  let detailRequest = 0

  const pageLoad = async () => {
    if (!list) return errorMessage.set("Die Admin-Sitzung ist nicht verfügbar.")
    if (isLoading.get() || isDone.get()) return
    isLoading.set(true)
    errorMessage.set("")
    const result = await list({ paginationOpts: { cursor: cursor.get(), numItems: pageSize } })
    isLoading.set(false)
    if (!result.success) return errorMessage.set(result.errorMessage)
    const knownIds = new Set(orders.get().map((order) => order.id))
    orders.set([...orders.get(), ...result.data.page.filter((order) => !knownIds.has(order.id))])
    cursor.set(result.data.continueCursor)
    isDone.set(result.data.isDone)
  }

  const reload = () => {
    orders.set([])
    cursor.set(null)
    isDone.set(false)
    isLoading.set(false)
    errorMessage.set("")
    void pageLoad()
  }

  const orderOpen = async (orderId: string) => {
    const request = ++detailRequest
    selectedOrderId.set(orderId)
    details.set(null)
    detailsError.set("")
    detailsLoading.set(true)
    const result = inputs.getDetails ? await inputs.getDetails({ orderId }) : null
    if (request !== detailRequest) return
    detailsLoading.set(false)
    if (!result) return detailsError.set("Bestelldetails sind nicht verfügbar.")
    if (!result.success) return detailsError.set(result.errorMessage)
    details.set(result.data)
  }

  const orderClose = () => {
    detailRequest++
    selectedOrderId.set(null)
    details.set(null)
    detailsError.set("")
    detailsLoading.set(false)
  }

  onMount(() => {
    reload()
  })

  return {
    customerName: (order: AdminTicketOrderSummary) =>
      [order.customerGivenName, order.customerFamilyName].filter(Boolean).join(" ") || "Ohne Namen",
    dateFormat: (value: string) => dateFormatter.format(new Date(value)),
    errorMessage: errorMessage.get,
    isDone: isDone.get,
    isLoading: isLoading.get,
    loadMore: pageLoad,
    orders: orders.get,
    paymentLabel: (status: AdminTicketOrderSummary["paymentStatus"]) =>
      ({ pending: "Offen", paid: "Bezahlt", failed: "Fehlgeschlagen", expired: "Abgelaufen" })[status],
    paymentTone: (status: AdminTicketOrderSummary["paymentStatus"]) =>
      status === "paid" ? ("success" as const) : status === "pending" ? ("warning" as const) : ("danger" as const),
    priceFormat: ticketPriceFormat,
    reload,
    details: details.get,
    selectedOrderId: selectedOrderId.get,
    detailsError: detailsError.get,
    detailsLoading: detailsLoading.get,
    orderOpen,
    orderClose,
  }
}

type AdminTicketOrdersList = (input: {
  readonly paginationOpts: Parameters<typeof adminTicketOrdersList>[0]["paginationOpts"]
}) => ReturnType<typeof adminTicketOrdersList>

type AdminTicketOrderDetailsGet = (input: {
  readonly orderId: string
}) => Promise<
  | { readonly success: true; readonly data: AdminTicketOrderDetails }
  | { readonly success: false; readonly errorMessage: string }
>
