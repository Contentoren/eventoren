type RootFooterMatch = {
  readonly routeId: string
  readonly status: string
  readonly _notFound?: boolean
}

const siteFrameRouteIds = new Set([
  "/",
  "/agb",
  "/checkout",
  "/kontakt",
  "/warenkorb",
  "/events/$eventId",
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
  "/demo/contact",
  "/demo/contact-submitted",
  "/demo/organizer",
  "/demo/organizer-empty",
  "/demo/organizer_/event/$eventId",
  "/demo/agb",
  "/demo/navigation",
])

export function rootFooterShouldRender(matches: readonly RootFooterMatch[]) {
  return !matches.some(
    (match) => siteFrameRouteIds.has(match.routeId) || match.status === "notFound" || match._notFound === true,
  )
}
