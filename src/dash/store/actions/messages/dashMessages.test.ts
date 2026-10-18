import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../../seed/dashSeedCreate.ts"
import { dashStoreCreate, type DashStore } from "../../dashStoreCreate.ts"
import { dashMessageDelete } from "./dashMessageDelete.ts"
import { dashMessageSave } from "./dashMessageSave.ts"
import { dashMessageSchedule } from "./dashMessageSchedule.ts"
import { dashMessageSend } from "./dashMessageSend.ts"
import { dashReminderUpdate } from "./dashReminderUpdate.ts"

function messagesStoreCreate(): DashStore {
  return dashStoreCreate({
    storage: null,
    now: () => new Date("2026-10-18T10:00:00.000Z"),
    seed: (now) => dashSeedCreate(now),
    schedule: (fn) => fn(),
  })
}

describe("dashMessageSave", () => {
  test("speichert einen Entwurf und lehnt leere Felder ab", () => {
    const store = messagesStoreCreate()
    try {
      const saved = dashMessageSave(
        {
          eventId: "ev-jazz-wein",
          kind: "info",
          audience: { type: "alle", ticketTypeIds: [] },
          subject: "Wichtiges Update",
          body: "Hallo {vorname}!",
        },
        store,
      )
      expect(saved.success).toBe(true)
      if (!saved.success) throw new Error("Speichern schlug fehl")
      expect(saved.data.status).toBe("entwurf")
      const empty = dashMessageSave(
        {
          eventId: "ev-jazz-wein",
          kind: "info",
          audience: { type: "alle", ticketTypeIds: [] },
          subject: " ",
          body: "x",
        },
        store,
      )
      expect(empty.success).toBe(false)
    } finally {
      store.dispose()
    }
  })

  test("lehnt Änderungen an gesendeten Nachrichten ab", () => {
    const store = messagesStoreCreate()
    try {
      const bad = dashMessageSave(
        {
          id: "msg-indie-erinnerung",
          eventId: "ev-indie-night",
          kind: "erinnerung",
          audience: { type: "alle", ticketTypeIds: [] },
          subject: "Neu",
          body: "Neu",
        },
        store,
      )
      expect(bad.success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})

describe("dashMessageSend", () => {
  test("sendet einen Entwurf mit Empfängerzahl", () => {
    const store = messagesStoreCreate()
    try {
      const sent = dashMessageSend("msg-jazz-programm", store)
      expect(sent.success).toBe(true)
      if (!sent.success) throw new Error("Senden schlug fehl")
      expect(sent.data.status).toBe("gesendet")
      expect(sent.data.sentAt).not.toBeNull()
      expect(sent.data.recipientCount).toBeGreaterThan(0)
      expect(sent.data.openRateBps).toBeNull()
    } finally {
      store.dispose()
    }
  })
})

describe("dashMessageSchedule", () => {
  test("plant in der Zukunft und lehnt Vergangenheit ab", () => {
    const store = messagesStoreCreate()
    try {
      const future = dashMessageSchedule("msg-jazz-programm", "2026-11-07T19:00:00.000Z", store)
      expect(future.success).toBe(true)
      if (!future.success) throw new Error("Planen schlug fehl")
      expect(future.data.status).toBe("geplant")
      const past = dashMessageSchedule("msg-jazz-programm", "2026-10-01T19:00:00.000Z", store)
      expect(past.success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})

describe("dashMessageDelete", () => {
  test("löscht Entwürfe, nicht aber Gesendete", () => {
    const store = messagesStoreCreate()
    try {
      const gone = dashMessageDelete("msg-jazz-programm", store)
      expect(gone.success).toBe(true)
      const kept = dashMessageDelete("msg-indie-erinnerung", store)
      expect(kept.success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})

describe("dashReminderUpdate", () => {
  test("schaltet die Erinnerung um", () => {
    const store = messagesStoreCreate()
    try {
      const result = dashReminderUpdate({ eventId: "ev-jazz-wein", patch: { enabled: false } }, store)
      expect(result.success).toBe(true)
      const event = store.state.events.find((candidate) => candidate.id === "ev-jazz-wein")
      expect(event?.reminder.enabled).toBe(false)
    } finally {
      store.dispose()
    }
  })
})
