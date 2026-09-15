import { createMemo, onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import { languageSignal } from "../app/i18n/languageSignal.ts"
import { userSessionBrowserRestore } from "../auth/ui/signals/userSessionBrowserRestore.ts"
import { userSessionSignal } from "../auth/ui/signals/userSessionSignal.ts"
import type { TicketCartDraft } from "../ticketing/TicketCartDraft.ts"
import { ticketCartDraftEventName } from "../ticketing/ticketCartDraftEventName.ts"
import { ticketCartDraftLoad } from "../ticketing/ticketCartDraftLoad.ts"
import { ticketCartDraftTotalQuantity } from "../ticketing/ticketCartDraftTotalQuantity.ts"
import type { SiteHeaderOverlay } from "./SiteHeaderOverlay.ts"
import { siteHeaderNavLinks } from "./siteHeaderNavLinks.ts"

export function siteHeaderStateCreate() {
  const overlay = createSignalObject<SiteHeaderOverlay>("none")
  const menuOpen = createSignalObject(false)
  const cart = createSignalObject<TicketCartDraft>([])
  const sessionHydrated = createSignalObject(false)

  const syncCart = () => {
    cart.set(ticketCartDraftLoad())
  }

  onMount(() => {
    userSessionBrowserRestore()
    sessionHydrated.set(true)
    syncCart()

    if (typeof window === "undefined") return

    window.addEventListener(ticketCartDraftEventName, syncCart)
    window.addEventListener("storage", syncCart)

    onCleanup(() => {
      window.removeEventListener(ticketCartDraftEventName, syncCart)
      window.removeEventListener("storage", syncCart)
    })
  })

  const cartQuantity = createMemo(() => ticketCartDraftTotalQuantity(cart.get()))

  const cartLabel = createMemo(() => {
    const quantity = cartQuantity()
    if (quantity === 0) return "Warenkorb ist leer"
    if (quantity === 1) return "Warenkorb: 1 Ticket"

    return `Warenkorb: ${quantity} Tickets`
  })

  const cartHasItems = createMemo(() => cartQuantity() > 0)

  const closeOverlay = () => {
    overlay.set("none")
    menuOpen.set(false)
  }

  const openMenu = () => {
    overlay.set("none")
    menuOpen.set(true)
  }

  return {
    navLinks: createMemo(() =>
      siteHeaderNavLinks(languageSignal.get(), userSessionSignal.get()?.profile.role, sessionHydrated.get()),
    ),
    cartQuantity,
    cartLabel,
    cartHasItems,
    isMenuOpen: menuOpen.get,
    closeOverlay,
    openMenu,
  }
}
