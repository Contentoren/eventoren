import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { adminCatalogPageStateCreate } from "../src/admin/adminCatalogPageStateCreate.ts"
import { adminTicketProductsFormStateCreate } from "../src/admin/adminTicketProductsFormStateCreate.ts"
import type { AdminEventItem } from "../src/admin/AdminEventItem.ts"
import type { CatalogEventUpsertInput } from "../src/catalog/client/CatalogEventUpsertInput.ts"
import type { CatalogTicketTierUpsertInput } from "../src/catalog/client/CatalogTicketTierUpsertInput.ts"
import { createResult } from "../src/ui/createResult.ts"

const dateCases = [
  { name: "reversed 19:00/18:00", startsAt: "2026-10-01T19:00:00Z", endsAt: "2026-10-01T18:00:00Z", valid: false },
  { name: "equal", startsAt: "2026-10-01T19:00:00Z", endsAt: "2026-10-01T19:00:00Z", valid: false },
  {
    name: "reversed offset instants",
    startsAt: "2026-10-01T18:00:00Z",
    endsAt: "2026-10-01T19:00:00+02:00",
    valid: false,
  },
  {
    name: "equal offset instants",
    startsAt: "2026-10-01T19:00:00+02:00",
    endsAt: "2026-10-01T17:00:00Z",
    valid: false,
  },
  { name: "invalid start", startsAt: "invalid", endsAt: "2026-10-01T19:00:00Z", valid: false },
  { name: "invalid end", startsAt: "2026-10-01T19:00:00Z", endsAt: "invalid", valid: false },
  { name: "valid offset instants", startsAt: "2026-10-01T19:00:00+02:00", endsAt: "2026-10-01T18:00:00Z", valid: true },
  { name: "valid overnight", startsAt: "2026-10-01T22:00:00Z", endsAt: "2026-10-02T01:00:00Z", valid: true },
]

function eventCreate(): AdminEventItem {
  return {
    id: "concert",
    status: "draft",
    catalogVersion: 1,
    title: "Concert",
    subtitle: "",
    description: "",
    category: "konzerte",
    startsAt: "2026-10-03T18:00:00Z",
    endsAt: "2026-10-03T22:00:00Z",
    doorsAt: "2027-10-01T18:00:00Z",
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
      startsAt: "2026-10-01T18:00:00Z",
      endsAt: "2026-10-01T22:00:00Z",
      doorsAt: "2027-10-01T18:00:00Z",
      priceCents: 100,
      feeCents: 0,
      capacity: 10,
      available: 10,
      sortOrder: index + 1,
    })),
  }
}

function setup(event = eventCreate()) {
  const eventWrites: Omit<CatalogEventUpsertInput, "token">[] = []
  const tierWrites: Omit<CatalogTicketTierUpsertInput, "token">[] = []
  let reloadCalls = 0
  const catalog = adminCatalogPageStateCreate({
    events: () => [event],
    isServerAuthorized: () => true,
    reloadEvents: async () => {
      reloadCalls += 1
      return createResult([event])
    },
    eventUpsert: async (input) => {
      eventWrites.push(input)
      return createResult({ eventKey: input.eventKey, catalogVersion: 2 })
    },
    ticketTierUpsert: async (input) => {
      tierWrites.push(input)
      return createResult({ tierKey: input.tierKey, catalogVersion: 2 })
    },
  })
  catalog.selectEvent(event)
  catalog.selectTier(event.tiers[0]!)
  return { catalog, eventWrites, tierWrites, reloadCalls: () => reloadCalls }
}

describe("bounded admin date-order validation", () => {
  test.each(dateCases)("tier form validates $name before calling saveTier", async ({ startsAt, endsAt, valid }) => {
    await createRoot(async (dispose) => {
      try {
        const { catalog, tierWrites } = setup()
        catalog.tierFieldChange("startsAt", startsAt)
        catalog.tierFieldChange("endsAt", endsAt)
        let saveCalls = 0
        const form = adminTicketProductsFormStateCreate({
          ...catalog,
          saveTier: async () => {
            saveCalls += 1
            await catalog.saveTier()
          },
        })
        const draft = catalog.tierDraft()
        await form.submit({ preventDefault() {} } as SubmitEvent)
        expect(saveCalls).toBe(valid ? 1 : 0)
        expect(tierWrites).toHaveLength(valid ? 1 : 0)
        expect(form.validationMessage()).toBe(
          valid
            ? ""
            : startsAt === "invalid" || endsAt === "invalid"
              ? "Beginn und Ende müssen gültige Datums- und Uhrzeitangaben sein."
              : "Das Ende muss nach dem Beginn liegen.",
        )
        if (!valid) expect(catalog.tierDraft()).toBe(draft)
      } finally {
        dispose()
      }
    })
  })

  test.each(dateCases)(
    "direct tier save validates $name without changing independent times",
    async ({ startsAt, endsAt, valid }) => {
      await createRoot(async (dispose) => {
        try {
          const { catalog, tierWrites, reloadCalls } = setup()
          catalog.tierFieldChange("startsAt", startsAt)
          catalog.tierFieldChange("endsAt", endsAt)
          const draft = catalog.tierDraft()
          await catalog.saveTier()
          expect(tierWrites).toHaveLength(valid ? 1 : 0)
          expect(reloadCalls()).toBe(valid ? 1 : 0)
          expect(catalog.isSaving()).toBe(false)
          if (valid) expect(tierWrites[0]).toMatchObject({ startsAt, endsAt, doorsAt: "2027-10-01T18:00:00Z" })
          if (!valid) {
            expect(catalog.errorMessage()).not.toBe("")
            expect(catalog.tierDraft()).toBe(draft)
          }
        } finally {
          dispose()
        }
      })
    },
  )

  test.each(dateCases)(
    "reorder preflights a later tier with $name before any writes or optimistic updates",
    async ({ startsAt, endsAt, valid }) => {
      await createRoot(async (dispose) => {
        try {
          const event = eventCreate()
          event.tiers = event.tiers.map((tier, index) => (index === 0 ? { ...tier, startsAt, endsAt } : tier))
          const { catalog, tierWrites, reloadCalls } = setup(event)
          const events = catalog.events()
          await catalog.reorderTier("first", "third")
          expect(tierWrites).toHaveLength(valid ? 3 : 0)
          expect(reloadCalls()).toBe(valid ? 1 : 0)
          expect(catalog.isSaving()).toBe(false)
          if (valid) expect(tierWrites[2]).toMatchObject({ tierKey: "first", startsAt, endsAt })
          if (!valid) {
            expect(catalog.events()).toBe(events)
            expect(catalog.selectedEvent()?.tiers.map((tier) => tier.id)).toEqual(["first", "second", "third"])
            expect(catalog.errorMessage()).not.toBe("")
          }
        } finally {
          dispose()
        }
      })
    },
  )

  test.each([
    ...dateCases,
    { name: "empty draft", startsAt: "", endsAt: "", valid: true },
    { name: "start-only draft", startsAt: "2026-10-01T19:00:00Z", endsAt: "", valid: true },
    { name: "end-only draft", startsAt: "", endsAt: "2026-10-01T19:00:00Z", valid: true },
  ])("event save validates $name and preserves optional draft dates", async ({ startsAt, endsAt, valid }) => {
    await createRoot(async (dispose) => {
      try {
        const { catalog, eventWrites, reloadCalls } = setup()
        catalog.eventFieldChange("startsAt", startsAt)
        catalog.eventFieldChange("endsAt", endsAt)
        const draft = catalog.eventDraft()
        const revision = catalog.eventDraftRevision()
        await catalog.saveEvent()
        expect(eventWrites).toHaveLength(valid ? 1 : 0)
        expect(reloadCalls()).toBe(valid ? 1 : 0)
        expect(catalog.eventDraftRevision()).toBe(revision)
        expect(catalog.isSaving()).toBe(false)
        if (valid) expect(eventWrites[0]).toMatchObject({ startsAt, endsAt, doorsAt: "2027-10-01T18:00:00Z" })
        if (!valid) {
          expect(catalog.eventDraft()).toBe(draft)
          expect(catalog.errorMessage()).not.toBe("")
        }
      } finally {
        dispose()
      }
    })
  })

  test("invalid optional event doors time prevents writes even in an otherwise empty draft", async () => {
    await createRoot(async (dispose) => {
      try {
        const { catalog, eventWrites, reloadCalls } = setup()
        catalog.eventFieldChange("startsAt", "")
        catalog.eventFieldChange("endsAt", "")
        catalog.eventFieldChange("doorsAt", "invalid")
        await catalog.saveEvent()
        expect(eventWrites).toEqual([])
        expect(reloadCalls()).toBe(0)
        expect(catalog.errorMessage()).toBe("Event-Zeitpunkte müssen gültige Datums- und Uhrzeitangaben sein.")
      } finally {
        dispose()
      }
    })
  })
})
