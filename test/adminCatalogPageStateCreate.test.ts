import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { adminCatalogPageStateCreate } from "../src/admin/adminCatalogPageStateCreate.ts"
import { createResult } from "../src/ui/createResult.ts"

describe("admin catalog page state", () => {
  test("exposes an event selected after state creation during server rendering", () => {
    const event = {
      id: "draft-event",
      status: "draft" as const,
      catalogVersion: 1,
      title: "Draft event",
      subtitle: "",
      description: "",
      category: "konzerte" as const,
      startsAt: "2026-10-01T18:00:00.000Z",
      endsAt: "2026-10-01T22:00:00.000Z",
      doorsAt: "2026-10-01T17:00:00.000Z",
      venue: "Test hall",
      city: "Berlin",
      address: "Teststraße 1",
      organizer: "Eventoren",
      imageUrl: "/images/test.webp",
      imageAlt: "Test event",
      tags: [],
      soldOut: false,
      tiers: [],
    }
    const state = adminCatalogPageStateCreate({
      events: () => [event],
      isServerAuthorized: () => true,
      reloadEvents: async () => ({ success: true, data: [event] }),
    })

    state.selectEvent(event)

    expect(state.selectedEvent()?.id).toBe("draft-event")
  })

  test("turns a rejected event reload into feedback and always ends the saving state", async () => {
    await createRoot(async (dispose) => {
      try {
        const state = adminCatalogPageStateCreate({
          events: () => [],
          isServerAuthorized: () => true,
          reloadEvents: async () => {
            throw new Error("route invalidation failed")
          },
          eventUpsert: async () => createResult({ eventKey: "new-event", catalogVersion: 1 }),
        })
        state.eventFieldChange("eventKey", "new-event")
        state.eventFieldChange("title", "New event")

        await expect(state.saveEvent()).resolves.toBeUndefined()
        expect(state.isSaving()).toBe(false)
        expect(state.errorMessage()).toBe("Admin-Veranstaltungen konnten nicht geladen werden.")
      } finally {
        dispose()
      }
    })
  })

  test("turns an unexpected ticket mutation rejection into feedback and always ends the saving state", async () => {
    await createRoot(async (dispose) => {
      try {
        const state = adminCatalogPageStateCreate({
          events: () => [],
          isServerAuthorized: () => true,
          reloadEvents: async () => ({ success: true, data: [] }),
          ticketTierUpsert: async () => {
            throw new Error("connection lost")
          },
        })
        state.eventFieldChange("eventKey", "existing-event")
        state.tierFieldChange("tierKey", "standard")
        state.tierFieldChange("name", "Standard")
        state.tierFieldChange("priceCents", "2501")
        state.tierFieldChange("feeCents", "0")
        state.tierFieldChange("capacity", "10")

        await expect(state.saveTier()).resolves.toBeUndefined()
        expect(state.isSaving()).toBe(false)
        expect(state.errorMessage()).toBe("Ticketprodukt konnte nicht gespeichert werden.")
      } finally {
        dispose()
      }
    })
  })

  test("deletes the selected ticket product and clears its draft", async () => {
    await createRoot(async (dispose) => {
      try {
        const state = adminCatalogPageStateCreate({
          events: () => [],
          isServerAuthorized: () => true,
          reloadEvents: async () => ({ success: true, data: [] }),
          ticketTierDelete: async () => createResult({ tierKey: "standard", catalogVersion: 2 }),
        })
        state.eventFieldChange("eventKey", "existing-event")
        state.tierFieldChange("tierKey", "standard")

        await state.deleteTier()

        expect(state.tierDraft().tierKey).toBe("")
        expect(state.successMessage()).toBe("Ticketprodukt gelöscht.")
        expect(state.isSaving()).toBe(false)
      } finally {
        dispose()
      }
    })
  })
})
