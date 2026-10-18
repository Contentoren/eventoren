import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../../seed/dashSeedCreate.ts"
import { dashStoreCreate, type DashStore } from "../../dashStoreCreate.ts"
import { dashCodeBulkCreate } from "./dashCodeBulkCreate.ts"
import { dashCodeBulkPatch } from "./dashCodeBulkPatch.ts"
import { dashCodeDelete } from "./dashCodeDelete.ts"
import { dashCodeSetActive } from "./dashCodeSetActive.ts"
import { dashCodeUpsert } from "./dashCodeUpsert.ts"

function codesStoreCreate(): DashStore {
  return dashStoreCreate({
    storage: null,
    now: () => new Date("2026-10-18T10:00:00.000Z"),
    seed: (now) => dashSeedCreate(now),
    schedule: (fn) => fn(),
  })
}

describe("dashCodeUpsert", () => {
  test("erstellt einen Rabattcode in Großbuchstaben", () => {
    const store = codesStoreCreate()
    try {
      const result = dashCodeUpsert(
        {
          eventId: "ev-jazz-wein",
          kind: "rabatt",
          code: "herbst20",
          ticketTypeIds: [],
          maxTickets: 60,
          validFrom: null,
          validUntil: null,
          active: true,
          note: "Herbst",
          discount: { type: "prozent", value: 2000 },
        },
        store,
      )
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Upsert schlug fehl")
      expect(result.data.code).toBe("HERBST20")
      expect(store.state.audit.at(-1)?.action).toContain("HERBST20 erstellt")
    } finally {
      store.dispose()
    }
  })

  test("lehnt doppelte Codes und ungültige Rabatte ab", () => {
    const store = codesStoreCreate()
    try {
      const duplicate = dashCodeUpsert(
        {
          eventId: "ev-jazz-wein",
          kind: "rabatt",
          code: "jazz10",
          ticketTypeIds: [],
          maxTickets: null,
          validFrom: null,
          validUntil: null,
          active: true,
          note: "",
          discount: { type: "prozent", value: 500 },
        },
        store,
      )
      expect(duplicate.success).toBe(false)
      if (duplicate.success) throw new Error("Duplikat wurde angenommen")
      expect(duplicate.errorMessage).toContain("bereits")
      const tooMuch = dashCodeUpsert(
        {
          eventId: "ev-jazz-wein",
          kind: "rabatt",
          code: "NEU-99",
          ticketTypeIds: [],
          maxTickets: null,
          validFrom: null,
          validUntil: null,
          active: true,
          note: "",
          discount: { type: "prozent", value: 12000 },
        },
        store,
      )
      expect(tooMuch.success).toBe(false)
      const zugangOhne = dashCodeUpsert(
        {
          eventId: "ev-jazz-wein",
          kind: "zugang",
          code: "NEU-ZUGANG",
          ticketTypeIds: [],
          maxTickets: null,
          validFrom: null,
          validUntil: null,
          active: true,
          note: "",
          discount: null,
        },
        store,
      )
      expect(zugangOhne.success).toBe(false)
      if (zugangOhne.success) throw new Error("Zugang ohne Ticketart angenommen")
      expect(zugangOhne.errorMessage).toContain("versteckte Ticketart")
      const sichtbare = dashCodeUpsert(
        {
          eventId: "ev-jazz-wein",
          kind: "zugang",
          code: "NEU-SICHTBAR",
          ticketTypeIds: ["tt-jazz-a"],
          maxTickets: null,
          validFrom: null,
          validUntil: null,
          active: true,
          note: "",
          discount: null,
        },
        store,
      )
      expect(sichtbare.success).toBe(false)
    } finally {
      store.dispose()
    }
  })

  test("prüft die Gültigkeitsreihenfolge", () => {
    const store = codesStoreCreate()
    try {
      const result = dashCodeUpsert(
        {
          eventId: "ev-jazz-wein",
          kind: "rabatt",
          code: "ZEIT-1",
          ticketTypeIds: [],
          maxTickets: null,
          validFrom: "2026-12-01T00:00:00.000Z",
          validUntil: "2026-11-01T00:00:00.000Z",
          active: true,
          note: "",
          discount: { type: "prozent", value: 1000 },
        },
        store,
      )
      expect(result.success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})

describe("dashCodeBulkCreate", () => {
  test("erzeugt mehrere Codes mit Präfix", () => {
    const store = codesStoreCreate()
    try {
      const result = dashCodeBulkCreate(
        {
          eventId: "ev-jazz-wein",
          prefix: "TEST-",
          count: 10,
          kind: "rabatt",
          discount: { type: "prozent", value: 2000 },
          ticketTypeIds: [],
          maxTickets: 5,
          validFrom: null,
          validUntil: null,
        },
        store,
      )
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Bulk schlug fehl")
      expect(result.data).toHaveLength(10)
      expect(new Set(result.data.map((code) => code.code)).size).toBe(10)
      for (const code of result.data) expect(code.code.startsWith("TEST-")).toBe(true)
    } finally {
      store.dispose()
    }
  })

  test("lehnt Mengen außerhalb 1..500 ab", () => {
    const store = codesStoreCreate()
    try {
      const result = dashCodeBulkCreate(
        {
          eventId: "ev-jazz-wein",
          prefix: "X-",
          count: 501,
          kind: "rabatt",
          discount: { type: "prozent", value: 1000 },
          ticketTypeIds: [],
          maxTickets: null,
          validFrom: null,
          validUntil: null,
        },
        store,
      )
      expect(result.success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})

describe("dashCodeSetActive / dashCodeBulkPatch / dashCodeDelete", () => {
  test("schaltet Codes um, ändert Limit und Gültigkeit", () => {
    const store = codesStoreCreate()
    try {
      const toggled = dashCodeSetActive(["code-jazz10"], false, store)
      expect(toggled.success).toBe(true)
      expect(store.state.codes.find((code) => code.id === "code-jazz10")?.active).toBe(false)
      const patched = dashCodeBulkPatch(
        ["code-jazz10"],
        { maxTickets: 77, validUntil: "2026-12-24T23:59:00.000Z" },
        store,
      )
      expect(patched.success).toBe(true)
      const code = store.state.codes.find((entry) => entry.id === "code-jazz10")
      expect(code?.maxTickets).toBe(77)
      expect(code?.validUntil).toBe("2026-12-24T23:59:00.000Z")
    } finally {
      store.dispose()
    }
  })

  test("löscht nur ungenutzte Codes", () => {
    const store = codesStoreCreate()
    try {
      const created = dashCodeUpsert(
        {
          eventId: "ev-jazz-wein",
          kind: "rabatt",
          code: "WEG-DAMIT",
          ticketTypeIds: [],
          maxTickets: null,
          validFrom: null,
          validUntil: null,
          active: true,
          note: "",
          discount: { type: "betrag", value: 300 },
        },
        store,
      )
      expect(created.success).toBe(true)
      if (!created.success) throw new Error("Anlage schlug fehl")
      const marked = store.update("test", (draft) => {
        const target = draft.codes.find((entry) => entry.id === "code-freunde5")
        if (!target) throw new Error("Seed-Code fehlt")
        target.usedTickets = 4
      })
      expect(marked.success).toBe(true)
      const result = dashCodeDelete([created.data.id, "code-freunde5"], store)
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Löschen schlug fehl")
      expect(result.data.deleted).toBe(1)
      expect(result.data.skipped).toBe(1)
      expect(store.state.codes.some((entry) => entry.id === created.data.id)).toBe(false)
      expect(store.state.codes.some((entry) => entry.id === "code-freunde5")).toBe(true)
    } finally {
      store.dispose()
    }
  })
})
