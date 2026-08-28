import { getRouteApi } from "@tanstack/solid-router"
import { createMemo } from "solid-js"
import { eventFindById } from "../events/eventFindById.ts"
import { ticketCartSearchParse } from "./ticketCartSearchParse.ts"

const routeApi = getRouteApi("/checkout")

export function checkoutPageStateCreate() {
  const search = routeApi.useSearch()

  const found = createMemo(() => eventFindById(search().event ?? ""))

  const event = createMemo(() => {
    const result = found()
    if (!result.success) return null
    return result.data
  })

  const errorMessage = createMemo(() => {
    const result = found()
    if (result.success) return ""
    return "Für diese Bestellung wurde kein Event gefunden. Bitte wähle ein Event neu aus."
  })

  const cart = createMemo(() => ticketCartSearchParse(search().event ?? "", search().tickets ?? ""))

  return { event, cart, errorMessage }
}
