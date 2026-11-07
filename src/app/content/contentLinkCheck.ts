import type { ContentIssue } from "./ContentIssue.ts"
import type { ContentLinkTargets } from "./ContentLinkTargets.ts"

const fixedPaths = new Set(["/", "/kontakt", "/ratgeber", "/en/guides"])
const forbiddenPathPattern = /^\/(?:veranstalter|demo|abiball-2027)(?:[/\-?#]|$)/u
const ownOriginPattern = /^https?:\/\/(?:www\.)?eventoren\.de(?=[/?#]|$)/iu

/**
 * Validate one Markdown link target. Internal links may only point to `/`, `/kontakt`, the hubs
 * or known article paths. Planned-but-unwritten articles are warnings, unknown paths errors.
 */
export function contentLinkCheck(href: string, targets: ContentLinkTargets): ContentIssue | undefined {
  const target = href.trim()
  if (target === "") return { level: "error", message: "empty link target" }
  if (target.startsWith("#") || /^(?:mailto|tel):/iu.test(target)) return undefined

  const ownOrigin = ownOriginPattern.exec(target)
  if (ownOrigin === null && /^[a-z][a-z0-9+.-]*:/iu.test(target)) {
    if (/^https:\/\//iu.test(target)) return undefined
    return { level: "warning", message: `external link should use https: ${target}` }
  }

  const relative = ownOrigin === null ? target : target.slice(ownOrigin[0].length) || "/"
  if (!relative.startsWith("/")) return { level: "error", message: `relative link must start with "/": ${target}` }
  const path = (relative.split(/[?#]/u)[0] ?? "/").replace(/(.)\/+$/u, "$1")

  if (forbiddenPathPattern.test(path)) return { level: "error", message: `link to a forbidden path: ${target}` }
  if (fixedPaths.has(path) || targets.existing.has(path)) return undefined
  if (targets.planned.has(path))
    return { level: "warning", message: `link to a planned article that does not exist yet: ${target}` }
  return { level: "error", message: `link to an unknown internal path: ${target}` }
}
