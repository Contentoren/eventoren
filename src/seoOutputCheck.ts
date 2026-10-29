import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { seoSiteUrl } from "./seo/seoSiteUrl.js"

type JsonObject = Record<string, unknown>

const recordIs = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const tags = (html: string, name: string) => html.match(new RegExp(`<${name}\\b[^>]*>`, "giu")) ?? []

function attr(tag: string, name: string): string | undefined {
  for (const match of tag.matchAll(/([\w:.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gu)) {
    if (match[1]?.toLowerCase() === name.toLowerCase())
      return (match[2] ?? match[3] ?? match[4] ?? "")
        .replaceAll("&amp;", "&")
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'")
  }
  return undefined
}

function routeOf(file: string): string {
  if (file === "index.html") return "/"
  return `/${file.replace(/(?:\/index)?\.html$/u, "")}`
}

/** Extract every fullPath from the generated TanStack route tree, `$param` segments stay wildcards. */
export function seoSsrRoutePatternsRead(routeTreeSource: string): string[] {
  const patterns = new Set<string>()
  for (const match of routeTreeSource.matchAll(/fullPath:\s*"([^"]+)"/gu)) {
    const fullPath = match[1] ?? ""
    if (fullPath.length > 0) patterns.add(fullPath)
  }
  return [...patterns]
}

/** True when a sitemap or link pathname is served by request-time SSR instead of prerendered HTML. */
export function seoSsrRouteMatches(patterns: readonly string[], pathname: string): boolean {
  const path = pathname.replace(/\/+$/u, "") || "/"
  return patterns.some((pattern) => {
    const normalized = pattern.replace(/\/+$/u, "") || "/"
    const patternSegments = normalized.split("/")
    const pathSegments = path.split("/")
    if (patternSegments.length !== pathSegments.length) return false
    return patternSegments.every((segment, index) => segment.startsWith("$") || segment === pathSegments[index])
  })
}

export async function seoOutputVerify(options?: {
  distClientDir?: string
  siteUrl?: string
  routeTreeSource?: string
}): Promise<{ failures: string[] }> {
  const dir = options?.distClientDir ?? join(process.cwd(), "dist", "client")
  const site = (options?.siteUrl ?? seoSiteUrl).replace(/\/+$/u, "")
  const origin = new URL(site).origin
  const failures: string[] = []
  const read = async (path: string) => {
    try {
      return await readFile(join(dir, path), "utf8")
    } catch {
      return undefined
    }
  }

  let routeTreeSource = options?.routeTreeSource
  if (routeTreeSource === undefined) {
    try {
      routeTreeSource = await readFile(join(process.cwd(), "src", "routeTree.gen.ts"), "utf8")
    } catch {
      routeTreeSource = ""
    }
  }
  const ssrPatterns = seoSsrRoutePatternsRead(routeTreeSource)
  if (ssrPatterns.length === 0) failures.push("src/routeTree.gen.ts: no routable fullPath entries found")

  async function filesIn(path: string): Promise<string[]> {
    try {
      const entries = await readdir(join(dir, path), { withFileTypes: true })
      const results: string[] = []
      for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        const name = path ? `${path}/${entry.name}` : entry.name
        if (entry.isDirectory()) results.push(...(await filesIn(name)))
        else if (entry.isFile()) results.push(name)
      }
      return results
    } catch {
      return []
    }
  }
  const files = await filesIn("")
  const fileSet = new Set(files)
  for (const file of ["robots.txt", "sitemap.xml", "site.webmanifest", "404.html"])
    if (!fileSet.has(file)) failures.push(`missing dist/client/${file}`)
  const htmlFiles = files.filter((file) => file.endsWith(".html"))
  const pages = new Map<string, { file: string; html: string; noindex: boolean }>()
  for (const file of htmlFiles) {
    const html = (await read(file)) ?? ""
    const noindex =
      file === "404.html" ||
      tags(html, "meta").some(
        (tag) => attr(tag, "name")?.toLowerCase() === "robots" && /\bnoindex\b/iu.test(attr(tag, "content") ?? ""),
      )
    const route = routeOf(file)
    if (pages.has(route)) failures.push(`${file}: duplicate generated route ${route}`)
    pages.set(route, { file, html, noindex })
  }
  const sitemap = await read("sitemap.xml")
  const sitemapRoutes: string[] = []
  if (sitemap !== undefined) {
    if (
      !/^\s*(?:<\?xml\b[^?]*\?>\s*)?<urlset\b[^>]*>[\s\S]*<\/urlset\s*>\s*$/u.test(sitemap) ||
      (sitemap.match(/<urlset\b/gu)?.length ?? 0) !== 1 ||
      (sitemap.match(/<\/urlset\s*>/gu)?.length ?? 0) !== 1
    )
      failures.push("sitemap.xml: invalid urlset root")
    const blocks = [...sitemap.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url\s*>/gu)]
    if (
      (sitemap.match(/<url\b/gu)?.length ?? 0) !== blocks.length ||
      (sitemap.match(/<\/url\s*>/gu)?.length ?? 0) !== blocks.length
    )
      failures.push("sitemap.xml: malformed url entries")
    for (const block of blocks) {
      const locs = [...(block[1] ?? "").matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc\s*>/gu)]
      if (locs.length !== 1 || ((block[1] ?? "").match(/<loc\b/gu)?.length ?? 0) !== 1) {
        failures.push("sitemap.xml: expected exactly one loc per url")
        continue
      }
      const loc = (locs[0]?.[1] ?? "").trim().replaceAll("&amp;", "&")
      try {
        const url = new URL(loc)
        if (url.origin !== origin || url.search || url.hash || !["http:", "https:"].includes(url.protocol))
          throw new Error()
        sitemapRoutes.push(url.pathname.replace(/\/+$/u, "") || "/")
      } catch {
        failures.push(`sitemap.xml: invalid loc ${loc}`)
      }
    }
    if (new Set(sitemapRoutes).size !== sitemapRoutes.length) failures.push("sitemap.xml: duplicate routes")
  }
  const robots = await read("robots.txt")
  if (robots !== undefined)
    for (const [label, pattern] of [
      ["User-agent: *", /^User-agent\s*:\s*\*\s*$/imu],
      ["Allow: /", /^Allow\s*:\s*\/\s*$/imu],
      [
        "Sitemap",
        new RegExp(`^Sitemap\\s*:\\s*${site.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}/sitemap\\.xml\\s*$`, "imu"),
      ],
    ] as const)
      if (!pattern.test(robots)) failures.push(`robots.txt: missing ${label}`)
  const manifestText = await read("site.webmanifest")
  let manifest: unknown
  if (manifestText !== undefined) {
    try {
      manifest = JSON.parse(manifestText)
    } catch {
      failures.push("site.webmanifest: invalid JSON")
    }
  }
  const resolve = (value: string, route: string): URL | undefined => {
    try {
      return new URL(value, `${site}${route === "/" ? "/" : route}`)
    } catch {
      return undefined
    }
  }
  const target = (url: URL): { file: string; html?: string } | undefined => {
    let path: string
    try {
      path = decodeURIComponent(url.pathname)
    } catch {
      return undefined
    }
    if (path.includes("\0") || path.split("/").includes("..")) return undefined
    const page = pages.get(path.replace(/\/+$/u, "") || "/")
    if (page) return page
    const file = path.replace(/^\/+/, "")
    return fileSet.has(file) ? { file } : undefined
  }
  function resourceCheck(file: string, value: string | undefined, route: string, label: string) {
    if (!value?.trim()) {
      failures.push(`${file}: missing ${label}`)
      return
    }
    const url = resolve(value, route)
    if (!url || !["http:", "https:"].includes(url.protocol)) {
      failures.push(`${file}: invalid ${label} ${value}`)
      return
    }
    if (url.origin !== origin) return
    if (!target(url)) failures.push(`${file}: missing ${label} ${value}`)
  }
  if (manifestText !== undefined && !recordIs(manifest)) failures.push("site.webmanifest: invalid manifest object")
  if (recordIs(manifest) && Array.isArray(manifest.icons))
    for (const icon of manifest.icons)
      resourceCheck(
        "site.webmanifest",
        recordIs(icon) && typeof icon.src === "string" ? icon.src : undefined,
        "/site.webmanifest",
        "icon",
      )
  const titles = new Map<string, string>()
  const descriptions = new Map<string, string>()
  for (const [route, page] of pages) {
    const { file, html, noindex } = page
    const fail = (message: string) => failures.push(`${file}: ${message}`)
    if (tags(html, "h1").length !== 1) fail(`expected exactly one h1, found ${tags(html, "h1").length}`)
    if (attr(tags(html, "html")[0] ?? "", "lang") !== "de") fail("missing html lang=de")
    const metas = tags(html, "meta")
    const links = tags(html, "link")
    if (!metas.some((tag) => attr(tag, "charset")?.toLowerCase() === "utf-8")) fail("missing utf-8 charset")
    if (!metas.some((tag) => attr(tag, "name")?.toLowerCase() === "viewport" && attr(tag, "content")?.trim()))
      fail("missing viewport")
    const meta = (key: string, value: string) =>
      metas.filter((tag) => attr(tag, key)?.toLowerCase() === value).map((tag) => attr(tag, "content"))
    const link = (rel: string) =>
      links
        .filter((tag) => (attr(tag, "rel") ?? "").toLowerCase().split(/\s+/u).includes(rel))
        .map((tag) => attr(tag, "href"))
    const one = (label: string, values: (string | undefined)[]) => {
      if (values.length !== 1 || !values[0]?.trim())
        fail(`expected exactly one non-empty ${label}, found ${values.length}`)
      return values[0]
    }
    const manifestLink = one("manifest", link("manifest"))
    if (manifestLink && resolve(manifestLink, route)?.pathname !== "/site.webmanifest") fail("invalid manifest link")
    for (const tag of links)
      if (
        (attr(tag, "rel") ?? "")
          .toLowerCase()
          .split(/\s+/u)
          .some((rel) => rel === "icon" || rel === "apple-touch-icon")
      )
        resourceCheck(file, attr(tag, "href"), route, "icon")
    if (noindex) {
      if (file === "404.html" && !meta("name", "robots").some((value) => /\bnoindex\b/iu.test(value ?? "")))
        fail("excluded page missing noindex")
      if (sitemapRoutes.includes(route)) fail("excluded route in sitemap")
    } else {
      if (!sitemapRoutes.includes(route)) fail("indexable route missing from sitemap")
      const title = one(
        "title",
        [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/giu)].map((m) => m[1]?.trim()),
      )
      const description = one("description", meta("name", "description"))
      for (const [label, value, seen] of [
        ["title", title, titles],
        ["description", description, descriptions],
      ] as const)
        if (value?.trim()) {
          const previous = seen.get(value.trim())
          if (previous) fail(`duplicate ${label} with ${previous}`)
          else seen.set(value.trim(), route)
        }
      const canonical = one("canonical", link("canonical"))
      if (canonical !== `${site}${route}`) fail(`invalid canonical, expected ${site}${route}`)
      for (const name of ["og:title", "og:description", "og:url", "og:image"]) {
        const value = one(name, meta("property", name))
        if (name === "og:url" && value !== canonical) fail("og:url does not match canonical")
      }
      one("twitter:card", meta("name", "twitter:card"))
    }
    const jsonLd: JsonObject[] = []
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/giu)) {
      if (attr(match[1] ?? "", "type") !== "application/ld+json") continue
      try {
        const value: unknown = JSON.parse(match[2] ?? "")
        if (
          !recordIs(value) ||
          value["@context"] !== "https://schema.org" ||
          typeof value["@type"] !== "string" ||
          !value["@type"]
        )
          fail("invalid JSON-LD context or type")
        if (recordIs(value)) jsonLd.push(value)
      } catch {
        fail("invalid JSON-LD JSON")
      }
    }
    const requiredTypes: Record<string, string[]> = route === "/" ? { WebSite: ["name", "url", "description"] } : {}
    for (const [type, fields] of Object.entries(requiredTypes)) {
      const matches = jsonLd.filter((value) => value["@type"] === type)
      if (matches.length !== 1) {
        fail(`expected exactly one ${type} JSON-LD`)
        continue
      }
      for (const field of fields) {
        const value = matches[0]?.[field]
        if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0))
          fail(`${type} JSON-LD missing ${field}`)
      }
    }
    for (const tag of tags(html, "a")) {
      const href = attr(tag, "href")
      if (!href) continue
      const url = resolve(href, route)
      if (!url) {
        fail(`invalid internal link ${href}`)
        continue
      }
      if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin) continue
      const dest = target(url)
      if (!dest) {
        // Request-time SSR routes have no prerendered HTML in dist; the route tree proves they exist.
        if (seoSsrRouteMatches(ssrPatterns, url.pathname)) continue
        fail(`missing internal link ${href}`)
        continue
      }
      if (url.hash && dest.html !== undefined) {
        let fragment = ""
        try {
          fragment = decodeURIComponent(url.hash.slice(1))
        } catch {
          /* invalid fragment */
        }
        if (
          !fragment ||
          !(dest.html.match(/<[a-z][^>]*>/giu) ?? []).some(
            (element) => attr(element, "id") === fragment || attr(element, "name") === fragment,
          )
        )
          fail(`missing internal link fragment ${href}`)
      }
    }
    for (const tag of tags(html, "img")) {
      resourceCheck(file, attr(tag, "src"), route, "image")
      if (attr(tag, "alt") === undefined) fail("img missing alt")
      for (const dimension of ["width", "height"]) {
        const value = attr(tag, dimension)
        if (!value || !Number.isFinite(Number(value)) || Number(value) <= 0) fail(`img invalid ${dimension}`)
      }
      const loading = attr(tag, "loading")
      if (loading !== undefined && !["lazy", "eager"].includes(loading)) fail(`img invalid loading ${loading}`)
      const decoding = attr(tag, "decoding")
      if (decoding !== undefined && !["async", "sync", "auto"].includes(decoding))
        fail(`img invalid decoding ${decoding}`)
    }
  }
  for (const route of sitemapRoutes)
    if (!pages.has(route) && !seoSsrRouteMatches(ssrPatterns, route))
      failures.push(`sitemap.xml: missing prerendered HTML or SSR route for ${route}`)
  return { failures }
}

async function seoSourceVerify(): Promise<string[]> {
  const projectRoot = process.cwd()
  const routesDirectory = join(projectRoot, "src", "routes")
  const failures: string[] = []

  const seoHeadSource = await readFile(join(projectRoot, "src", "seo", "seoHeadCreate.ts"), "utf8")
  if (!seoHeadSource.includes("{ noindex: true }") && !seoHeadSource.includes("noindex?: boolean"))
    failures.push("src/seo/seoHeadCreate.ts: missing noindex option for app-private routes")

  const seoPagesSource = await readFile(join(projectRoot, "src", "seo", "seoPages.ts"), "utf8")
  const seoPagePaths = [...seoPagesSource.matchAll(/path:\s*"([^"]+)"/gu)].map((match) => match[1])
  if (new Set(seoPagePaths).size !== seoPagePaths.length) failures.push("src/seo/seoPages.ts: duplicate page paths")

  const speculationSource = await readFile(join(routesDirectory, "speculationRules.ts"), "utf8")
  for (const excluded of [
    "/admin",
    "/organizer",
    "/veranstalter",
    "/bestellungen",
    "/checkout",
    "/sso",
    "/konto",
    "/demo",
  ]) {
    if (!speculationSource.includes(excluded))
      failures.push("src/routes/speculationRules.ts: missing exclusion " + excluded)
  }

  const entries = await readdir(routesDirectory, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".tsx")) continue
    const relativePath = "src/routes/" + entry.name
    const contents = await readFile(join(routesDirectory, entry.name), "utf8")
    const robotsTags = contents.match(/["']robots["']/gu) ?? []
    if (robotsTags.length > 1) failures.push(relativePath + ": duplicate robots meta tags (" + robotsTags.length + ")")
    const seoHeadCalls = contents.match(/seoHeadCreate\(/gu) ?? []
    if (seoHeadCalls.length > 1)
      failures.push(relativePath + ": seoHeadCreate called " + seoHeadCalls.length + "x; pass { noindex: true } once")
    for (const match of contents.matchAll(/seoHeadCreate\("([^"]+)"([^)]*)\)/gu)) {
      const target = match[1] ?? ""
      const options = match[2] ?? ""
      if (!seoPagePaths.includes(target) && !options.includes("noindex"))
        failures.push(relativePath + ': seoHeadCreate("' + target + '") without seoPages entry or { noindex: true }')
    }
  }

  let robotsTxt = ""
  try {
    robotsTxt = await readFile(join(projectRoot, "public", "robots.txt"), "utf8")
  } catch {
    failures.push("public/robots.txt: missing")
  }
  if (robotsTxt !== "" && !robotsTxt.includes("Allow: /")) failures.push("public/robots.txt: missing Allow: /")
  if (robotsTxt !== "" && !robotsTxt.includes("Sitemap: https://eventoren.de/sitemap.xml"))
    failures.push("public/robots.txt: missing Sitemap directive")

  return failures
}

if (import.meta.main) {
  const failures = [...(await seoSourceVerify()), ...(await seoOutputVerify()).failures]
  if (failures.length > 0) {
    console.error("SEO output verification failed:\n" + failures.map((failure) => "- " + failure).join("\n"))
    process.exit(1)
  } else {
    console.log("Verified SEO head output and built HTML, sitemap, robots, and manifest.")
  }
}
