import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { adminCatalogPageStateCreate } from "../src/admin/adminCatalogPageStateCreate.ts"
import { adminTicketProductsFormStateCreate } from "../src/admin/adminTicketProductsFormStateCreate.ts"
import type { AdminEventItem } from "../src/admin/AdminEventItem.ts"
import { adminDateTimeIsoFromLocal } from "../src/admin/adminDateTimeIsoFromLocal.ts"

describe("admin ticket products form state", () => {
  test("new tiers inherit event times and datetime-local changes round-trip through ISO", async () => {
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
          tiers: [],
        }
        const catalog = adminCatalogPageStateCreate({
          events: () => [event],
          isServerAuthorized: () => true,
          reloadEvents: async () => ({ success: true, data: [event] }),
        })
        catalog.selectEvent(event)
        const form = adminTicketProductsFormStateCreate(catalog)
        form.newTier()

        expect(catalog.tierDraft()).toMatchObject({
          startsAt: event.startsAt,
          doorsAt: event.doorsAt,
          endsAt: event.endsAt,
        })
        expect(form.startsAt()).toBe("2026-10-01T18:00")
        form.startsAtChange("2026-10-03T19:30")
        expect(catalog.tierDraft().startsAt).toBe(adminDateTimeIsoFromLocal("2026-10-03T19:30") ?? "")
      } finally {
        dispose()
      }
    })
  })

  test("rejects a missing required date before submitting the tier", async () => {
    await createRoot(async (dispose) => {
      try {
        let saveCalled = false
        const catalog = adminCatalogPageStateCreate({
          events: () => [],
          isServerAuthorized: () => true,
          reloadEvents: async () => ({ success: true, data: [] }),
          ticketTierUpsert: async () => {
            saveCalled = true
            return { success: false, op: "test", errorMessage: "unexpected" }
          },
        })
        catalog.eventFieldChange("eventKey", "concert")
        catalog.tierFieldChange("tierKey", "ticket-1")
        catalog.tierFieldChange("name", "General admission")
        catalog.tierFieldChange("startsAt", "2026-10-01T18:00:00.000Z")
        catalog.tierFieldChange("endsAt", "")
        catalog.tierFieldChange("capacity", "10")
        const form = adminTicketProductsFormStateCreate(catalog)
        form.priceEuro.set("10")
        form.feeEuro.set("0")
        await form.submit({ preventDefault() {} } as SubmitEvent)

        expect(saveCalled).toBe(false)
        expect(form.validationMessage()).toBe("Beginn und Ende sind erforderlich. Bitte gib beide Zeitpunkte ein.")
      } finally {
        dispose()
      }
    })
  })

  test("additional admission times can be added, edited, removed and saved", async () => {
    await createRoot(async (dispose) => {
      try {
        const saved: { additionalDoorsAt: string[]; doorsAt: string }[] = []
        const catalog = adminCatalogPageStateCreate({
          events: () => [],
          isServerAuthorized: () => true,
          reloadEvents: async () => ({ success: true, data: [] }),
          ticketTierUpsert: async (input) => {
            saved.push({ additionalDoorsAt: input.additionalDoorsAt ?? [], doorsAt: input.doorsAt ?? "" })
            return { success: true, data: { tierKey: input.tierKey, catalogVersion: 1 } }
          },
        })
        catalog.eventFieldChange("eventKey", "concert")
        const form = adminTicketProductsFormStateCreate(catalog)
        form.newTier()
        catalog.tierFieldChange("name", "Early entry")
        catalog.tierFieldChange("capacity", "10")
        form.startsAtChange("2026-10-01T18:00")
        form.endsAtChange("2026-10-01T22:00")
        form.doorsAtChange("")
        form.priceEuro.set("10")
        form.feeEuro.set("0")
        form.addDoorsAt()
        await form.submit({ preventDefault() {} } as SubmitEvent)
        expect(saved).toEqual([])
        form.additionalDoorsAtChange(0, "2026-10-01T17:00")
        expect(form.additionalDoorsAt()).toEqual(["2026-10-01T17:00"])
        await form.submit({ preventDefault() {} } as SubmitEvent)
        expect(saved).toEqual([
          {
            additionalDoorsAt: [adminDateTimeIsoFromLocal("2026-10-01T17:00")!],
            doorsAt: adminDateTimeIsoFromLocal("2026-10-01T18:00")!,
          },
        ])
      } finally {
        dispose()
      }
    })
  })
})
