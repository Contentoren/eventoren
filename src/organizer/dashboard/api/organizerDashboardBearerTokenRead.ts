/**
 * Strict Bearer parser (RFC 7235): the scheme match is case-insensitive,
 * surrounding whitespace is trimmed, and anything but exactly one
 * `scheme token` pair is rejected — including comma-joined multiple
 * credentials, a trailing third field, or an empty token. The body and the
 * query string are never consulted for credentials.
 */
export function organizerDashboardBearerTokenRead(authorization: string | undefined): string | undefined {
  if (authorization === undefined) return undefined
  const single = authorization.split(",")
  if (single.length !== 1) return undefined
  const parts = single[0]?.trim().split(/\s+/) ?? []
  if (parts.length !== 2) return undefined
  const [scheme, token] = parts as [string, string]
  if (scheme.toLowerCase() !== "bearer") return undefined
  if (token.length === 0) return undefined
  return token
}
