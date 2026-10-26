import { expect, test } from "bun:test"
import type { ContentEntry } from "../src/app/content/contentList.ts"
import { seoPages } from "../src/seo/seoPages.ts"
import type { SitemapUrlEntry } from "../src/sitemap/sitemapUrlEntry.ts"
import { sitemapUrlListCreate } from "../src/sitemap/sitemapUrlListCreate.ts"

const siteUrl = "https://eventoren.de"
const buildDate = "2026-10-26"

const article = (overrides: Partial<ContentEntry> & Pick<ContentEntry, "path" | "publishedAt">): ContentEntry => ({
  id: "article-id",
  slug: "article-slug",
  contentPath: "content/ratgeber/article-slug.md",
  image: null,
  imagePath: null,
  title: "Ratgeber",
  description: "Beschreibung",
  author: null,
  imageAlt: null,
  updatedAt: null,
  ...overrides,
})

const eventEntry = (loc: string): SitemapUrlEntry => ({ loc, changefreq: "daily", priority: 0.8 })

test("keeps the indexable static pages and excludes private and checkout routes", () => {
  const entries = sitemapUrlListCreate({ siteUrl, buildDate, pages: seoPages, articles: [], events: [] })
  const locs = entries.map((entry) => entry.loc)

  for (const path of ["/", "/kontakt", "/support", "/impressum", "/agb", "/datenschutz"])
    expect(locs).toContain(siteUrl + path)
  for (const path of ["/checkout", "/warenkorb"]) expect(locs).not.toContain(siteUrl + path)
  for (const path of ["/admin", "/organizer", "/veranstalter", "/demo", "/konto", "/bestellungen", "/abiball-2027"])
    expect(locs.some((loc) => loc.includes(path))).toBe(false)
})

test("does not stamp static pages with the build date", () => {
  const entries = sitemapUrlListCreate({ siteUrl, buildDate, pages: seoPages, articles: [], events: [] })

  expect(entries.length).toBeGreaterThan(0)
  expect(entries.every((entry) => entry.lastmod === undefined)).toBe(true)
})

test("publishes an article with its real modification date and hides a future article", () => {
  const entries = sitemapUrlListCreate({
    siteUrl,
    buildDate,
    pages: seoPages,
    articles: [
      article({ path: "/ratgeber/veroeffentlicht", publishedAt: "2026-01-02", updatedAt: "2026-03-04" }),
      article({ path: "/ratgeber/zukuenftig", publishedAt: "2027-01-01" }),
    ],
    events: [],
  })

  const published = entries.find((entry) => entry.loc === siteUrl + "/ratgeber/veroeffentlicht")
  expect(published?.lastmod).toBe("2026-03-04")
  expect(entries.some((entry) => entry.loc === siteUrl + "/ratgeber/zukuenftig")).toBe(false)
})

test("falls back to the publication date when an article has no modification date", () => {
  const entries = sitemapUrlListCreate({
    siteUrl,
    buildDate,
    pages: seoPages,
    articles: [article({ path: "/ratgeber/ohne-datum", publishedAt: "2026-01-02" })],
    events: [],
  })

  const published = entries.find((entry) => entry.loc === siteUrl + "/ratgeber/ohne-datum")
  expect(published?.lastmod).toBe("2026-01-02")
})

test("adds the published event urls and keeps every url once", () => {
  const entries = sitemapUrlListCreate({
    siteUrl,
    buildDate,
    pages: seoPages,
    articles: [],
    events: [
      eventEntry(siteUrl + "/events/abiball-36a4910d"),
      eventEntry(siteUrl + "/events/abiball-36a4910d"),
      eventEntry(siteUrl + "/events/pilates-christmas-event-2027-final"),
    ],
  })

  const locs = entries.map((entry) => entry.loc)
  expect(locs.filter((loc) => loc === siteUrl + "/events/abiball-36a4910d")).toHaveLength(1)
  expect(locs).toContain(siteUrl + "/events/pilates-christmas-event-2027-final")
  expect(new Set(locs).size).toBe(locs.length)
})

test("sorts the url list by location", () => {
  const entries = sitemapUrlListCreate({
    siteUrl,
    buildDate,
    pages: seoPages,
    articles: [],
    events: [eventEntry(siteUrl + "/events/abiball-36a4910d")],
  })

  const locs = entries.map((entry) => entry.loc)
  expect(locs).toEqual([...locs].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)))
})
