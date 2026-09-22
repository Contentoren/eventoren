/** Normalizes return destination ensuring it never loops back to /sso and stays on the app host. */
export function eventorenSsoReturnToResolve(rawReturnTo?: string | null): string {
  if (!rawReturnTo) return "/"
  const trimmed = rawReturnTo.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return "/"
  }

  for (const character of trimmed) {
    const code = character.codePointAt(0) ?? 0
    if (code <= 31 || code === 127) return "/"
  }

  try {
    const parsed = new URL(trimmed, "https://eventoren.example.invalid")
    if (parsed.pathname === "/sso" || parsed.pathname.startsWith("/sso/")) {
      return "/"
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return "/"
  }
}
