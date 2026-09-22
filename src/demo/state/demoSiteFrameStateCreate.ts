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
      logoHref: "/demo/customer/events",
      cartHref: "/demo/customer/cart",
      checkoutHref: "/demo/customer/checkout",
      cartQuantity,
      navLinkIsActive: demoSiteNavIsActive,
      cartIsActive: demoSiteCartIsActive,
    },
    footerLinkHref: demoSiteFooterHref,
  }
}

function demoSiteNavHref(link: SiteHeaderNavLink) {
  if (link.to === "/organizer") return "/demo/admin/organizer"
  if (link.to === "/admin") return "/demo/admin/events"
  return "/demo/customer/events"
}

function demoSiteFooterHref(href: string) {
  if (href === "/agb") return "/demo/agb"
  if (href === "/kontakt") return "/demo/contact"
  return `/demo${href}`
}

function demoSiteNavIsActive(link: SiteHeaderNavLink, _href: string, pathname: string) {
  if (link.to === "/organizer") {
    return (
      pathname === "/demo/admin/organizer" ||
      pathname === "/demo/admin/organizer-empty" ||
      pathname.startsWith("/demo/admin/organizer/")
    )
  }
  if (link.to === "/admin") return pathname.startsWith("/demo/admin")
  return (
    pathname === "/demo/customer/events" ||
    pathname === "/demo/customer/events-empty" ||
    pathname === "/demo/customer/events-error" ||
    pathname === "/demo/customer/events-booking-success" ||
    pathname.startsWith("/demo/customer/events/")
  )
}

function demoSiteCartIsActive(_href: string, pathname: string) {
  return pathname === "/demo/customer/cart" || pathname === "/demo/customer/cart-empty"
}
