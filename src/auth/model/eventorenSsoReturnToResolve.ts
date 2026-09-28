/** Normalizes return destination ensuring it never loops back to /sso and stays on the app host. */
export function eventorenSsoReturnToResolve(rawReturnTo?: string | null): string {
  if (!rawReturnTo) return "/admin"
  const trimmed = rawReturnTo.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return "/admin"
  }

  for (const character of trimmed) {
    const code = character.codePointAt(0) ?? 0
    if (code <= 31 || code === 127) return "/admin"
  }

  try {
    const parsed = new URL(trimmed, "https://eventoren.example.invalid")
    if (parsed.pathname === "/sso" || parsed.pathname.startsWith("/sso/")) {
      return "/admin"
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return "/admin"
  }
}
