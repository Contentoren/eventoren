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
        expect(form.showNewTier()).toBe(false)
        form.startNewTier()
        expect(form.showNewTier()).toBe(true)

        expect(catalog.tierDraft()).toMatchObject({
          tierKey: "ticket-1",
          startsAt: event.startsAt,
          doorsAt: event.doorsAt,
          endsAt: event.endsAt,
        })
        expect(form.startsAt()).toBe("2026-10-01T18:00")
        form.startsAtChange("2026-10-03T19:30")
        expect(catalog.tierDraft().startsAt).toBe(adminDateTimeIsoFromLocal("2026-10-03T19:30") ?? "")
        form.selectTier({
          id: "saved-ticket",
          name: "Saved ticket",
          description: "",
          priceCents: 500,
          feeCents: 0,
          capacity: 50,
          available: 50,
        })
        expect(form.showNewTier()).toBe(false)
        expect(catalog.tierDraft().tierKey).toBe("saved-ticket")
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

  test("additional admission ranges require valid ordered start and end times before saving", async () => {
    await createRoot(async (dispose) => {
      try {
        const saved: { additionalDoorsAt: { startsAt: string; endsAt: string }[]; doorsAt: string }[] = []
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
        expect(form.additionalDoorsAt()).toEqual([{ startsAt: "2026-10-01T17:00", endsAt: "" }])
        await form.submit({ preventDefault() {} } as SubmitEvent)
        expect(form.validationMessage()).toContain("Beginn und Ende")
        form.additionalDoorsAtEndChange(0, "2026-10-01T16:00")
        await form.submit({ preventDefault() {} } as SubmitEvent)
        expect(form.validationMessage()).toContain("Ende muss nach dem Beginn")
        form.additionalDoorsAtEndChange(0, "2026-10-01T18:00")
        await form.submit({ preventDefault() {} } as SubmitEvent)
        expect(saved).toEqual([
          {
            additionalDoorsAt: [
              {
                startsAt: adminDateTimeIsoFromLocal("2026-10-01T17:00")!,
                endsAt: adminDateTimeIsoFromLocal("2026-10-01T18:00")!,
              },
            ],
            doorsAt: adminDateTimeIsoFromLocal("2026-10-01T18:00")!,
          },
        ])
      } finally {
        dispose()
      }
    })
  })

  test("clearing or invalidating an additional range field clears only that endpoint", async () => {
    await createRoot(async (dispose) => {
      try {
        const catalog = adminCatalogPageStateCreate({
          events: () => [],
          isServerAuthorized: () => true,
          reloadEvents: async () => ({ success: true, data: [] }),
        })
        const form = adminTicketProductsFormStateCreate(catalog)
        form.newTier()
        form.startsAtChange("2026-10-01T17:00")
        form.startsAtChange("2026-02-30T17:00")
        expect(catalog.tierDraft().startsAt).toBe("")
        form.addDoorsAt()
        form.additionalDoorsAtChange(0, "2026-10-01T17:00")
        form.additionalDoorsAtEndChange(0, "2026-10-01T18:00")
        form.additionalDoorsAtEndChange(0, "")
        expect(catalog.tierDraft().additionalDoorsAt[0]).toEqual({
          startsAt: "2026-10-01T17:00:00.000Z",
          endsAt: "",
        })
        form.additionalDoorsAtEndChange(0, "2026-02-30T18:00")
        expect(catalog.tierDraft().additionalDoorsAt[0]).toEqual({
          startsAt: "2026-10-01T17:00:00.000Z",
          endsAt: "",
        })
        form.additionalDoorsAtEndChange(0, "2026-10-01T18:00")
        form.additionalDoorsAtChange(0, "")
        expect(catalog.tierDraft().additionalDoorsAt[0]).toEqual({
          startsAt: "",
          endsAt: "2026-10-01T18:00:00.000Z",
        })
        form.additionalDoorsAtChange(0, "2026-02-30T17:00")
        expect(catalog.tierDraft().additionalDoorsAt[0]).toEqual({
          startsAt: "",
          endsAt: "2026-10-01T18:00:00.000Z",
        })
        expect(form.validationMessage()).toBe("Bitte gib ein gültiges Datum mit Uhrzeit ein.")
      } finally {
        dispose()
      }
    })
  })

  test("editing a legacy admission keeps its start and prompts for an end; zero prices remain visible", async () => {
    await createRoot(async (dispose) => {
      try {
        const catalog = adminCatalogPageStateCreate({
          events: () => [],
          isServerAuthorized: () => true,
          reloadEvents: async () => ({ success: true, data: [] }),
        })
        const form = adminTicketProductsFormStateCreate(catalog)
        form.selectTier({
          id: "legacy-ticket",
          name: "Legacy",
          description: "",
          priceCents: 0,
          feeCents: 0,
          capacity: 0,
          available: 0,
          additionalDoorsAt: [{ startsAt: "2026-10-01T17:00:00.000Z", endsAt: "" }],
        })
        expect(form.additionalDoorsAt()).toEqual([{ startsAt: "2026-10-01T17:00", endsAt: "" }])
        expect(form.priceEuro.get()).toBe("0,00")
        expect(form.feeEuro.get()).toBe("0,00")
      } finally {
        dispose()
      }
    })
  })

  test("new tiers default maxPerOrder to 10 and legacy tiers fall back to 10 when selected", async () => {
    await createRoot(async (dispose) => {
      try {
        const catalog = adminCatalogPageStateCreate({
          events: () => [],
          isServerAuthorized: () => true,
          reloadEvents: async () => ({ success: true, data: [] }),
        })
        const form = adminTicketProductsFormStateCreate(catalog)
        form.newTier()
        expect(catalog.tierDraft().maxPerOrder).toBe("10")

        form.selectTier({
          id: "legacy-ticket",
          name: "Legacy",
          description: "",
          priceCents: 500,
          feeCents: 0,
          capacity: 50,
          available: 50,
        })
        expect(catalog.tierDraft().maxPerOrder).toBe("10")

        form.selectTier({
          id: "limited-ticket",
          name: "Limited",
          description: "",
          priceCents: 500,
          feeCents: 0,
          capacity: 50,
          available: 50,
          maxPerOrder: 3,
        })
        expect(catalog.tierDraft().maxPerOrder).toBe("3")
      } finally {
        dispose()
      }
    })
  })

  test("saveTier rejects invalid maxPerOrder and persists configured values above 10", async () => {
    await createRoot(async (dispose) => {
      try {
        const saved: { maxPerOrder?: number }[] = []
        const catalog = adminCatalogPageStateCreate({
          events: () => [],
          isServerAuthorized: () => true,
          reloadEvents: async () => ({ success: true, data: [] }),
          ticketTierUpsert: async (input) => {
            saved.push({ maxPerOrder: input.maxPerOrder })
            return { success: true, data: { tierKey: input.tierKey, catalogVersion: 1 } }
          },
        })
        const form = adminTicketProductsFormStateCreate(catalog)
        catalog.eventFieldChange("eventKey", "concert")
        catalog.tierFieldChange("tierKey", "ticket-1")
        catalog.tierFieldChange("name", "General admission")
        catalog.tierFieldChange("startsAt", "2026-10-01T18:00:00.000Z")
        catalog.tierFieldChange("endsAt", "2026-10-01T22:00:00.000Z")
        catalog.tierFieldChange("priceCents", "1000")
        catalog.tierFieldChange("feeCents", "0")
        catalog.tierFieldChange("capacity", "100")
        form.priceEuro.set("10")
        form.feeEuro.set("0")

        for (const maxPerOrder of ["0", "-1", "2.5", "abc", "9007199254740992"]) {
          catalog.tierFieldChange("maxPerOrder", maxPerOrder)
          await form.submit({ preventDefault() {} } as SubmitEvent)
          expect(form.validationMessage()).toBe("Die Höchstmenge je Bestellung muss eine ganze Zahl ab 1 sein.")
        }
        expect(saved).toEqual([])

        catalog.tierFieldChange("maxPerOrder", "")
        await catalog.saveTier()
        expect(saved).toEqual([{ maxPerOrder: 10 }])

        catalog.tierFieldChange("tierKey", "ticket-1")
        catalog.tierFieldChange("name", "General admission")
        catalog.tierFieldChange("startsAt", "2026-10-01T18:00:00.000Z")
        catalog.tierFieldChange("endsAt", "2026-10-01T22:00:00.000Z")
        catalog.tierFieldChange("priceCents", "1000")
        catalog.tierFieldChange("feeCents", "0")
        catalog.tierFieldChange("capacity", "100")
        catalog.tierFieldChange("maxPerOrder", "25")
        await catalog.saveTier()
        expect(saved).toEqual([{ maxPerOrder: 10 }, { maxPerOrder: 25 }])
        expect(catalog.errorMessage()).toBe("")
      } finally {
        dispose()
      }
    })
  })
})
