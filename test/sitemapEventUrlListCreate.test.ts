import { expect, test } from "bun:test"
import type { CatalogEventListPublishedPage } from "../src/catalog/CatalogEventListPublishedPage.ts"
import type { ApiClientResult } from "../src/client/apiClient.ts"
import type { EventItem } from "../src/events/EventItem.ts"
import { sitemapEventUrlListCreate } from "../src/sitemap/sitemapEventUrlListCreate.ts"

const eventItem = (id: string): EventItem => ({ id }) as EventItem

const catalogPage = (ids: string[], isDone: boolean, continueCursor: string): CatalogEventListPublishedPage => ({
  page: ids.map(eventItem),
  isDone,
  continueCursor,
})

test("lists the canonical url of every published event across all catalog pages", async () => {
  const calls: { numItems: number; cursor: string | null }[] = []
  const result = await sitemapEventUrlListCreate(async (input) => {
    calls.push(input.paginationOpts)
    if (calls.length === 1) return { success: true, data: catalogPage(["abiball-36a4910d"], false, "cursor-1") }
    return { success: true, data: catalogPage(["pilates-christmas-event-2027-final"], true, "cursor-2") }
  })

  expect(calls).toEqual([
    { numItems: 50, cursor: null },
    { numItems: 50, cursor: "cursor-1" },
  ])
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.map((entry) => entry.loc)).toEqual([
    "https://eventoren.de/events/abiball-36a4910d",
    "https://eventoren.de/events/pilates-christmas-event-2027-final",
  ])
})

test("omits the modification date of events because the public catalog exposes none", async () => {
  const result = await sitemapEventUrlListCreate(async () => ({
    success: true,
    data: catalogPage(["abiball-36a4910d"], true, "cursor-1"),
  }))

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data).toEqual([
    { loc: "https://eventoren.de/events/abiball-36a4910d", changefreq: "daily", priority: 0.8 },
  ])
})

test("keeps one entry per event when the catalog repeats an event across pages", async () => {
  const result = await sitemapEventUrlListCreate(async (input) => {
    if (input.paginationOpts.cursor === null)
      return { success: true, data: catalogPage(["abiball-36a4910d"], false, "cursor-1") }
    return { success: true, data: catalogPage(["abiball-36a4910d"], true, "cursor-2") }
  })

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data).toHaveLength(1)
  expect(result.data[0]?.loc).toBe("https://eventoren.de/events/abiball-36a4910d")
})

test("escapes an event id inside the canonical url", async () => {
  const result = await sitemapEventUrlListCreate(async () => ({
    success: true,
    data: catalogPage(["summer & grill"], true, "cursor-1"),
  }))

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data[0]?.loc).toBe("https://eventoren.de/events/summer%20%26%20grill")
})

test("fails when the published catalog cannot be read", async () => {
  const result = await sitemapEventUrlListCreate(
    async (): Promise<ApiClientResult<CatalogEventListPublishedPage>> => ({
      success: false,
      error: { status: 503, message: "Public catalogue request failed." },
    }),
  )

  expect(result).toEqual({
    success: false,
    op: "sitemapEventUrlListCreate",
    errorMessage: "Public catalogue request failed.",
  })
})

test("stops when the published catalog cursor does not advance", async () => {
  const result = await sitemapEventUrlListCreate(async () => ({
    success: true,
    data: catalogPage([], false, "cursor-1"),
  }))

  expect(result).toEqual({
    success: false,
    op: "sitemapEventUrlListCreate",
    errorMessage: "Published catalog page cursor did not advance",
  })
})
