import { expect, test } from "bun:test"
import { sitemapXmlCreate } from "../src/sitemap/sitemapXmlCreate.ts"

test("renders an entry without a modification date", () => {
  const xml = sitemapXmlCreate([
    { loc: "https://eventoren.de/events/abiball-36a4910d", changefreq: "daily", priority: 0.8 },
  ])

  expect(xml).toBe(
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      "  <url>\n" +
      "    <loc>https://eventoren.de/events/abiball-36a4910d</loc>\n" +
      "    <changefreq>daily</changefreq>\n" +
      "    <priority>0.8</priority>\n" +
      "  </url>\n" +
      "</urlset>\n",
  )
})

test("renders the modification date of an entry that has one", () => {
  const xml = sitemapXmlCreate([
    {
      loc: "https://eventoren.de/ratgeber/veroeffentlicht",
      lastmod: "2026-03-04",
      changefreq: "monthly",
      priority: 0.6,
    },
  ])

  expect(xml).toContain("    <lastmod>2026-03-04</lastmod>\n")
})

test("escapes xml characters in the location", () => {
  const xml = sitemapXmlCreate([
    { loc: "https://eventoren.de/events/summer%20%26%20grill?a=1&b=2", changefreq: "daily", priority: 0.8 },
  ])

  expect(xml).toContain("<loc>https://eventoren.de/events/summer%20%26%20grill?a=1&amp;b=2</loc>")
  expect(xml).not.toContain("&b=2")
})
