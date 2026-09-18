import type { UserRole } from "../../auth/model_field/userRole.ts"
import type { SiteHeaderNavLink } from "../../components/SiteHeaderNavLink.ts"
import { ticketCartDraftTotalQuantity } from "../../ticketing/ticketCartDraftTotalQuantity.ts"
import { demoCartStore } from "./demoCartStore.ts"

export function demoSiteFrameStateCreate(inputs: {
  sessionRole?: UserRole | (() => UserRole | undefined)
  cartQuantity?: () => number
}) {
  const cartQuantity = inputs.cartQuantity ?? (() => ticketCartDraftTotalQuantity(demoCartStore.draft()))

  return {
    header: {
      session: () => ({ role: typeof inputs.sessionRole === "function" ? inputs.sessionRole() : inputs.sessionRole }),
      language: "de" as const,
      navLinkHref: demoSiteNavHref,
      logoHref: "/demo/events",
      cartHref: "/demo/cart",
      checkoutHref: "/demo/checkout",
      cartQuantity,
      navLinkIsActive: demoSiteNavIsActive,
      cartIsActive: demoSiteCartIsActive,
    },
    footerLinkHref: demoSiteFooterHref,
  }
}

function demoSiteNavHref(link: SiteHeaderNavLink) {
  if (link.to === "/organizer") return "/demo/organizer"
  if (link.to === "/admin") return "/demo/admin"
  return "/demo/events"
}

function demoSiteFooterHref(href: string) {
  if (href === "/agb") return "/demo/agb"
  if (href === "/kontakt") return "/demo/contact"
  return `/demo${href}`
}

function demoSiteNavIsActive(link: SiteHeaderNavLink, _href: string, pathname: string) {
  if (link.to === "/organizer") {
    return (
      pathname === "/demo/organizer" || pathname === "/demo/organizer-empty" || pathname.startsWith("/demo/organizer/")
    )
  }
  if (link.to === "/admin") return pathname === "/demo/admin"
  return (
    pathname === "/demo/events" ||
    pathname === "/demo/events-empty" ||
    pathname === "/demo/events-error" ||
    pathname === "/demo/events-booking-success"
  )
}

function demoSiteCartIsActive(_href: string, pathname: string) {
  return pathname === "/demo/cart" || pathname === "/demo/cart-empty"
}
