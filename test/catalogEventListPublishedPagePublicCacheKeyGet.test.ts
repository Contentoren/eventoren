import { expect, test } from "bun:test"
import { catalogEventListPublishedPagePublicCacheKeyGet } from "../src/server/catalogEventListPublishedPagePublicCacheKeyGet.ts"

test("homepage public data cache key isolates every filter and backend", () => {
  const base = {
    convexUrl: "https://backend.example",
    filter: { query: "music", location: "Berlin", category: "alle" as const, timeWindow: "alle" as const },
  }

  const key = catalogEventListPublishedPagePublicCacheKeyGet(base)
  expect(catalogEventListPublishedPagePublicCacheKeyGet(base)).toBe(key)
  expect(
    catalogEventListPublishedPagePublicCacheKeyGet({
      ...base,
      filter: { ...base.filter, location: "Hamburg" },
    }),
  ).not.toBe(key)
  expect(catalogEventListPublishedPagePublicCacheKeyGet({ ...base, convexUrl: "https://other.example" })).not.toBe(key)
  expect(
    catalogEventListPublishedPagePublicCacheKeyGet({
      ...base,
      paginationOpts: { numItems: 6, cursor: "next" },
    }),
  ).not.toBe(key)
})
