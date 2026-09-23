import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { adminCatalogPageStateCreate } from "../src/admin/adminCatalogPageStateCreate.ts"
import { adminEventDetailsFormStateCreate } from "../src/admin/adminEventDetailsFormStateCreate.ts"
import { adminEventNewCatalogStateCreate } from "../src/admin/adminEventNewCatalogStateCreate.ts"
import type { AdminEventItem } from "../src/admin/AdminEventItem.ts"
import { createResult } from "../src/ui/createResult.ts"

describe("admin catalog page state", () => {
  test("saves an unsaved event before its first ticket and keeps the publish selection", async () => {
    await createRoot(async (dispose) => {
      try {
        const calls: string[] = []
        let events: AdminEventItem[] = []
        const original = adminCatalogPageStateCreate({
          events: () => events,
          isServerAuthorized: () => true,
          reloadEvents: async () => ({ success: true, data: events }),
          eventUpsert: async (input) => {
            calls.push("event")
            events = [
              {
                id: input.eventKey,
                title: input.title,
                status: input.status ?? "draft",
                catalogVersion: 1,
                subtitle: input.subtitle,
                description: input.description,
                category: input.category,
                startsAt: input.startsAt,
                endsAt: input.endsAt,
                doorsAt: input.doorsAt,
                venue: input.venue,
                city: input.city,
                address: input.address,
                organizer: input.organizer,
                imageUrl: input.imageUrl,
                imageAlt: input.imageAlt,
                tags: input.tags,
                soldOut: false,
                tiers: [],
              },
            ]
            return createResult({ eventKey: input.eventKey, catalogVersion: 1 })
          },
          ticketTierUpsert: async (input) => {
            calls.push("ticket")
            events = [
              {
                ...events[0]!,
                tiers: [
                  {
                    id: input.tierKey,
                    name: input.name,
                    description: input.description,
                    priceCents: input.priceCents,
                    feeCents: input.feeCents,
                    capacity: input.capacity,
                    available: input.capacity,
                  },
                ],
              },
            ]
            return createResult({ tierKey: input.tierKey, catalogVersion: 2 })
          },
        })
        const catalog = adminEventNewCatalogStateCreate(original)
        catalog.eventFieldChange("title", "New concert")
        catalog.eventFieldChange("status", "published")
        catalog.tierFieldChange("tierKey", "standard")
        catalog.tierFieldChange("name", "Standard")
        catalog.tierFieldChange("priceCents", "2500")
        catalog.tierFieldChange("feeCents", "0")
        catalog.tierFieldChange("capacity", "20")

        await catalog.saveTier()

        expect(calls).toEqual(["event", "ticket"])
        expect(catalog.selectedEvent()?.tiers[0]?.name).toBe("Standard")
        expect(catalog.eventDraft().status).toBe("published")
        expect(catalog.selectedEventKey()).toMatch(/^new-concert-/u)
      } finally {
        dispose()
      }
    })
  })

  test("offers the published catalog status before an event has a ticket product", () => {
    const catalog = adminCatalogPageStateCreate({
      events: () => [],
      isServerAuthorized: () => true,
      reloadEvents: async () => ({ success: true, data: [] }),
    })
    const form = adminEventDetailsFormStateCreate({ catalog })

    expect(form.statusOptions()).toContain("published")
    expect(form.canPublish()).toBe(false)
  })

  test("saves a new event as a draft until a ticket product allows publication", async () => {
    await createRoot(async (dispose) => {
      try {
        let savedStatus = ""
        const state = adminCatalogPageStateCreate({
          events: () => [],
          isServerAuthorized: () => true,
          reloadEvents: async () => ({ success: true, data: [] }),
          eventUpsert: async (input) => {
            savedStatus = input.status ?? ""
            return createResult({ eventKey: input.eventKey, catalogVersion: 1 })
          },
        })
        state.eventFieldChange("eventKey", "new-concert")
        state.eventFieldChange("title", "New concert")
        state.eventFieldChange("status", "published")

        await state.saveEvent()

        expect(savedStatus).toBe("draft")
      } finally {
        dispose()
      }
    })
  })

  test("publishing saves edited event details before making them public", async () => {
    await createRoot(async (dispose) => {
      try {
        const event: AdminEventItem = {
          id: "concert",
          status: "draft" as const,
          catalogVersion: 1,
          title: "Original title",
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
          tiers: [
            {
              id: "standard",
              name: "Standard",
              description: "",
              priceCents: 2000,
              feeCents: 0,
              capacity: 100,
              available: 100,
            },
          ],
        }
        const calls: string[] = []
        let stored = event
        const state = adminCatalogPageStateCreate({
          events: () => [event],
          isServerAuthorized: () => true,
          reloadEvents: async () => ({ success: true, data: [stored] }),
          eventUpsert: async (input) => {
            calls.push("save")
            stored = { ...stored, title: input.title, status: input.status ?? "draft" }
            return createResult({ eventKey: input.eventKey, catalogVersion: 2 })
          },
          eventPublish: async ({ eventKey }) => {
            calls.push("publish")
            stored = { ...stored, status: "published" }
            return createResult({ eventKey, catalogVersion: 3 })
          },
        })
        state.selectEvent(event)
        state.eventFieldChange("title", "Updated title")
        state.eventFieldChange("status", "published")

        await state.publishEvent()

        expect(calls).toEqual(["save", "publish"])
        expect(state.selectedEvent()?.title).toBe("Updated title")
        expect(state.eventDraft().status).toBe("published")
        expect(state.errorMessage()).toBe("")
      } finally {
        dispose()
      }
    })
  })

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

  test("does not replace a manually edited image URL when an upload finishes", async () => {
    await createRoot(async (dispose) => {
      try {
        let resolveUpload!: (result: ReturnType<typeof createResult<{ assetId: string; detail: string; card: string; organizer: string }>>) => void
        const state = adminCatalogPageStateCreate({
          events: () => [],
          isServerAuthorized: () => true,
          reloadEvents: async () => ({ success: true, data: [] }),
          imageUpload: () => new Promise((resolve) => { resolveUpload = resolve }),
        })
        state.eventFieldChange("eventKey", "new-event")
        state.eventFieldChange("title", "Edited title")
        const form = adminEventDetailsFormStateCreate({ catalog: state })
        const upload = form.imageUpload(new File(["image"], "event.png", { type: "image/png" }))

        form.imageUrlChange("https://example.com/manual.webp")
        resolveUpload(createResult({ assetId: "asset", detail: "https://example.com/upload.webp", card: "card", organizer: "organizer" }))
        await upload

        expect(state.eventDraft().imageUrl).toBe("https://example.com/manual.webp")
        expect(state.eventDraft().imageVariants).toBeUndefined()
        expect(state.eventDraft().title).toBe("Edited title")
      } finally {
        dispose()
      }
    })
  })

  test("ignores an upload after the draft is reset to the same event key", async () => {
    await createRoot(async (dispose) => {
      try {
        let resolveUpload!: (result: ReturnType<typeof createResult<{ assetId: string; detail: string; card: string; organizer: string }>>) => void
        const event: AdminEventItem = {
          id: "same-event", status: "draft", catalogVersion: 1, title: "Current title", subtitle: "", description: "",
          category: "konzerte" as const, startsAt: "2026-10-01T18:00:00.000Z", endsAt: "2026-10-01T22:00:00.000Z",
          doorsAt: "2026-10-01T17:00:00.000Z", venue: "Hall", city: "Berlin", address: "", organizer: "Eventoren",
          imageUrl: "https://example.com/current.webp", imageAlt: "", tags: [], soldOut: false, tiers: [],
        }
        const state = adminCatalogPageStateCreate({
          events: () => [event],
          isServerAuthorized: () => true,
          reloadEvents: async () => ({ success: true, data: [event] }),
          imageUpload: () => new Promise((resolve) => { resolveUpload = resolve }),
        })
        state.selectEvent(event)
        const form = adminEventDetailsFormStateCreate({ catalog: state })
        const upload = form.imageUpload(new File(["image"], "event.png", { type: "image/png" }))

        state.selectEvent(event)
        state.eventFieldChange("title", "Newer title")
        resolveUpload(createResult({ assetId: "asset", detail: "https://example.com/upload.webp", card: "card", organizer: "organizer" }))
        await upload

        expect(state.eventDraft().imageUrl).toBe(event.imageUrl)
        expect(state.eventDraft().title).toBe("Newer title")
        expect(state.eventDraft().imageVariants).toBeUndefined()
      } finally {
        dispose()
      }
    })
  })
})
