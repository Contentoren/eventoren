import { expect, test } from "bun:test"
import { publicWebPageDataCacheCreate } from "../src/server/publicWebPageDataCacheCreate.js"

test("caches successful public page data until the configured 60 second TTL expires", async () => {
  let now = 1_000
  let calls = 0
  const getData = publicWebPageDataCacheCreate({
    ttlSeconds: 60,
    now: () => now,
    query: async () => {
      calls += 1
      return { success: true as const, data: { projectName: "cached", serverTimestamp: now } }
    },
  })

  expect(await getData()).toEqual({ success: true, data: { projectName: "cached", serverTimestamp: 1_000 } })
  now = 60_999
  expect(await getData()).toEqual({ success: true, data: { projectName: "cached", serverTimestamp: 1_000 } })
  expect(calls).toBe(1)
  now = 61_000
  expect(await getData()).toEqual({ success: true, data: { projectName: "cached", serverTimestamp: 61_000 } })
  expect(calls).toBe(2)
})

test("does not cache public page data when TTL is zero", async () => {
  let calls = 0
  const getData = publicWebPageDataCacheCreate({
    ttlSeconds: 0,
    query: async () => {
      calls += 1
      return { success: true as const, data: { projectName: "uncached", serverTimestamp: calls } }
    },
  })

  expect(await getData()).toEqual({ success: true, data: { projectName: "uncached", serverTimestamp: 1 } })
  expect(await getData()).toEqual({ success: true, data: { projectName: "uncached", serverTimestamp: 2 } })
  expect(calls).toBe(2)
})
