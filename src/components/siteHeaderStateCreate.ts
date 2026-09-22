import { useLocation } from "@tanstack/solid-router"
import type { Accessor } from "solid-js"
import { createEffect, createMemo, on, onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import type { Language } from "../app/i18n/language.ts"
import { languageDefault } from "../app/i18n/language.ts"
import type { UserRole } from "../auth/model_field/userRole.ts"
import { eventorenAuthContextUse } from "../auth/ui/eventorenAuthContextUse.ts"
import type { TicketCartDraft } from "../ticketing/TicketCartDraft.ts"
import { ticketCartDraftEventName } from "../ticketing/ticketCartDraftEventName.ts"
import { ticketCartDraftLoad } from "../ticketing/ticketCartDraftLoad.ts"
import { ticketCartDraftTotalQuantity } from "../ticketing/ticketCartDraftTotalQuantity.ts"
import type { SiteHeaderNavLink } from "./SiteHeaderNavLink.ts"
import type { SiteHeaderOverlay } from "./SiteHeaderOverlay.ts"
import { siteHeaderNavLinks } from "./siteHeaderNavLinks.ts"

export function siteHeaderStateCreate(
  inputs: {
    readonly session?: { readonly role?: UserRole } | Accessor<{ readonly role?: UserRole } | undefined>
    readonly language?: Language
    readonly cartQuantity?: Accessor<number>
    readonly navLinkIsActive?: (link: SiteHeaderNavLink, href: string, pathname: string) => boolean
    readonly cartIsActive?: (href: string, pathname: string) => boolean
  } = {},
) {
  const location = useLocation()
  const auth = eventorenAuthContextUse()
  const hasInjectedSession = inputs.session !== undefined
  const injectedSessionRole = () =>
    typeof inputs.session === "function" ? inputs.session()?.role : inputs.session?.role
  const overlay = createSignalObject<SiteHeaderOverlay>("none")
  const menuOpen = createSignalObject(false)
  const cart = createSignalObject<TicketCartDraft>([])
  const sessionHydrated = createSignalObject(hasInjectedSession || auth.ready())

  const syncCart = () => {
    cart.set(ticketCartDraftLoad())
  }

  onMount(() => {
    if (!hasInjectedSession) sessionHydrated.set(true)

    if (typeof window === "undefined") return

    syncCart()
    window.addEventListener(ticketCartDraftEventName, syncCart)
    window.addEventListener("storage", syncCart)

    onCleanup(() => {
      window.removeEventListener(ticketCartDraftEventName, syncCart)
      window.removeEventListener("storage", syncCart)
    })
  })

  createEffect(
    on(location, () => {
      if (typeof window !== "undefined") syncCart()
    }),
  )

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
        inputs.language ?? languageDefault,
        hasInjectedSession ? injectedSessionRole() : auth.identity()?.role,
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
