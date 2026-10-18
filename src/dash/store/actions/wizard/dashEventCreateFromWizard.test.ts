import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../../seed/dashSeedCreate.ts"
import { dashStoreCreate } from "../../dashStoreCreate.ts"
import { dashEventCreateFromWizard } from "./dashEventCreateFromWizard.ts"

const fixedNow = new Date("2026-10-18T10:00:00.000Z")

function wizardInput() {
  return {
    title: "Herbstkonzert",
    subtitle: "Klangfarben im Hof",
    category: "konzert" as const,
    startsAt: "2026-11-20T19:30:00.000+01:00",
    endsAt: "2026-11-20T22:30:00.000+01:00",
    doorsAt: "2026-11-20T19:00:00.000+01:00",
    venue: { name: "Lindenhof", street: "Lindenhofstraße 12", zip: "04109", city: "Leipzig" },
    imageUrl: "https://example.test/bild.jpg",
    imageAlt: "Herbstkonzert im Hof",
    description: "Ein Abend voller Klang.",
    faq: [],
    schedule: [],
    visibility: "oeffentlich" as const,
    ticketTypes: [
      {
        name: "Standard",
        priceCents: 2500,
        capacity: 100,
        taxRateBps: 700 as const,
        hidden: false,
      },
    ],
    publish: false,
  }
}

describe("dashEventCreateFromWizard", () => {
  test("legt einen Entwurf mit id, eindeutigem Slug und Defaults an", () => {
    const store = dashStoreCreate({ storage: null, now: () => fixedNow, seed: (now) => dashSeedCreate(now) })
    try {
      const first = dashEventCreateFromWizard(wizardInput(), store)
      expect(first.success).toBe(true)
      if (!first.success) return
      expect(first.data.event.id.startsWith("ev-")).toBe(true)
      expect(first.data.event.id.length).toBe(9)
      expect(first.data.event.slug).toBe("herbstkonzert")
      expect(first.data.event.status).toBe("entwurf")
      expect(first.data.event.reminder).toMatchObject({ enabled: true, hoursBefore: 24 })
      expect(first.data.event.boxOffice).toEqual({ enabled: false, opensAt: null })
      expect(first.data.event.salesPaused).toBe(false)
      const types = store.state.ticketTypes.filter((type) => type.eventId === first.data.event.id)
      expect(types).toHaveLength(1)
      expect(types[0]?.channel).toBe("online")
      expect(types[0]?.maxPerOrder).toBe(10)
      expect(types[0]?.sortOrder).toBe(0)
      expect(types[0]?.phases.map((phase) => phase.name)).toEqual(["Regulär"])

      const second = dashEventCreateFromWizard(wizardInput(), store)
      expect(second.success).toBe(true)
      if (!second.success) return
      expect(second.data.event.slug).toBe("herbstkonzert-2")
      expect(store.state.audit.some((entry) => entry.area === "event" && entry.eventId === first.data.event.id)).toBe(
        true,
      )
    } finally {
      store.dispose()
    }
  })

  test("veröffentlicht bei publish=true, behält Fehlertext bei fehlendem Alt-Text", () => {
    const store = dashStoreCreate({ storage: null, now: () => fixedNow, seed: (now) => dashSeedCreate(now) })
    try {
      const withoutAlt = { ...wizardInput(), imageAlt: "", publish: true }
      const failed = dashEventCreateFromWizard(withoutAlt, store)
      expect(failed.success).toBe(true)
      if (!failed.success) return
      expect(failed.data.published).toBe(false)
      expect(failed.data.publishError).not.toBeNull()
      expect(failed.data.event.status).toBe("entwurf")

      const published = dashEventCreateFromWizard(wizardInput(), store)
      expect(published.success).toBe(true)
      if (!published.success) return
      // Beschreibung leer lassen? Nein: Input hat Beschreibung, aber der Slug ist belegt → dritter Slug.
      const again = dashEventCreateFromWizard({ ...wizardInput(), publish: true }, store)
      expect(again.success).toBe(true)
      if (!again.success) return
      expect(again.data.published).toBe(true)
      expect(again.data.publishError).toBeNull()
      expect(again.data.event.status).toBe("veroeffentlicht")
    } finally {
      store.dispose()
    }
  })

  test("lehnt leeren Titel, falsche Zeiten und leere Ticketliste ab", () => {
    const store = dashStoreCreate({ storage: null, now: () => fixedNow, seed: (now) => dashSeedCreate(now) })
    try {
      expect(dashEventCreateFromWizard({ ...wizardInput(), title: "  " }, store).success).toBe(false)
      expect(
        dashEventCreateFromWizard(
          { ...wizardInput(), startsAt: "2026-11-20T22:30:00.000+01:00", endsAt: "2026-11-20T19:30:00.000+01:00" },
          store,
        ).success,
      ).toBe(false)
      expect(dashEventCreateFromWizard({ ...wizardInput(), ticketTypes: [] }, store).success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})
