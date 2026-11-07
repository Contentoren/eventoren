import { expect, test } from "bun:test"
import { seoPages } from "../src/seo/seoPages.ts"
import type { SitemapUrlEntry } from "../src/sitemap/sitemapUrlEntry.ts"
import { sitemapUrlListCreate } from "../src/sitemap/sitemapUrlListCreate.ts"

const siteUrl = "https://eventoren.de"

const eventEntry = (loc: string): SitemapUrlEntry => ({ loc, changefreq: "daily", priority: 0.8 })

test("keeps the indexable static pages and excludes private and checkout routes", () => {
  const entries = sitemapUrlListCreate({ siteUrl, pages: seoPages, content: [], events: [] })
  const locs = entries.map((entry) => entry.loc)

  for (const path of ["/", "/kontakt", "/support", "/impressum", "/agb", "/datenschutz"])
    expect(locs).toContain(siteUrl + path)
  for (const path of ["/checkout", "/warenkorb"]) expect(locs).not.toContain(siteUrl + path)
  for (const path of ["/admin", "/organizer", "/veranstalter", "/demo", "/konto", "/bestellungen", "/abiball-2027"])
    expect(locs.some((loc) => loc.includes(path))).toBe(false)
})

test("does not stamp static pages with the build date", () => {
  const entries = sitemapUrlListCreate({ siteUrl, pages: seoPages, content: [], events: [] })

  expect(entries.length).toBeGreaterThan(0)
  expect(entries.every((entry) => entry.lastmod === undefined)).toBe(true)
})

test("adds the content entries unchanged, including their modification date", () => {
  const content: SitemapUrlEntry = {
    loc: siteUrl + "/ratgeber/veroeffentlicht",
    lastmod: "2026-03-04",
    changefreq: "monthly",
    priority: 0.6,
  }
  const entries = sitemapUrlListCreate({ siteUrl, pages: seoPages, content: [content], events: [] })

  expect(entries.find((entry) => entry.loc === content.loc)).toEqual(content)
})

test("adds the published event urls and keeps every url once", () => {
  const entries = sitemapUrlListCreate({
    siteUrl,
    pages: seoPages,
    content: [],
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
    pages: seoPages,
    content: [eventEntry(siteUrl + "/ratgeber")],
    events: [eventEntry(siteUrl + "/events/abiball-36a4910d")],
  })

  const locs = entries.map((entry) => entry.loc)
  expect(locs).toEqual([...locs].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)))
})
