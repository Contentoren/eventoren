type RootFooterMatch = {
  readonly routeId: string
  readonly status: string
  readonly _notFound?: boolean
}

const siteFrameRouteIds = new Set(["/", "/agb", "/checkout", "/kontakt", "/warenkorb", "/events/$eventId"])

export function rootFooterShouldRender(matches: readonly RootFooterMatch[]) {
  return !matches.some(
    (match) => siteFrameRouteIds.has(match.routeId) || match.status === "notFound" || match._notFound === true,
  )
}
