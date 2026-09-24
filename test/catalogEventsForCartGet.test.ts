import { expect, mock, test } from "bun:test"

const calls: string[] = []
let resultForEvent: (eventKey: string) => unknown
let createdUrl: string | undefined

mock.module("../src/client/apiClient.js", () => ({
  apiClientCreate: (url: string) => {
    createdUrl = url
    return { client: true }
  },
  apiClientCatalogEventGetPublished: async (eventKey: string) => {
    calls.push(eventKey)
    return resultForEvent(eventKey)
  },
}))

const { catalogEventsForCartGet } = await import("../src/server/catalogEventsForCartGet.ts")

test("fetches deduplicated requested cart keys, excludes unpublished events, and uses the supplied URL", async () => {
  calls.length = 0
  resultForEvent = (eventKey) =>
    eventKey === "unpublished" ? { success: true, data: null } : ({ success: true, data: { id: eventKey } } as never)

  const result = await catalogEventsForCartGet({
    eventKeys: ["first", "unpublished", "first", "last"],
    context: { convexUrl: "https://convex.example" },
  })

  expect(calls).toEqual(["first", "unpublished", "last"])
  expect(createdUrl).toBe("https://convex.example")
  expect(result as unknown).toEqual({ success: true, data: [{ id: "first" }, { id: "last" }] })
})

test("rejects carts with more than 20 distinct event keys without silently dropping tickets", async () => {
  calls.length = 0
  resultForEvent = (eventKey) => ({ success: true, data: { id: eventKey } }) as never

  const result = await catalogEventsForCartGet({
    eventKeys: Array.from({ length: 24 }, (_, index) => `event-${index}`),
  })

  expect(calls).toHaveLength(0)
  expect(result).toEqual({ success: false, error: { status: 400, message: "Too many cart events" } })
})

test("propagates a published-event lookup failure", async () => {
  calls.length = 0
  const failure = { success: false, error: { status: 503, message: "Unavailable" } } as const
  resultForEvent = (eventKey) =>
    eventKey === "broken" ? failure : ({ success: true, data: { id: eventKey } } as never)

  const result = await catalogEventsForCartGet({ eventKeys: ["working", "broken"] })

  expect(result).toEqual(failure)
})
