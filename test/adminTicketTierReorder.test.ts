import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { adminCatalogPageStateCreate } from "../src/admin/adminCatalogPageStateCreate.ts"
import type { AdminEventItem } from "../src/admin/AdminEventItem.ts"
import { createResult } from "../src/ui/createResult.ts"

test("dragging a ticket product saves sequential positions and keeps the selected product", async () => {
  await createRoot(async (dispose) => {
    try {
      const event: AdminEventItem = {
        id: "concert",
        status: "draft",
        catalogVersion: 1,
        title: "Concert",
        subtitle: "",
        description: "",
        category: "konzerte",
        startsAt: "",
        doorsAt: "",
        endsAt: "",
        venue: "",
        city: "",
        address: "",
        organizer: "",
        imageUrl: "",
        imageAlt: "",
        tags: [],
        soldOut: false,
        tiers: ["first", "second", "third"].map((id, index) => ({
          id,
          name: id,
          description: "",
          startsAt: "2026-10-01T18:00:00.000Z",
          doorsAt: "",
          additionalDoorsAt: ["2026-10-01T17:00:00.000Z"],
          endsAt: "2026-10-01T22:00:00.000Z",
          priceCents: 100,
          feeCents: 0,
          capacity: 10,
          available: 10,
          sortOrder: index + 1,
        })),
      }
      let stored = event
      const saved: string[] = []
      const savedAdmissions: string[][] = []
      const savedDoorsAt: string[] = []
      const state = adminCatalogPageStateCreate({
        events: () => [event],
        isServerAuthorized: () => true,
        reloadEvents: async () => ({ success: true, data: [stored] }),
        ticketTierUpsert: async (input) => {
          saved.push(`${input.tierKey}:${input.sortOrder}`)
          savedAdmissions.push(input.additionalDoorsAt ?? [])
          savedDoorsAt.push(input.doorsAt ?? "")
          stored = {
            ...stored,
            tiers: stored.tiers
              .map((tier) => (tier.id === input.tierKey ? { ...tier, sortOrder: input.sortOrder } : tier))
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
          }
          return createResult({ tierKey: input.tierKey, catalogVersion: 2 })
        },
      })
      state.selectEvent(event)
      state.selectTier(event.tiers[0]!)

      await state.reorderTier("first", "third")

      expect(saved).toEqual(["second:1", "third:2", "first:3"])
      expect(savedAdmissions).toEqual(Array.from({ length: 3 }, () => ["2026-10-01T17:00:00.000Z"]))
      expect(savedDoorsAt).toEqual(Array.from({ length: 3 }, () => "2026-10-01T18:00:00.000Z"))
      expect(state.selectedEvent()?.tiers.map((tier) => tier.id)).toEqual(["second", "third", "first"])
      expect(state.tierDraft().tierKey).toBe("first")
      expect(state.tierDraft().sortOrder).toBe("3")
    } finally {
      dispose()
    }
  })
})

test("reordering legacy tiers with missing dates does not partially save", async () => {
  await createRoot(async (dispose) => {
    try {
      const event: AdminEventItem = {
        id: "concert",
        status: "draft",
        catalogVersion: 1,
        title: "Concert",
        subtitle: "",
        description: "",
        category: "konzerte",
        startsAt: "",
        doorsAt: "",
        endsAt: "",
        venue: "",
        city: "",
        address: "",
        organizer: "",
        imageUrl: "",
        imageAlt: "",
        tags: [],
        soldOut: false,
        tiers: ["first", "second", "third"].map((id, index) => ({
          id,
          name: id,
          description: "",
          startsAt: "",
          doorsAt: "",
          additionalDoorsAt: [],
          endsAt: "",
          priceCents: 100,
          feeCents: 0,
          capacity: 10,
          available: 10,
          sortOrder: index + 1,
        })),
      }
      let saveCalls = 0
      const state = adminCatalogPageStateCreate({
        events: () => [event],
        isServerAuthorized: () => true,
        reloadEvents: async () => ({ success: true, data: [event] }),
        ticketTierUpsert: async () => {
          saveCalls += 1
          return createResult({ tierKey: "unexpected", catalogVersion: 2 })
        },
      })
      state.selectEvent(event)

      await state.reorderTier("first", "third")

      expect(saveCalls).toBe(0)
      expect(state.selectedEvent()?.tiers.map((tier) => tier.id)).toEqual(["first", "second", "third"])
      expect(state.errorMessage()).toBe("Beginn und Ende sind erforderlich. Bitte gib beide Zeitpunkte ein.")
    } finally {
      dispose()
    }
  })
})
