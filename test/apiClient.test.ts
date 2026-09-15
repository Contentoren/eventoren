import { expect, test } from "bun:test"
import { apiClientCatalogEventListPublishedGet } from "../src/client/apiClient.js"

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
