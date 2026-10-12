import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { adminCatalogPageStateCreate } from "../src/admin/adminCatalogPageStateCreate.ts"
import { adminTicketProductsFormStateCreate } from "../src/admin/adminTicketProductsFormStateCreate.ts"
import type { AdminEventItem } from "../src/admin/AdminEventItem.ts"
import type { CatalogTicketTierUpsertInput } from "../src/catalog/client/CatalogTicketTierUpsertInput.ts"

function tierInputBase(): Omit<CatalogTicketTierUpsertInput, "token"> {
  return {
    eventKey: "concert",
    tierKey: "ticket-1",
    name: "General admission",
    description: "",
    startsAt: "2026-10-01T18:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    additionalDoorsAt: [],
    endsAt: "2026-10-01T22:00:00.000Z",
    priceCents: 1000,
    feeCents: 0,
    capacity: 100,
    maxPerOrder: 10,
    sortOrder: 1,
  }
}

describe("admin ticket activation code requirement", () => {
  test("new tiers default to no code requirement and legacy tiers fall back to false when selected", async () => {
    await createRoot(async (dispose) => {
      try {
        const catalog = adminCatalogPageStateCreate({
          events: () => [],
          isServerAuthorized: () => true,
          reloadEvents: async () => ({ success: true, data: [] }),
        })
        const form = adminTicketProductsFormStateCreate(catalog)
        form.newTier()
        expect(catalog.tierDraft().activationCodeRequired).toBe(false)

        form.selectTier({
          id: "legacy-ticket",
          name: "Legacy",
          description: "",
          priceCents: 500,
          feeCents: 0,
          capacity: 50,
          available: 50,
        })
        expect(catalog.tierDraft().activationCodeRequired).toBe(false)

        form.selectTier({
          id: "gated-ticket",
          name: "Gated",
          description: "",
          priceCents: 500,
          feeCents: 0,
          capacity: 50,
          available: 50,
          activationCodeRequired: true,
        })
        expect(catalog.tierDraft().activationCodeRequired).toBe(true)
      } finally {
        dispose()
      }
    })
  })

  test("saveTier passes the flag through and reorderTier preserves it", async () => {
    await createRoot(async (dispose) => {
      try {
        const saved: Omit<CatalogTicketTierUpsertInput, "token">[] = []
        const first: AdminEventItem = {
          id: "concert",
          status: "draft",
          catalogVersion: 1,
          title: "Concert",
          subtitle: "",
          description: "",
          category: "konzerte",
          startsAt: "2026-10-01T18:00:00.000Z",
          doorsAt: "2026-10-01T17:00:00.000Z",
          endsAt: "2026-10-01T22:00:00.000Z",
          venue: "Hall",
          city: "Berlin",
          address: "",
          organizer: "Eventoren",
          imageUrl: "",
          imageAlt: "",
          tags: [],
          soldOut: false,
          tiers: [
            {
              id: "ticket-1",
              name: "First",
              description: "",
              priceCents: 1000,
              feeCents: 0,
              capacity: 100,
              available: 100,
              activationCodeRequired: true,
            },
            {
              id: "ticket-2",
              name: "Second",
              description: "",
              priceCents: 1000,
              feeCents: 0,
              capacity: 100,
              available: 100,
              activationCodeRequired: false,
            },
          ],
        }
        const catalog = adminCatalogPageStateCreate({
          events: () => [first],
          isServerAuthorized: () => true,
          reloadEvents: async () => ({ success: true, data: [first] }),
          ticketTierUpsert: async (input) => {
            saved.push({ ...tierInputBase(), ...input })
            return { success: true, data: { tierKey: input.tierKey, catalogVersion: 1 } }
          },
        })
        catalog.selectEvent(first)

        catalog.tierFieldChange("tierKey", "ticket-1")
        catalog.tierFieldChange("name", "General admission")
        catalog.tierFieldChange("startsAt", "2026-10-01T18:00:00.000Z")
        catalog.tierFieldChange("endsAt", "2026-10-01T22:00:00.000Z")
        catalog.tierFieldChange("priceCents", "1000")
        catalog.tierFieldChange("feeCents", "0")
        catalog.tierFieldChange("capacity", "100")
        catalog.tierFieldChange("maxPerOrder", "10")
        catalog.tierFieldChange("activationCodeRequired", true)
        await catalog.saveTier()
        expect(saved.at(-1)).toMatchObject({ tierKey: "ticket-1", activationCodeRequired: true })
        const savedBeforeReorder = saved.length

        await catalog.reorderTier("ticket-1", "ticket-2")
        const reordered = saved.slice(savedBeforeReorder)
        expect(reordered).toHaveLength(2)
        expect(reordered).toContainEqual(expect.objectContaining({ tierKey: "ticket-1", activationCodeRequired: true }))
        expect(reordered).toContainEqual(
          expect.objectContaining({ tierKey: "ticket-2", activationCodeRequired: false }),
        )
      } finally {
        dispose()
      }
    })
  })
})
