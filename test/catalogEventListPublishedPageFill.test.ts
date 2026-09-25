import { expect, test } from "bun:test"
import type { CatalogEventListPublishedPage } from "../src/catalog/CatalogEventListPublishedPage.ts"
import type { ApiClientResult } from "../src/client/apiClient.ts"
import { catalogEventListPublishedPageFill } from "../src/events/catalogEventListPublishedPageFill.ts"
import type { EventItem } from "../src/events/EventItem.ts"

const filter = { query: "rare", location: "", category: "alle", timeWindow: "alle" } as const
const event = (id: string) => ({ id }) as EventItem

test("fills the first display page across sparse source pages past the legacy 50-event cap", async () => {
  const calls: { numItems: number; cursor: string | null }[] = []
  const pageGet = async (input: {
    paginationOpts: { numItems: number; cursor: string | null }
  }): Promise<ApiClientResult<CatalogEventListPublishedPage>> => {
    calls.push(input.paginationOpts)
    const index = calls.length
    return {
      success: true,
      data: {
        page: index === 6 ? [event("first")] : index === 8 ? [event("second")] : [],
        continueCursor: `cursor-${index}`,
        isDone: index === 8,
      },
    }
  }

  const result = await catalogEventListPublishedPageFill(
    { filter, paginationOpts: { numItems: 12, cursor: null } },
    pageGet,
  )

  expect(calls).toHaveLength(8)
  expect(calls[0]).toEqual({ numItems: 12, cursor: null })
  expect(calls[6]).toEqual({ numItems: 11, cursor: "cursor-6" })
  expect(result).toEqual({
    success: true,
    data: { page: [event("first"), event("second")], isDone: true, continueCursor: "cursor-8" },
  })
})

test("stops at the display page size and resumes from the last source cursor", async () => {
  const calls: { numItems: number; cursor: string | null }[] = []
  const pageGet = async (input: {
    paginationOpts: { numItems: number; cursor: string | null }
  }): Promise<ApiClientResult<CatalogEventListPublishedPage>> => {
    calls.push(input.paginationOpts)
    return {
      success: true,
      data: { page: [event(`event-${calls.length}`)], isDone: false, continueCursor: `cursor-${calls.length}` },
    }
  }

  const result = await catalogEventListPublishedPageFill(
    { filter, paginationOpts: { numItems: 2, cursor: "previous" } },
    pageGet,
  )

  expect(calls).toEqual([
    { numItems: 2, cursor: "previous" },
    { numItems: 1, cursor: "cursor-1" },
  ])
  expect(result).toEqual({
    success: true,
    data: { page: [event("event-1"), event("event-2")], isDone: false, continueCursor: "cursor-2" },
  })
})

test("reports no matching events only after the source is exhausted", async () => {
  let calls = 0
  const result = await catalogEventListPublishedPageFill(
    { filter, paginationOpts: { numItems: 12, cursor: null } },
    async () => {
      calls += 1
      return {
        success: true,
        data: { page: [], isDone: calls === 4, continueCursor: `cursor-${calls}` },
      }
    },
  )

  expect(calls).toBe(4)
  expect(result).toEqual({ success: true, data: { page: [], isDone: true, continueCursor: "cursor-4" } })
})

test("does not show a partial page as zero results when an excessive-tier page fails", async () => {
  let calls = 0
  const result = await catalogEventListPublishedPageFill(
    { filter, paginationOpts: { numItems: 12, cursor: null } },
    async (): Promise<ApiClientResult<CatalogEventListPublishedPage>> => {
      calls += 1
      if (calls === 2) {
        return {
          success: false,
          error: { status: 503, message: "Published event exceeds the page limit of 50 active tiers" },
        }
      }
      return { success: true, data: { page: [event("first")], isDone: false, continueCursor: "cursor-1" } }
    },
  )

  expect(calls).toBe(2)
  expect(result).toEqual({
    success: false,
    error: { status: 503, message: "Published event exceeds the page limit of 50 active tiers" },
  })
})

test("rejects a non-advancing cursor instead of looping forever on empty pages", async () => {
  const result = await catalogEventListPublishedPageFill(
    { filter, paginationOpts: { numItems: 12, cursor: "stale" } },
    async () => ({ success: true, data: { page: [], isDone: false, continueCursor: "stale" } }),
  )

  expect(result).toEqual({
    success: false,
    error: { status: 503, message: "Published catalog page cursor did not advance" },
  })
})
