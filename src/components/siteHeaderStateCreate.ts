import type { Accessor } from "solid-js"
import { createMemo, onCleanup, onMount } from "solid-js"
import { useLocation } from "@tanstack/solid-router"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import { languageSignal } from "../app/i18n/languageSignal.ts"
import type { UserRole } from "../auth/model_field/userRole.ts"
import { userSessionBrowserRestore } from "../auth/ui/signals/userSessionBrowserRestore.ts"
import { userSessionSignal } from "../auth/ui/signals/userSessionSignal.ts"
import type { TicketCartDraft } from "../ticketing/TicketCartDraft.ts"
import { ticketCartDraftEventName } from "../ticketing/ticketCartDraftEventName.ts"
import { ticketCartDraftLoad } from "../ticketing/ticketCartDraftLoad.ts"
import { ticketCartDraftTotalQuantity } from "../ticketing/ticketCartDraftTotalQuantity.ts"
import type { SiteHeaderOverlay } from "./SiteHeaderOverlay.ts"
import type { SiteHeaderNavLink } from "./SiteHeaderNavLink.ts"
import { siteHeaderNavLinks } from "./siteHeaderNavLinks.ts"

export function siteHeaderStateCreate(
  inputs: {
    readonly session?: { readonly role?: UserRole }
    readonly cartQuantity?: Accessor<number>
    readonly navLinkIsActive?: (link: SiteHeaderNavLink, href: string, pathname: string) => boolean
    readonly cartIsActive?: (href: string, pathname: string) => boolean
  } = {},
) {
  const location = useLocation()
  const hasInjectedSession = inputs.session !== undefined
  const overlay = createSignalObject<SiteHeaderOverlay>("none")
  const menuOpen = createSignalObject(false)
  const cart = createSignalObject<TicketCartDraft>([])
  const sessionHydrated = createSignalObject(hasInjectedSession)

  const syncCart = () => {
    cart.set(ticketCartDraftLoad())
  }

  onMount(() => {
    if (!hasInjectedSession) {
      userSessionBrowserRestore()
      sessionHydrated.set(true)
      syncCart()
    }

    if (hasInjectedSession || typeof window === "undefined") return

    window.addEventListener(ticketCartDraftEventName, syncCart)
    window.addEventListener("storage", syncCart)

    onCleanup(() => {
      window.removeEventListener(ticketCartDraftEventName, syncCart)
      window.removeEventListener("storage", syncCart)
    })
  })

  const cartQuantity = inputs.cartQuantity ?? createMemo(() => ticketCartDraftTotalQuantity(cart.get()))

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
      siteHeaderNavLinks(
        languageSignal.get(),
        hasInjectedSession ? inputs.session?.role : userSessionSignal.get()?.profile.role,
        sessionHydrated.get(),
      ),
    ),
    cartQuantity,
    cartLabel,
    cartHasItems,
    navLinkIsActive: (link: SiteHeaderNavLink, href: string) => {
      const pathname = href.split("?", 1)[0]
      if (inputs.navLinkIsActive) return inputs.navLinkIsActive(link, href, location().pathname)
      return link.exact
        ? location().pathname === pathname
        : location().pathname === pathname || location().pathname.startsWith(`${pathname}/`)
    },
    pathIsActive: (href: string) =>
      inputs.cartIsActive
        ? inputs.cartIsActive(href, location().pathname)
        : location().pathname === href.split("?", 1)[0],
    isMenuOpen: menuOpen.get,
    closeOverlay,
    openMenu,
  }
}
