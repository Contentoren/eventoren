import { describe, expect, test } from "bun:test"
import { dashStoreCreate } from "../../../store/dashStoreCreate.ts"
import { dashSeedCreate } from "../../../store/seed/dashSeedCreate.ts"
import { dashMessageRecipientsCount } from "./dashMessageRecipientsCount.ts"
import { dashMessageRender } from "./dashMessageRender.ts"
import { dashMessageSheetPlaceholders } from "./dashMessageSheetPlaceholders.ts"
import { dashMessageSheetTemplates } from "./dashMessageSheetTemplates.ts"

function messagesModelStoreCreate() {
  return dashStoreCreate({
    storage: null,
    now: () => new Date("2026-10-18T10:00:00.000Z"),
    seed: (now) => dashSeedCreate(now),
    schedule: (fn) => fn(),
  })
}

describe("dashMessageRecipientsCount", () => {
  test("zählt nur gültige Tickets lebendiger Bestellungen", () => {
    const store = messagesModelStoreCreate()
    try {
      const all = dashMessageRecipientsCount(store.state, "ev-jazz-wein", { type: "alle", ticketTypeIds: [] })
      expect(all).toBeGreaterThan(0)
    } finally {
      store.dispose()
    }
  })

  test("filtert nach Einlassstatus konsistent", () => {
    const store = messagesModelStoreCreate()
    try {
      const checkedIn = dashMessageRecipientsCount(store.state, "ev-jazz-wein", {
        type: "eingecheckt",
        ticketTypeIds: [],
      })
      const notCheckedIn = dashMessageRecipientsCount(store.state, "ev-jazz-wein", {
        type: "nicht-eingecheckt",
        ticketTypeIds: [],
      })
      const all = dashMessageRecipientsCount(store.state, "ev-jazz-wein", { type: "alle", ticketTypeIds: [] })
      expect(checkedIn + notCheckedIn).toBeGreaterThanOrEqual(0)
      expect(checkedIn).toBeLessThanOrEqual(all)
      expect(notCheckedIn).toBeLessThanOrEqual(all)
    } finally {
      store.dispose()
    }
  })

  test("filtert nach Ticketarten", () => {
    const store = messagesModelStoreCreate()
    try {
      const typeId = store.state.ticketTypes.find((type) => type.eventId === "ev-jazz-wein")?.id ?? "unbekannt"
      const filtered = dashMessageRecipientsCount(store.state, "ev-jazz-wein", {
        type: "ticketarten",
        ticketTypeIds: [typeId],
      })
      const all = dashMessageRecipientsCount(store.state, "ev-jazz-wein", { type: "alle", ticketTypeIds: [] })
      expect(filtered).toBeLessThanOrEqual(all)
    } finally {
      store.dispose()
    }
  })
})

describe("dashMessageRender", () => {
  test("ersetzt vorname, event und datum", () => {
    expect(
      dashMessageRender("Hallo {vorname}, {event} am {datum}!", { vorname: "Lea", event: "Jazz", datum: "7.11." }),
    ).toBe("Hallo Lea, Jazz am 7.11.!")
  })

  test("lässt unbekannte Platzhalter stehen", () => {
    expect(dashMessageRender("Hallo {name}!", { vorname: "Lea", event: "Jazz", datum: "7.11." })).toBe("Hallo {name}!")
  })
})

describe("dashMessageSheetTemplates", () => {
  test("deckt jede Nachrichtenart mit Betreff und Text ab", () => {
    for (const kind of ["info", "aenderung", "absage", "erinnerung"] as const) {
      const template = dashMessageSheetTemplates[kind]
      expect(template.subject.length).toBeGreaterThan(0)
      expect(template.body.length).toBeGreaterThan(0)
    }
  })

  test("Vorlagen rendern mit Beispielkontext ohne Platzhalter", () => {
    const context = { vorname: "Lea", event: "Jazz im Hof", datum: "7. November" }
    for (const kind of ["info", "aenderung", "absage", "erinnerung"] as const) {
      const template = dashMessageSheetTemplates[kind]
      const subject = dashMessageRender(template.subject, context)
      const body = dashMessageRender(`Hallo {vorname},\n\n${template.body}`, context)
      expect(subject).not.toContain("{event}")
      expect(body).not.toContain("{vorname}")
      expect(body).toContain("Lea")
    }
  })
})

describe("dashMessageSheetPlaceholders", () => {
  test("liefert vorname, event und datum", () => {
    expect([...dashMessageSheetPlaceholders()]).toEqual(["{vorname}", "{event}", "{datum}"])
  })
})
