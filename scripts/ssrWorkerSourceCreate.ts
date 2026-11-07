export function ssrWorkerSourceCreate(options: { readonly convexUrl: string }): string {
  return `import server from "../server/server.js"


function runtimeEnvironmentApply(env) {
  if (typeof process === "undefined") return
  process.env ??= {}
  for (const [key, value] of Object.entries(env ?? {})) {
    if (typeof value === "string") process.env[key] = value
  }
}


function convexUrlResolve(env) {
  return [
    env?.CONVEX_URL,
    env?.PUBLIC_BASE_URL_CONVEX,
    env?.VITE_CONVEX_URL,
    env?.CONVEX_SELF_HOSTED_URL,
    ${JSON.stringify(options.convexUrl)},
  ].find((value) => typeof value === "string" && value.length > 0)
}


// Legacy URLs that search engines already indexed; each maps to its current canonical path.
const legacyPathRedirects = {
  "/datenschutzerklaerung": "/datenschutz",
  "/datenschutzerklaerung/": "/datenschutz",
  "/impressum/": "/impressum",
}


function legacyPathRedirectResolve(hostname, pathname) {
  if (hostname !== "eventoren.de" && hostname !== "www.eventoren.de") return null
  return legacyPathRedirects[pathname] ?? null
}


// Only these two hosts serve the canonical production site. Pages branch,
// per-deployment and alias hosts serve the same content and must not compete
// with it in search results.
const canonicalProductionHostnames = ["eventoren.de", "www.eventoren.de"]


function hostnameIsCanonicalProduction(hostname) {
  return canonicalProductionHostnames.includes(hostname)
}


// Copies response headers into a fresh list without mutating the source,
// because some runtime responses expose immutable header lists.
function responseHeadersClone(headers) {
  const clone = new Headers()
  for (const [name, value] of headers) {
    if (name.toLowerCase() === "set-cookie") continue
    clone.append(name, value)
  }
  const setCookieValues = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : []
  if (setCookieValues.length > 0) {
    for (const value of setCookieValues) clone.append("set-cookie", value)
    return clone
  }
  const combinedSetCookie = headers.get("set-cookie")
  if (combinedSetCookie !== null) clone.append("set-cookie", combinedSetCookie)
  return clone
}


// Marks noncanonical host responses as noindex while keeping status, status
// text, body, cache headers, cookies and location untouched.
function responseNoindexApply(response, hostname) {
  if (hostnameIsCanonicalProduction(hostname)) return response
  if (response.status < 200 || response.status > 599) return response
  const headers = responseHeadersClone(response.headers)
  headers.set("X-Robots-Tag", "noindex")
  const body = response.status === 204 || response.status === 205 || response.status === 304 ? null : response.body
  return new Response(body, { status: response.status, statusText: response.statusText, headers })
}


// Ratgeber/Guides hubs and articles are prerendered into dist/client as
// ratgeber.html and ratgeber/<slug>.html. Pages asset serving answers the
// extensionless canonical URL with that file, so these paths try the static
// asset first (200, or 304 for a revalidation) and fall back to SSR otherwise,
// e.g. for an article published after the build or a redirect for "/x.html".
const staticContentPathBases = ["/ratgeber", "/en/guides"]


function pathnameIsStaticContent(pathname) {
  return staticContentPathBases.some((base) => pathname === base || pathname.startsWith(base + "/"))
}


export default {
  async fetch(request, env) {
    runtimeEnvironmentApply(env)
    const requestUrl = new URL(request.url)

    const legacyPath = legacyPathRedirectResolve(requestUrl.hostname, requestUrl.pathname)
    if (legacyPath !== null) {
      const targetUrl = new URL("https://eventoren.de" + legacyPath)
      targetUrl.search = requestUrl.search
      return new Response(null, { status: 301, headers: { location: targetUrl.toString() } })
    }

    if (requestUrl.hostname === "www.eventoren.de") {
      requestUrl.protocol = "https:"
      requestUrl.hostname = "eventoren.de"
      requestUrl.port = ""
      return new Response(null, { status: 301, headers: { location: requestUrl.toString() } })
    }

    if (requestUrl.pathname === "/.well-known/ai-catalog.json") {
      return responseNoindexApply(await env.ASSETS.fetch(request), requestUrl.hostname)
    }

    if (pathnameIsStaticContent(requestUrl.pathname) && (request.method === "GET" || request.method === "HEAD")) {
      const assetResponse = await env.ASSETS.fetch(request)
      if (assetResponse.status === 200 || assetResponse.status === 304) return responseNoindexApply(assetResponse, requestUrl.hostname)
    }

    const response = await server.fetch(request, { context: { convexUrl: convexUrlResolve(env) } })
    if (response.status !== 404) return responseNoindexApply(response, requestUrl.hostname)
    return responseNoindexApply(await env.ASSETS.fetch(request), requestUrl.hostname)
  },
}
`
}
