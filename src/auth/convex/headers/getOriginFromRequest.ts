export function getOriginFromRequest(req: Request): string | null {
  const origin = req.headers.get("origin")
  if (origin) {
    return origin
  }
  const xForwardedHost = req.headers.get("x-forwarded-host")
  if (xForwardedHost) {
    const proto = req.headers.get("x-forwarded-proto") || "https"
    return `${proto}://${xForwardedHost}`
  }
  const referer = req.headers.get("referer")
  if (referer) {
    return referer
  }
  return null
}
