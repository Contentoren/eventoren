import { expect, test } from "bun:test"
import type { ContentEntry } from "@adaptive-ds/website-content-pipeline"
import { contentOutputVerify } from "../src/app/content/contentOutputVerify.ts"
import { contentListItemFixture } from "./contentViewStateHelpers.fixture.ts"

const siteUrl = "https://eventoren.de"
const today = "2026-11-07"
const published: ContentEntry = contentListItemFixture("heute", "tickets-verkaufen", {
  entry: { title: "Heute & morgen" },
}).entry
const future: ContentEntry = contentListItemFixture("morgen", "tickets-verkaufen", {
  entry: { publishedAt: "2026-11-08" },
}).entry

const page = (lang: string, title: string) => `<html lang="${lang}"><head><title>${title}</title></head></html>`
const sitemapCreate = (paths: string[]) => paths.map((path) => `<url><loc>${siteUrl}${path}</loc></url>`).join("")
const collections = [
  { name: "ratgeber", lang: "de" as const, pathBase: "/ratgeber", hubTitle: "Ratgeber", entries: [published, future] },
]

test("passes when the hub and published articles are prerendered and listed and the future article is absent", async () => {
  const files: Record<string, string> = {
    "ratgeber.html": page("de", "Ratgeber"),
    "ratgeber/heute.html": page("de", "Heute &amp; morgen"),
  }
  const result = await contentOutputVerify({
    siteUrl,
    today,
    collections,
    sitemap: sitemapCreate(["/ratgeber", "/ratgeber/heute"]),
    fileRead: async (path) => files[path],
  })

  expect(result.failures).toEqual([])
  expect(result.verifiedCount).toBe(2)
})

test("reports a missing hub file, a wrong lang and a missing sitemap entry", async () => {
  const result = await contentOutputVerify({
    siteUrl,
    today,
    collections,
    sitemap: sitemapCreate([]),
    fileRead: async (path) => (path === "ratgeber/heute.html" ? page("en", "Heute & morgen") : undefined),
  })

  expect(result.failures).toContain("missing prerendered ratgeber hub: dist/client/ratgeber.html")
  expect(result.failures).toContain('ratgeber/heute.html: expected <html lang="de">')
  expect(result.failures).toContain("sitemap.xml: missing https://eventoren.de/ratgeber/heute")
})

test("reports a future article that was prerendered or listed in the sitemap", async () => {
  const files: Record<string, string> = {
    "ratgeber.html": page("de", "Ratgeber"),
    "ratgeber/heute.html": page("de", "Heute & morgen"),
    "ratgeber/morgen.html": page("de", "Titel morgen"),
  }
  const result = await contentOutputVerify({
    siteUrl,
    today,
    collections,
    sitemap: sitemapCreate(["/ratgeber", "/ratgeber/heute", "/ratgeber/morgen"]),
    fileRead: async (path) => files[path],
  })

  expect(result.failures).toEqual([
    "unpublished entry was prerendered: ratgeber/morgen.html",
    "sitemap.xml: unpublished entry listed https://eventoren.de/ratgeber/morgen",
  ])
})
