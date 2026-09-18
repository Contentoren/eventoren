import { useNavigate } from "@tanstack/solid-router"
import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { TicketOrderProjection } from "./TicketOrderProjection.ts"
import { ticketCheckoutText } from "./ticketCheckoutText.ts"
import { ticketOrderAccessStorageUpsert } from "./ticketOrderAccessStorageUpsert.ts"
import { ticketOrderByAccessTokenGet } from "./ticketOrderByAccessTokenGet.ts"
import { ticketOrderEmailAccessModeDetect } from "./ticketOrderEmailAccessModeDetect.ts"
import { ticketOrderEmailAccessModeStateCreate } from "./ticketOrderEmailAccessModeStateCreate.ts"
import { ticketOrderEmailAccessTokenParse } from "./ticketOrderEmailAccessTokenParse.ts"

export function ticketOrderEmailAccessPageStateCreate() {
  const navigate = useNavigate()
  const modeState = ticketOrderEmailAccessModeStateCreate()
  const isLoading = createSignalObject(true)
  const isRefreshing = createSignalObject(false)
  const errorMessage = createSignalObject("")
  const orders = createSignalObject<readonly TicketOrderProjection[]>([])
  let accessToken = ""

  const refresh = async () => {
    if (!accessToken || isRefreshing.get()) return
    isRefreshing.set(true)
    const loaded = await ticketOrderByAccessTokenGet(accessToken)
    if (!loaded.success) {
      errorMessage.set(loaded.errorMessage)
      isLoading.set(false)
      isRefreshing.set(false)
      return
    }
    const stored = ticketOrderAccessStorageUpsert({
      orderId: loaded.data.id,
      checkoutKey: loaded.data.checkoutKey,
      guestAccessToken: accessToken,
    })
    if (!stored.success) {
      errorMessage.set(stored.errorMessage)
      isLoading.set(false)
      isRefreshing.set(false)
      return
    }
    orders.set([loaded.data])
    errorMessage.set("")
    isLoading.set(false)
    isRefreshing.set(false)
    const cleanUrl = new URL(window.location.href)
    cleanUrl.hash = ""
    cleanUrl.search = ""
    cleanUrl.searchParams.set("orders", loaded.data.id)
    window.history.replaceState(null, document.title, `${cleanUrl.pathname}${cleanUrl.search}`)
  }

  onMount(() => {
    const accessHash = window.location.hash
    modeState.initialize(accessHash)
    if (!modeState.isActive()) return
    ticketOrderEmailAccessHashClear()
    const parsed = ticketOrderEmailAccessTokenParse(accessHash)
    if (!parsed.success) {
      errorMessage.set(ticketCheckoutText().ticketAccessInvalid)
      isLoading.set(false)
      return
    }
    accessToken = parsed.data
    void refresh()
  })

  return {
    isActive: modeState.isActive,
    isLoading: isLoading.get,
    isRefreshing: isRefreshing.get,
    errorMessage: errorMessage.get,
    orders: orders.get,
    refresh,
    goToEvents: () => navigate({ to: "/" }),
  }
}

function ticketOrderEmailAccessHashClear(): void {
  if (!ticketOrderEmailAccessModeDetect(window.location.hash)) return
  window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`)
}
