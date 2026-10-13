import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { adminCatalogPageStateCreate } from "../src/admin/adminCatalogPageStateCreate.ts"
import type { AdminEventItem } from "../src/admin/AdminEventItem.ts"
import { createResult } from "../src/ui/createResult.ts"

const event: AdminEventItem = {
  id: "abiball",
  title: "Abiball",
  status: "published",
  catalogVersion: 1,
  subtitle: "",
  description: "",
  category: "konzerte",
  startsAt: "",
  endsAt: "",
  doorsAt: "",
  bookingOpensAt: "2026-10-14T10:00:00.000Z",
  venue: "",
  city: "",
  address: "",
  organizer: "",
  imageUrl: "",
  imageAlt: "",
  tags: [],
  soldOut: false,
  tiers: [],
}

test("event details preserve the release time and release settings explicitly clear it", async () => {
  await createRoot(async (dispose) => {
    try {
      const openingTimes: (string | undefined)[] = []
      const catalog = adminCatalogPageStateCreate({
        events: () => [event],
        eventsLive: () => [event],
        isServerAuthorized: () => true,
        reloadEvents: async () => createResult([event]),
        eventUpsert: async (input) => {
          openingTimes.push(input.bookingOpensAt)
          return createResult({ eventKey: input.eventKey, catalogVersion: 2 })
        },
      })
      catalog.selectEvent(event)
      expect(catalog.eventDraft().bookingOpensAt).toBe(event.bookingOpensAt!)
      catalog.eventFieldChange("title", "Abiball 2027")
      await catalog.saveEvent()
      catalog.eventFieldChange("bookingOpensAt", "")
      await catalog.saveEvent()
      expect(openingTimes).toEqual([event.bookingOpensAt, ""])
    } finally {
      dispose()
    }
  })
})

test("invalid release dates do not reach the event API", async () => {
  await createRoot(async (dispose) => {
    try {
      let saved = false
      const catalog = adminCatalogPageStateCreate({
        events: () => [event],
        isServerAuthorized: () => true,
        reloadEvents: async () => createResult([event]),
        eventUpsert: async (input) => {
          saved = true
          return createResult({ eventKey: input.eventKey, catalogVersion: 2 })
        },
      })
      catalog.selectEvent(event)
      catalog.eventFieldChange("bookingOpensAt", "2026-02-30T10:00:00.000Z")
      expect(await catalog.saveEvent()).toBeUndefined()
      expect(saved).toBe(false)
      expect(catalog.errorMessage()).toContain("gültigen Buchungsstart")
    } finally {
      dispose()
    }
  })
})
