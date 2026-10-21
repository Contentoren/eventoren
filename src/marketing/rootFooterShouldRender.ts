type RootFooterMatch = {
  readonly routeId: string
  readonly status: string
  readonly _notFound?: boolean
}

const siteFrameRouteIds = new Set([
  "/",
  "/agb",
  "/checkout",
  "/datenschutz",
  "/kontakt",
  "/support",
  "/warenkorb",
  "/events/$eventId",
  "/impressum",
  "/admin",
  "/sign-in",
  "/organizer",
  "/organizer_/event/$eventId",
  "/demo/events",
  "/demo/events-empty",
  "/demo/events-error",
  "/demo/events-booking-success",
  "/demo/events_/$eventId",
  "/demo/customer_/events",
  "/demo/customer_/events-empty",
  "/demo/customer_/events-error",
  "/demo/customer_/events-booking-success",
  "/demo/customer_/events_/$eventId",
  "/demo/customer_/cart",
  "/demo/customer_/cart-empty",
  "/demo/customer_/checkout",
  "/demo/customer_/checkout-empty",
  "/demo/customer_/checkout-error",
  "/demo/customer_/order-status",
  "/demo/customer_/order-status-pending",
  "/demo/customer_/order-status-error",
  "/demo/admin",
  "/demo/admin_/bestellungen",
  "/demo/admin_/events",
  "/demo/admin_/orders",
  "/demo/admin_/members",
  "/demo/admin_/organizers",
  "/demo/admin_/events_/new",
  "/demo/admin_/events-empty",
  "/demo/admin_/events-error",
  "/demo/admin_/events-unauthorized",
  "/demo/admin-new",
  "/demo/admin-empty",
  "/demo/admin-error",
  "/demo/admin-unauthorized",
  "/demo/contact",
  "/demo/contact-submitted",
  "/demo/navigation",
  "/demo/auth/sign-in",
  "/demo/auth/sign-in-error",
  "/demo/auth/otp",
  "/demo/auth/otp-error",
  "/demo/orders",
  "/demo/orders-empty",
  "/demo/orders-error",
  "/demo/orders-signed-out",
  "/demo/customer_/orders",
  "/demo/customer_/orders-empty",
  "/demo/customer_/orders-error",
  "/demo/customer_/orders-signed-out",
  "/demo/organizer",
  "/demo/organizer-empty",
  "/demo/organizer_/event/$eventId",
  "/demo/admin_/organizer",
  "/demo/admin_/organizer-empty",
  "/demo/admin_/organizer_/event/$eventId",
  "/demo/ratgeber",
  "/demo/ratgeber/$slug",
  "/demo/impressum",
  "/demo/datenschutz",
  "/demo/privacy",
  "/demo/agb",
  "/demo/terms",
  "/demo/abiball-2027",
])

// Every page under the /demo layout renders inside the DemoRouteShell
// SiteFrame (except the /demo directory itself, which uses DemoShell, and
// fullscreen demo routes, which hide the root footer by pathname in
// rootFooterStateCreate). Suppress the root footer for any nested demo
// route id so new demo pages do not need to be enumerated here.
function rootFooterIsSiteFrameRoute(routeId: string) {
  // The live organizer dashboard owns its full-screen application frame.
  if (routeId === "/veranstalter" || routeId.startsWith("/veranstalter/") || routeId.startsWith("/veranstalter_/"))
    return true
  if (siteFrameRouteIds.has(routeId)) return true
  return routeId.startsWith("/demo/") && routeId !== "/demo/"
}

export function rootFooterShouldRender(matches: readonly RootFooterMatch[]) {
  return !matches.some(
    (match) => rootFooterIsSiteFrameRoute(match.routeId) || match.status === "notFound" || match._notFound === true,
  )
}
