import { afterEach, describe, expect, it } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { seoOutputVerify } from "./seoOutputCheck.ts"

const site = "https://eventoren.de"
const directories: string[] = []
const routeTreeSource = `
      fullPath: "/"
      fullPath: "/events/$eventId"
      fullPath: "/abiball-2027"
`

const sitemap = (routes: string[]) =>
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((route) => `<url><loc>${site}${route}</loc></url>`).join("")}</urlset>`

const schema = (type: string, fields: Record<string, unknown>) =>
  `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": type, ...fields })}</script>`

const indexableHtml = (route: string, lang = "de", headExtra = "") => {
  const canonical = `${site}${route}`
  return `<html lang="${lang}"><head>${headExtra}<meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Title ${route}</title><meta name="description" content="Description ${route}"><link rel="canonical" href="${canonical}"><link rel="manifest" href="/site.webmanifest"><link rel="icon" href="/icon.png"><meta property="og:title" content="Title"><meta property="og:description" content="Description"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${site}/image.png"><meta name="twitter:card" content="summary">${schema("WebSite", { name: "Eventoren", url: site, description: "Description" })}</head><body><h1>Heading</h1><a href="/events/sommerfest-2026">Sommerfest</a><a href="#angebote">Angebote</a><section id="angebote"></section><img src="/image.png" alt="Image" width="100" height="100" loading="lazy" decoding="async"></body></html>`
}

const hreflangLinks = (de: string, en: string) =>
  `<link rel="alternate" hreflang="de" href="${site}${de}"><link rel="alternate" hreflang="en" href="${site}${en}"><link rel="alternate" hreflang="x-default" href="${site}${de}">`

const graphScript = (nodes: unknown[]) =>
  `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": nodes })}</script>`

/** Adds a German Ratgeber page and its English guide counterpart, linked via hreflang. */
async function fixtureGuidePairAdd(dir: string) {
  await mkdir(join(dir, "ratgeber"))
  await mkdir(join(dir, "en", "guides"), { recursive: true })
  const links = hreflangLinks("/ratgeber/fake-tickets-erkennen", "/en/guides/fake-tickets")
  const graph = graphScript([
    { "@type": "Article", headline: "Fake tickets" },
    { "@type": "BreadcrumbList", itemListElement: [] },
  ])
  await Promise.all([
    writeFile(
      join(dir, "ratgeber", "fake-tickets-erkennen.html"),
      indexableHtml("/ratgeber/fake-tickets-erkennen", "de", links + graph),
    ),
    writeFile(
      join(dir, "en", "guides", "fake-tickets.html"),
      indexableHtml("/en/guides/fake-tickets", "en", links + graph),
    ),
    writeFile(
      join(dir, "sitemap.xml"),
      sitemap(["/", "/events/sommerfest-2026", "/ratgeber/fake-tickets-erkennen", "/en/guides/fake-tickets"]),
    ),
  ])
}

const noindexHtml = (heading: string) =>
  `<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex, nofollow"><link rel="manifest" href="/site.webmanifest"></head><body><h1>${heading}</h1></body></html>`

async function fixtureCreate(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "seo-output-test-"))
  directories.push(dir)
  await mkdir(join(dir, "events"))
  await Promise.all([
    writeFile(join(dir, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`),
    writeFile(join(dir, "sitemap.xml"), sitemap(["/", "/events/sommerfest-2026"])),
    writeFile(join(dir, "site.webmanifest"), JSON.stringify({ icons: [{ src: "/icon.png" }] })),
    writeFile(join(dir, "icon.png"), "icon"),
    writeFile(join(dir, "image.png"), "image"),
    writeFile(join(dir, "404.html"), noindexHtml("Not found")),
    writeFile(join(dir, "index.html"), indexableHtml("/")),
    writeFile(join(dir, "abiball-2027.html"), noindexHtml("Gated")),
  ])
  return dir
}

async function fixtureReplace(dir: string, file: string, before: string, after: string) {
  const path = join(dir, file)
  const content = await readFile(path, "utf8")
  expect(content).toContain(before)
  await writeFile(path, content.replace(before, after))
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe("seoOutputVerify", () => {
  it("passes for valid built output with a dynamic SSR event route in the sitemap", async () => {
    const dir = await fixtureCreate()
    const { failures } = await seoOutputVerify({ distClientDir: dir, siteUrl: site, routeTreeSource })
    expect(failures).toEqual([])
  })

  it("fails when the indexable page has no h1", async () => {
    const dir = await fixtureCreate()
    await fixtureReplace(dir, "index.html", "<h1>Heading</h1>", "")
    const { failures } = await seoOutputVerify({ distClientDir: dir, siteUrl: site, routeTreeSource })
    expect(failures.some((failure) => failure.includes("exactly one h1"))).toBe(true)
  })

  it("fails on duplicate canonical tags", async () => {
    const dir = await fixtureCreate()
    await fixtureReplace(
      dir,
      "index.html",
      '<link rel="manifest"',
      `<link rel="canonical" href="${site}/"><link rel="manifest"`,
    )
    const { failures } = await seoOutputVerify({ distClientDir: dir, siteUrl: site, routeTreeSource })
    expect(failures.some((failure) => failure.includes("canonical"))).toBe(true)
  })

  it("fails when an image misses alt or dimensions", async () => {
    const dir = await fixtureCreate()
    await fixtureReplace(dir, "index.html", 'alt="Image" width="100" height="100"', "")
    const { failures } = await seoOutputVerify({ distClientDir: dir, siteUrl: site, routeTreeSource })
    expect(failures.some((failure) => failure.includes("img missing alt"))).toBe(true)
    expect(failures.some((failure) => failure.includes("img invalid width"))).toBe(true)
  })

  it("fails on a broken internal fragment", async () => {
    const dir = await fixtureCreate()
    await fixtureReplace(dir, "index.html", 'href="#angebote"', 'href="#fehlt"')
    const { failures } = await seoOutputVerify({ distClientDir: dir, siteUrl: site, routeTreeSource })
    expect(failures.some((failure) => failure.includes("missing internal link fragment"))).toBe(true)
  })

  it("fails when an indexable route is missing from the sitemap", async () => {
    const dir = await fixtureCreate()
    await writeFile(join(dir, "sitemap.xml"), sitemap(["/events/sommerfest-2026"]))
    const { failures } = await seoOutputVerify({ distClientDir: dir, siteUrl: site, routeTreeSource })
    expect(failures.some((failure) => failure.includes("indexable route missing from sitemap"))).toBe(true)
  })

  it("fails when a noindex route is listed in the sitemap", async () => {
    const dir = await fixtureCreate()
    await writeFile(join(dir, "sitemap.xml"), sitemap(["/", "/events/sommerfest-2026", "/abiball-2027"]))
    const { failures } = await seoOutputVerify({ distClientDir: dir, siteUrl: site, routeTreeSource })
    expect(failures.some((failure) => failure.includes("excluded route in sitemap"))).toBe(true)
  })

  it("fails when a sitemap route has neither prerendered HTML nor an SSR route", async () => {
    const dir = await fixtureCreate()
    await writeFile(join(dir, "sitemap.xml"), sitemap(["/", "/events/sommerfest-2026", "/unbekannt"]))
    const { failures } = await seoOutputVerify({ distClientDir: dir, siteUrl: site, routeTreeSource })
    expect(failures.some((failure) => failure.includes("missing prerendered HTML or SSR route"))).toBe(true)
  })

  it("passes for a German/English page pair with path-based lang, hreflang and an @graph JSON-LD root", async () => {
    const dir = await fixtureCreate()
    await fixtureGuidePairAdd(dir)
    const { failures } = await seoOutputVerify({ distClientDir: dir, siteUrl: site, routeTreeSource })
    expect(failures).toEqual([])
  })

  it("fails when a page under /en/ is not marked as English", async () => {
    const dir = await fixtureCreate()
    await fixtureGuidePairAdd(dir)
    await fixtureReplace(dir, "en/guides/fake-tickets.html", '<html lang="en">', '<html lang="de">')
    const { failures } = await seoOutputVerify({ distClientDir: dir, siteUrl: site, routeTreeSource })
    expect(failures).toContain("en/guides/fake-tickets.html: missing html lang=en")
  })

  it("fails when a German page is marked as English", async () => {
    const dir = await fixtureCreate()
    await fixtureReplace(dir, "index.html", '<html lang="de">', '<html lang="en">')
    const { failures } = await seoOutputVerify({ distClientDir: dir, siteUrl: site, routeTreeSource })
    expect(failures).toContain("index.html: missing html lang=de")
  })

  it("fails when an hreflang link is relative or points to an unknown page", async () => {
    const dir = await fixtureCreate()
    await fixtureGuidePairAdd(dir)
    await fixtureReplace(
      dir,
      "ratgeber/fake-tickets-erkennen.html",
      `hreflang="en" href="${site}/en/guides/fake-tickets"`,
      'hreflang="en" href="/en/guides/fake-tickets"',
    )
    await fixtureReplace(
      dir,
      "en/guides/fake-tickets.html",
      `hreflang="de" href="${site}/ratgeber/fake-tickets-erkennen"`,
      `hreflang="de" href="${site}/ratgeber/fehlt"`,
    )
    const { failures } = await seoOutputVerify({ distClientDir: dir, siteUrl: site, routeTreeSource })
    expect(failures.some((failure) => failure.includes("hreflang en must be an absolute"))).toBe(true)
    expect(failures.some((failure) => failure.includes("hreflang de points to unknown page"))).toBe(true)
  })

  it("fails when an @graph item has no @type", async () => {
    const dir = await fixtureCreate()
    await fixtureGuidePairAdd(dir)
    await fixtureReplace(dir, "en/guides/fake-tickets.html", '{"@type":"Article",', "{")
    const { failures } = await seoOutputVerify({ distClientDir: dir, siteUrl: site, routeTreeSource })
    expect(failures).toContain("en/guides/fake-tickets.html: invalid JSON-LD context or type")
  })
})
