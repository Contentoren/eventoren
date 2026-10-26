import { expect, test } from "bun:test"
import { sitemapProductionCatalogEnabled } from "../src/sitemap/sitemapProductionCatalogEnabled.ts"

test("allows the published catalog in the production environment", () => {
  expect(sitemapProductionCatalogEnabled({ envMode: "production", siteBaseUrl: "https://eventoren.de" })).toBe(true)
})

test("blocks the published catalog in the preview and development environment", () => {
  expect(sitemapProductionCatalogEnabled({ envMode: "development", siteBaseUrl: "https://eventoren.wonder1.de" })).toBe(
    false,
  )
  expect(sitemapProductionCatalogEnabled({ envMode: "preview", siteBaseUrl: "https://eventoren.de" })).toBe(false)
  expect(sitemapProductionCatalogEnabled({ envMode: undefined, siteBaseUrl: "https://eventoren.de" })).toBe(false)
})

test("blocks the published catalog when the site origin is not the production origin", () => {
  expect(sitemapProductionCatalogEnabled({ envMode: "production", siteBaseUrl: "https://eventoren.wonder1.de" })).toBe(
    false,
  )
  expect(sitemapProductionCatalogEnabled({ envMode: "production", siteBaseUrl: undefined })).toBe(false)
})
