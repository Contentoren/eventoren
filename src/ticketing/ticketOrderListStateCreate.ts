import { createMemo, createSignal, onMount } from "solid-js"
import type { TicketOrder } from "./TicketOrder.ts"
import { ticketStorageLoad } from "./ticketStorageLoad.ts"

export function ticketOrderListStateCreate() {
  const [orders, setOrders] = createSignal<readonly TicketOrder[]>([])
  const [errorMessage, setErrorMessage] = createSignal("")
  const [isLoaded, setIsLoaded] = createSignal(false)

  onMount(() => {
    const loaded = ticketStorageLoad()
    if (!loaded.success) setErrorMessage(loaded.errorMessage)
    else setOrders(loaded.data)
    setIsLoaded(true)
  })

  const sortedOrders = createMemo(() => [...orders()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)))

  const isEmpty = createMemo(() => isLoaded() && sortedOrders().length === 0)

  const countLabel = createMemo(() => {
    const count = sortedOrders().length
    return count === 1 ? "1 Bestellung" : `${count} Bestellungen`
  })

  return { orders: sortedOrders, errorMessage, isLoaded, isEmpty, countLabel }
}
