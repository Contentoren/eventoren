import { expect, test } from "bun:test"
import { apiClientCatalogEventListPublishedGet } from "../src/client/apiClient.js"
import { apiClientCatalogEventListPublishedPageGet } from "../src/client/apiClientCatalogEventListPublishedPageGet.ts"

test("serializes non-Error API failures instead of rendering object coercion", async () => {
  const client = {
    query: async () => {
      throw { code: "catalog.unavailable" }
    },
  }

  const result = await apiClientCatalogEventListPublishedGet(client as never)

  expect(result).toEqual({
    success: false,
    error: { status: 503, message: '{"code":"catalog.unavailable"}' },
  })
})

test("passes catalog filters and cursor pagination to the published page query", async () => {
  const calls: unknown[] = []
  const client = {
    query: async (_query: unknown, input: unknown) => {
      calls.push(input)
      return { success: true, data: { page: [], isDone: true, continueCursor: "done" } }
    },
  }
  const input = {
    filter: { query: "Band", location: "Berlin", category: "konzerte" as const, timeWindow: "monat" as const },
    paginationOpts: { numItems: 12, cursor: "next-page" },
  }

  const result = await apiClientCatalogEventListPublishedPageGet(input, client as never)

  expect(calls).toEqual([input])
  expect(result).toEqual({ success: true, data: { page: [], isDone: true, continueCursor: "done" } })
})

test("maps an excessive-tier page error to a recoverable catalog failure", async () => {
  const client = {
    query: async () => ({
      success: false,
      op: "catalogEventListPublishedPageQuery",
      errorMessage: "Published event exceeds the page limit of 50 active tiers",
    }),
  }

  const result = await apiClientCatalogEventListPublishedPageGet(
    {
      filter: { query: "", location: "", category: "alle", timeWindow: "alle" },
      paginationOpts: { numItems: 12, cursor: null },
    },
    client as never,
  )

  expect(result).toEqual({
    success: false,
    error: { status: 503, message: "Published event exceeds the page limit of 50 active tiers" },
  })
})
