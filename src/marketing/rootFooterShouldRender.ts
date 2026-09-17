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
  "/warenkorb",
  "/events/$eventId",
  "/impressum",
  "/admin",
  "/sign-in",
  "/sign-in-enter-otp",
  "/organizer",
  "/organizer_/event/$eventId",
  "/demo/events",
  "/demo/events-empty",
  "/demo/events-error",
  "/demo/events-booking-success",
  "/demo/events/$eventId",
  "/demo/cart",
  "/demo/cart-empty",
  "/demo/checkout",
  "/demo/checkout-empty",
  "/demo/checkout-error",
  "/demo/order-status",
  "/demo/order-status-pending",
  "/demo/order-status-error",
  "/demo/admin",
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
  "/demo/organizer",
  "/demo/organizer-empty",
  "/demo/organizer_/event/$eventId",
  "/demo/ratgeber",
  "/demo/ratgeber/$slug",
  "/demo/impressum",
  "/demo/datenschutz",
  "/demo/privacy",
  "/demo/agb",
  "/demo/terms",
  "/demo/abiball-2027",
])

export function rootFooterShouldRender(matches: readonly RootFooterMatch[]) {
  return !matches.some(
    (match) => siteFrameRouteIds.has(match.routeId) || match.status === "notFound" || match._notFound === true,
  )
}
