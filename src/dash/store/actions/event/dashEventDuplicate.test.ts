import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../../seed/dashSeedCreate.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreCreate } from "../../dashStoreCreate.ts"
import { dashOrderCreate } from "../dashOrderCreate.ts"
import { dashEventDuplicate } from "./dashEventDuplicate.ts"
import { dashEventPublish } from "./dashEventPublish.ts"
import { dashEventSalesPause } from "./dashEventSalesPause.ts"
import { dashEventCancel } from "./dashEventCancel.ts"
import { dashTemplateCreateFromEvent } from "./dashTemplateCreateFromEvent.ts"
import { dashTemplateDelete } from "./dashTemplateDelete.ts"
import { dashTemplateRename } from "./dashTemplateRename.ts"

function dashEventActionsStoreCreate(): DashStore {
  return dashStoreCreate({
    storage: null,
    now: () => new Date("2026-10-18T10:00:00.000Z"),
    seed: (now) => dashSeedCreate(now),
    schedule: (fn) => fn(),
  })
}

const buyer = { firstName: "Max", lastName: "Mustermann", email: "max@example.de" }

describe("dashEventDuplicate", () => {
  test("erzeugt einen Entwurf mit neuem Slug und mitverschobenen Zeiten ohne Codes", () => {
    const store = dashEventActionsStoreCreate()
    try {
      const source = store.state.events.find((event) => event.id === "ev-jazz-wein")
      if (!source) throw new Error("Seed-Event fehlt")
      const startsAt = new Date(Date.parse(source.startsAt) + 7 * 24 * 3_600_000).toISOString()
      const result = dashEventDuplicate({ eventId: source.id, startsAt }, store)
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Duplikat sollte gelingen")
      expect(result.data.id).toMatch(/^ev-[a-z0-9]{6}$/)
      expect(result.data.slug).not.toBe(source.slug)
      expect(result.data.status).toBe("entwurf")
      expect(result.data.publishedAt).toBeNull()
      expect(result.data.cancelReason).toBe("")
      expect(result.data.salesPaused).toBe(false)
      expect(result.data.reminder.sentAt).toBeNull()
      expect(result.data.startsAt).toBe(startsAt)
      expect(Date.parse(result.data.endsAt) - Date.parse(source.endsAt)).toBe(7 * 24 * 3_600_000)
      const copied = store.state.ticketTypes.filter((type) => type.eventId === result.data.id)
      expect(copied.length).toBe(store.state.ticketTypes.filter((type) => type.eventId === source.id).length)
      expect(copied.every((type) => type.eventId === result.data.id)).toBe(true)
      expect(store.state.codes.some((code) => copied.some((type) => code.ticketTypeIds.includes(type.id)))).toBe(false)
      expect(store.state.audit.at(-1)?.action).toContain("dupliziert")
      const second = dashEventDuplicate({ eventId: source.id, startsAt }, store)
      expect(second.success).toBe(true)
      if (!second.success || !result.success) throw new Error("Zweites Duplikat sollte gelingen")
      expect(second.data.slug).not.toBe(result.data.slug)
    } finally {
      store.dispose()
    }
  })

  test("meldet unbekannte Events und ungültige Daten", () => {
    const store = dashEventActionsStoreCreate()
    try {
      expect(dashEventDuplicate({ eventId: "ev-unbekannt", startsAt: new Date().toISOString() }, store).success).toBe(
        false,
      )
      expect(dashEventDuplicate({ eventId: "ev-jazz-wein", startsAt: "kein-datum" }, store).success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})

describe("dashTemplateCreateFromEvent", () => {
  test("speichert Offsets relativ zum Beginn", () => {
    const store = dashEventActionsStoreCreate()
    try {
      const result = dashTemplateCreateFromEvent({ eventId: "ev-jazz-wein", name: "Jazz-Vorlage" }, store)
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Vorlage sollte gelingen")
      const source = store.state.events.find((event) => event.id === "ev-jazz-wein")
      expect(result.data.sourceEventId).toBe("ev-jazz-wein")
      expect(result.data.event.title).toBe(source?.title ?? "")
      expect(result.data.event.reminder.sentAt).toBeNull()
      expect(result.data.durationMinutes).toBe(
        Math.round((Date.parse(source?.endsAt ?? "") - Date.parse(source?.startsAt ?? "")) / 60_000),
      )
      expect(result.data.doorsBeforeMinutes).toBe(60)
      const standard = result.data.ticketTypes.find((type) => type.name === "Sitzplatz Kategorie A")
      expect(standard?.phases[2]?.endsOffsetMinutes).toBeNull()
      expect(standard?.phases[0]?.endsOffsetMinutes).toBeLessThan(0)
      expect(standard?.salesStartOffsetMinutes).toBeLessThan(0)
      const renamed = dashTemplateRename(result.data.id, "Jazz Abend", store)
      expect(renamed.success).toBe(true)
      expect(store.state.templates.find((template) => template.id === result.data.id)?.name).toBe("Jazz Abend")
      expect(dashTemplateRename(result.data.id, "Konzert im Hof", store).success).toBe(false)
      expect(dashTemplateDelete(result.data.id, store).success).toBe(true)
      expect(store.state.templates.some((template) => template.id === result.data.id)).toBe(false)
      expect(dashTemplateDelete(result.data.id, store).success).toBe(false)
    } finally {
      store.dispose()
    }
  })

  test("meldet leere und doppelte Namen", () => {
    const store = dashEventActionsStoreCreate()
    try {
      expect(dashTemplateCreateFromEvent({ eventId: "ev-jazz-wein", name: "  " }, store).success).toBe(false)
      expect(dashTemplateCreateFromEvent({ eventId: "ev-unbekannt", name: "Neu" }, store).success).toBe(false)
      expect(dashTemplateRename("tpl-unbekannt", "Neu", store).success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})
