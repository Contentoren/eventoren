import { createMemo, createSignal, onCleanup, onMount } from "solid-js"
import type { TicketCart } from "../ticketing/TicketCart.ts"
import { ticketCartDraftEventName } from "../ticketing/ticketCartDraftEventName.ts"
import { ticketCartDraftLoad } from "../ticketing/ticketCartDraftLoad.ts"
import { ticketCartEmpty } from "../ticketing/ticketCartEmpty.ts"
import { ticketCartQuantityTotal } from "../ticketing/ticketCartQuantityTotal.ts"
import type { SiteHeaderOverlay } from "./SiteHeaderOverlay.ts"
import { siteHeaderNavLinks } from "./siteHeaderNavLinks.ts"

export function siteHeaderStateCreate() {
  const [overlay, setOverlay] = createSignal<SiteHeaderOverlay>("none")
  const [menuOpen, setMenuOpen] = createSignal(false)
  const [cart, setCart] = createSignal<TicketCart>(ticketCartEmpty(""))

  const syncCart = () => {
    setCart(ticketCartDraftLoad())
  }

  onMount(() => {
    syncCart()

    if (typeof window === "undefined") return

    window.addEventListener(ticketCartDraftEventName, syncCart)
    window.addEventListener("storage", syncCart)

    onCleanup(() => {
      window.removeEventListener(ticketCartDraftEventName, syncCart)
      window.removeEventListener("storage", syncCart)
    })
  })

  const cartQuantity = createMemo(() => ticketCartQuantityTotal(cart()))

  const cartLabel = createMemo(() => {
    const quantity = cartQuantity()
    if (quantity === 0) return "Warenkorb ist leer"
    if (quantity === 1) return "Warenkorb: 1 Ticket"

    return `Warenkorb: ${quantity} Tickets`
  })

  const cartHasItems = createMemo(() => cartQuantity() > 0)

  const closeOverlay = () => {
    setOverlay("none")
    setMenuOpen(false)
  }

  const toggleOverlay = (next: SiteHeaderOverlay) => setOverlay((current) => (current === next ? "none" : next))

  const openAuth = () => setOverlay("auth")
  const openMenu = () => {
    setOverlay("none")
    setMenuOpen(true)
  }

  return {
    navLinks: () => siteHeaderNavLinks,
    cartQuantity,
    cartLabel,
    cartHasItems,
    isAuthOpen: () => overlay() === "auth",
    isMenuOpen: menuOpen,
    closeOverlay,
    openAuth,
    openMenu,
  }
}
