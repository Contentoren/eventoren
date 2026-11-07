import { expect, test } from "bun:test"
import { sitemapContentUrlListCreate } from "../src/sitemap/sitemapContentUrlListCreate.ts"
import { contentListItemFixture } from "./contentViewStateHelpers.fixture.ts"

const siteUrl = "https://eventoren.de"
const today = "2026-11-07"

const ratgeber = (slug: string, overrides: Parameters<typeof contentListItemFixture>[2] = {}) =>
  contentListItemFixture(slug, "tickets-verkaufen", overrides)
const guide = (slug: string, overrides: Parameters<typeof contentListItemFixture>[2] = {}) =>
  contentListItemFixture(slug, "selling-tickets", {
    entry: { path: `/en/guides/${slug}`, ...overrides.entry },
    meta: { collection: "guides", lang: "en", ...overrides.meta },
  })

test("lists both hubs and the published articles of both collections", () => {
  const entries = sitemapContentUrlListCreate({
    siteUrl,
    today,
    items: [ratgeber("tickets-online-verkaufen"), guide("sell-tickets-online")],
  })

  expect(entries.map((entry) => entry.loc).sort()).toEqual([
    "https://eventoren.de/en/guides",
    "https://eventoren.de/en/guides/sell-tickets-online",
    "https://eventoren.de/ratgeber",
    "https://eventoren.de/ratgeber/tickets-online-verkaufen",
  ])
})

test("leaves out an article dated after today", () => {
  const entries = sitemapContentUrlListCreate({
    siteUrl,
    today,
    items: [ratgeber("heute"), ratgeber("morgen", { entry: { publishedAt: "2026-11-08" } })],
  })

  const locs = entries.map((entry) => entry.loc)
  expect(locs).toContain("https://eventoren.de/ratgeber/heute")
  expect(locs).not.toContain("https://eventoren.de/ratgeber/morgen")
})

test("uses the modification date of an article, else its publication date, and the newest one for its hub", () => {
  const entries = sitemapContentUrlListCreate({
    siteUrl,
    today,
    items: [
      ratgeber("aktualisiert", { entry: { publishedAt: "2026-01-02", updatedAt: "2026-03-04" } }),
      ratgeber("neu", { entry: { publishedAt: "2026-11-06" } }),
    ],
  })

  const lastmod = (loc: string) => entries.find((entry) => entry.loc === loc)?.lastmod
  expect(lastmod("https://eventoren.de/ratgeber/aktualisiert")).toBe("2026-03-04")
  expect(lastmod("https://eventoren.de/ratgeber/neu")).toBe("2026-11-06")
  expect(lastmod("https://eventoren.de/ratgeber")).toBe("2026-11-06")
  expect(lastmod("https://eventoren.de/en/guides")).toBeUndefined()
})

test("adds reciprocal hreflang alternates for a published translation pair and none for a single article", () => {
  const entries = sitemapContentUrlListCreate({
    siteUrl,
    today,
    items: [
      ratgeber("tickets-online-verkaufen", { meta: { translationKey: "sell-tickets-online" } }),
      guide("sell-tickets-online", { meta: { translationKey: "sell-tickets-online" } }),
      ratgeber("gema-veranstaltung"),
    ],
  })

  const expected = [
    { hreflang: "de", href: "https://eventoren.de/ratgeber/tickets-online-verkaufen" },
    { hreflang: "en", href: "https://eventoren.de/en/guides/sell-tickets-online" },
    { hreflang: "x-default", href: "https://eventoren.de/ratgeber/tickets-online-verkaufen" },
  ]
  const alternates = (loc: string) => entries.find((entry) => entry.loc === loc)?.alternates
  expect(alternates("https://eventoren.de/ratgeber/tickets-online-verkaufen")).toEqual(expected)
  expect(alternates("https://eventoren.de/en/guides/sell-tickets-online")).toEqual(expected)
  expect(alternates("https://eventoren.de/ratgeber/gema-veranstaltung")).toBeUndefined()
})

test("adds no alternates when the translation is not published yet", () => {
  const entries = sitemapContentUrlListCreate({
    siteUrl,
    today,
    items: [
      ratgeber("tickets-online-verkaufen", { meta: { translationKey: "sell-tickets-online" } }),
      guide("sell-tickets-online", {
        entry: { publishedAt: "2026-12-01" },
        meta: { translationKey: "sell-tickets-online" },
      }),
    ],
  })

  const article = entries.find((entry) => entry.loc === "https://eventoren.de/ratgeber/tickets-online-verkaufen")
  expect(article?.alternates).toBeUndefined()
})
