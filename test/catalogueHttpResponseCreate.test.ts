import { expect, test } from "bun:test"
import { catalogueHttpResponseCreate } from "../src/server/catalogueHttpResponseCreate.ts"

test("public catalogue success advertises shared and browser caching for 60 seconds", async () => {
  const response = catalogueHttpResponseCreate({
    success: true,
    data: { page: [], isDone: true, continueCursor: "" },
  })

  expect(response.status).toBe(200)
  expect(response.headers.get("cache-control")).toBe("public, max-age=60, s-maxage=60")
  expect(await response.json()).toEqual({ page: [], isDone: true, continueCursor: "" })
})

test("public catalogue failures are no-store and do not expose upstream error details", async () => {
  const response = catalogueHttpResponseCreate({
    success: false,
    error: { status: 503, message: "private backend diagnostics" },
  })

  expect(response.status).toBe(503)
  expect(response.headers.get("cache-control")).toBe("no-store")
  expect(await response.json()).toEqual({ error: "Public catalogue data is temporarily unavailable." })
})
