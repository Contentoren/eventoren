const ownHosts = new Set(["eventoren.de", "www.eventoren.de"])

/** True for absolute http(s) links to a host other than eventoren.de. */
export function contentLinkExternalIs(href: string): boolean {
  if (!/^https?:\/\//iu.test(href)) return false
  try {
    return !ownHosts.has(new URL(href).hostname.toLowerCase())
  } catch {
    return false
  }
}
