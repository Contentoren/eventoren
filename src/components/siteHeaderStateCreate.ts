import { createMemo, createSignal, onCleanup, onMount } from "solid-js"
import type { SiteLocale } from "../locale/SiteLocale.ts"
import { siteLocaleDefault } from "../locale/siteLocaleDefault.ts"
import { siteLocaleLoad } from "../locale/siteLocaleLoad.ts"
import { siteLocaleOptions } from "../locale/siteLocaleOptions.ts"
import { siteLocaleSave } from "../locale/siteLocaleSave.ts"
import { siteLocaleShortLabel } from "../locale/siteLocaleShortLabel.ts"
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
  const [mobileLocaleOpen, setMobileLocaleOpen] = createSignal(false)
  const [locale, setLocale] = createSignal<SiteLocale>(siteLocaleDefault)
  const [cart, setCart] = createSignal<TicketCart>(ticketCartEmpty(""))

  const syncCart = () => {
    setCart(ticketCartDraftLoad())
  }

  onMount(() => {
    setLocale(siteLocaleLoad())
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

  const localeLabel = createMemo(() => siteLocaleShortLabel(locale()))

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
    setMobileLocaleOpen(false)
  }

  const toggleOverlay = (next: SiteHeaderOverlay) => setOverlay((current) => (current === next ? "none" : next))

  const openLocalePicker = () => toggleOverlay("locale")
  const openAuth = () => setOverlay("auth")
  const openMenu = () => {
    setOverlay("none")
    setMobileLocaleOpen(false)
    setMenuOpen(true)
  }

  const closeMobileLocalePicker = () => setMobileLocaleOpen(false)
  const toggleMobileLocalePicker = () => setMobileLocaleOpen((current) => !current)

  const selectLocale = (next: SiteLocale) => {
    setLocale(next)
    siteLocaleSave(next)
    closeOverlay()
  }

  return {
    navLinks: () => siteHeaderNavLinks,
    localeOptions: () => siteLocaleOptions,
    locale,
    localeLabel,
    cartQuantity,
    cartLabel,
    cartHasItems,
    isLocaleOpen: () => overlay() === "locale",
    isAuthOpen: () => overlay() === "auth",
    isMenuOpen: menuOpen,
    isMobileLocaleOpen: mobileLocaleOpen,
    closeOverlay,
    openLocalePicker,
    openAuth,
    openMenu,
    closeMobileLocalePicker,
    toggleMobileLocalePicker,
    selectLocale,
  }
}
