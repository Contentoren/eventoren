import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../seed/dashSeedCreate.ts"
import { dashStoreCreate, type DashStore } from "../dashStoreCreate.ts"
import { dashEventPatch } from "./dashEventPatch.ts"
import { dashOrderCreate } from "./dashOrderCreate.ts"
import { dashOrderEmailLog } from "./dashOrderEmailLog.ts"
import { dashTicketCheckIn } from "./dashTicketCheckIn.ts"
import { dashTicketCheckInUndo } from "./dashTicketCheckInUndo.ts"
import { dashTicketScan } from "./dashTicketScan.ts"
import { dashTicketTypeDelete } from "./dashTicketTypeDelete.ts"
import { dashTicketTypeReorder } from "./dashTicketTypeReorder.ts"
import { dashTicketTypeUpsert } from "./dashTicketTypeUpsert.ts"

function dashActionTestStoreCreate(): DashStore {
  return dashStoreCreate({
    storage: null,
    now: () => new Date(),
    seed: (now) => dashSeedCreate(now),
    schedule: (fn) => fn(),
  })
}

const buyer = { firstName: "Max", lastName: "Mustermann", email: "max@example.de" }

describe("dashEventPatch", () => {
  test("setzt updatedAt und schreibt ein Audit", () => {
    const store = dashActionTestStoreCreate()
    try {
      const before = store.state.events.find((event) => event.id === "ev-lesung")
      const result = dashEventPatch(
        "ev-lesung",
        { title: "Lesung: Neue Stimmen" },
        { action: "Titel geändert", before: before?.title ?? null, after: "Lesung: Neue Stimmen" },
        store,
      )
      expect(result.success).toBe(true)
      const after = store.state.events.find((event) => event.id === "ev-lesung")
      expect(after?.title).toBe("Lesung: Neue Stimmen")
      expect(Date.parse(after?.updatedAt ?? "")).toBeGreaterThanOrEqual(Date.parse(before?.updatedAt ?? ""))
      const audit = store.state.audit.at(-1)
      expect(audit?.area).toBe("event")
      expect(audit?.action).toBe("Titel geändert")
    } finally {
      store.dispose()
    }
  })

  test("setzt publishedAt beim Veröffentlichen", () => {
    const store = dashActionTestStoreCreate()
    try {
      const before = store.state.events.find((event) => event.id === "ev-lesung")
      expect(before?.status).toBe("entwurf")
      const result = dashEventPatch("ev-lesung", { status: "veroeffentlicht" }, undefined, store)
      expect(result.success).toBe(true)
      const after = store.state.events.find((event) => event.id === "ev-lesung")
      expect(after?.status).toBe("veroeffentlicht")
      expect(after?.publishedAt).not.toBeNull()
    } finally {
      store.dispose()
    }
  })

  test("meldet unbekannte Events", () => {
    const store = dashActionTestStoreCreate()
    try {
      const result = dashEventPatch("ev-unbekannt", { title: "X" }, undefined, store)
      expect(result.success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})

describe("dashTicketTypeUpsert", () => {
  test("lehnt ein Kontingent unter verkauften Tickets ab", () => {
    const store = dashActionTestStoreCreate()
    try {
      const created = dashTicketTypeUpsert(
        {
          eventId: "ev-lesung",
          name: "Klein",
          description: "",
          channel: "online",
          hidden: false,
          capacity: 5,
          maxPerOrder: 10,
          taxRateBps: 700,
          archivedAt: null,
          salesStartAt: null,
          salesEndAt: null,
          phases: [{ id: "ph-klein", name: "Regulär", priceCents: 1000, endsAt: null, quota: null }],
        },
        store,
      )
      expect(created.success).toBe(true)
      if (!created.success) throw new Error("Anlage sollte gelingen")
      const ordered = dashOrderCreate(
        {
          eventId: "ev-lesung",
          lines: [{ ticketTypeId: created.data.id, quantity: 3 }],
          buyer,
          channel: "online",
          method: "karte",
        },
        store,
      )
      expect(ordered.success).toBe(true)
      const shrunk = dashTicketTypeUpsert({ ...created.data, capacity: 2 }, store)
      expect(shrunk.success).toBe(false)
      if (shrunk.success) throw new Error("Verkleinerung sollte scheitern")
      expect(shrunk.errorMessage).toContain("verkauften")
    } finally {
      store.dispose()
    }
  })

  test("schreibt einen Preis-Diff ins Audit", () => {
    const store = dashActionTestStoreCreate()
    try {
      const existing = store.state.ticketTypes.find((type) => type.id === "tt-jazz-a")
      if (!existing) throw new Error("Seed-Typ fehlt")
      const result = dashTicketTypeUpsert(
        {
          ...existing,
          phases: existing.phases.map((phase) => (phase.id === "ph-jazz-a-1" ? { ...phase, priceCents: 3600 } : phase)),
        },
        store,
      )
      expect(result.success).toBe(true)
      const audit = store.state.audit.at(-1)
      expect(audit?.area).toBe("tickets")
      expect(audit?.action).toBe("Preis von Sitzplatz Kategorie A · Phase 1 geändert")
      expect(audit?.before).toBe("34,00 €")
      expect(audit?.after).toBe("36,00 €")
    } finally {
      store.dispose()
    }
  })
})

describe("dashTicketTypeDelete", () => {
  test("löscht ohne Verkäufe und archiviert mit Verkäufen", () => {
    const store = dashActionTestStoreCreate()
    try {
      const created = dashTicketTypeUpsert(
        {
          eventId: "ev-lesung",
          name: "Weg",
          description: "",
          channel: "online",
          hidden: false,
          capacity: 5,
          maxPerOrder: 10,
          taxRateBps: 700,
          archivedAt: null,
          salesStartAt: null,
          salesEndAt: null,
          phases: [{ id: "ph-weg", name: "Regulär", priceCents: 1000, endsAt: null, quota: null }],
        },
        store,
      )
      expect(created.success).toBe(true)
      if (!created.success) throw new Error("Anlage sollte gelingen")
      const deleted = dashTicketTypeDelete(created.data.id, store)
      expect(deleted.success).toBe(true)
      if (!deleted.success) throw new Error("Löschen sollte gelingen")
      expect(deleted.data).toBe("geloescht")
      expect(store.state.ticketTypes.some((type) => type.id === created.data.id)).toBe(false)

      const ordered = dashOrderCreate(
        {
          eventId: "ev-jazz-wein",
          lines: [{ ticketTypeId: "tt-jazz-a", quantity: 1 }],
          buyer,
          channel: "online",
          method: "karte",
        },
        store,
      )
      expect(ordered.success).toBe(true)
      const archived = dashTicketTypeDelete("tt-jazz-a", store)
      expect(archived.success).toBe(true)
      if (!archived.success) throw new Error("Archivieren sollte gelingen")
      expect(archived.data).toBe("archiviert")
      expect(store.state.ticketTypes.find((type) => type.id === "tt-jazz-a")?.archivedAt).not.toBeNull()
    } finally {
      store.dispose()
    }
  })
})

describe("dashTicketTypeReorder", () => {
  test("sortiert Ticketarten eines Events", () => {
    const store = dashActionTestStoreCreate()
    try {
      const ids = store.state.ticketTypes
        .filter((type) => type.eventId === "ev-jazz-wein")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((type) => type.id)
      const reversed = [...ids].reverse()
      const result = dashTicketTypeReorder("ev-jazz-wein", reversed, store)
      expect(result.success).toBe(true)
      const after = store.state.ticketTypes
        .filter((type) => type.eventId === "ev-jazz-wein")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((type) => type.id)
      expect(after).toEqual(reversed)
    } finally {
      store.dispose()
    }
  })
})

describe("dashOrderCreate", () => {
  test("nutzt den aktiven Phasenpreis und schreibt ein Audit", () => {
    const store = dashActionTestStoreCreate()
    try {
      const maxNumber = Math.max(...store.state.orders.map((order) => Number(order.number.replace("EV-", ""))))
      const maxInvoice = Math.max(
        0,
        ...store.state.orders
          .map((order) => order.invoiceNumber)
          .filter((value) => value !== "")
          .map((value) => Number(value.replace("RE-2026-", ""))),
      )
      const result = dashOrderCreate(
        {
          eventId: "ev-jazz-wein",
          lines: [{ ticketTypeId: "tt-jazz-a", quantity: 2 }],
          buyer,
          channel: "online",
          method: "karte",
        },
        store,
      )
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Bestellung sollte gelingen")
      expect(result.data.order.lines[0]?.phaseId).toBe("ph-jazz-a-1")
      expect(result.data.order.lines[0]?.unitPriceCents).toBe(3400)
      expect(result.data.order.totalCents).toBe(6800 - 0 + 438)
      expect(result.data.order.number).toBe(`EV-${maxNumber + 1}`)
      expect(result.data.order.invoiceNumber).toBe(`RE-2026-${maxInvoice + 1}`)
      expect(result.data.tickets).toHaveLength(2)
      const audit = store.state.audit.at(-1)
      expect(audit?.area).toBe("bestellungen")
      expect(audit?.action).toContain(result.data.order.number)
    } finally {
      store.dispose()
    }
  })

  test("lehnt ausverkaufte Ticketarten ab", () => {
    const store = dashActionTestStoreCreate()
    try {
      const created = dashTicketTypeUpsert(
        {
          eventId: "ev-lesung",
          name: "Mini",
          description: "",
          channel: "online",
          hidden: false,
          capacity: 2,
          maxPerOrder: 10,
          taxRateBps: 700,
          archivedAt: null,
          salesStartAt: null,
          salesEndAt: null,
          phases: [{ id: "ph-mini", name: "Regulär", priceCents: 1000, endsAt: null, quota: null }],
        },
        store,
      )
      expect(created.success).toBe(true)
      if (!created.success) throw new Error("Anlage sollte gelingen")
      const full = dashOrderCreate(
        {
          eventId: "ev-lesung",
          lines: [{ ticketTypeId: created.data.id, quantity: 2 }],
          buyer,
          channel: "online",
          method: "karte",
        },
        store,
      )
      expect(full.success).toBe(true)
      const extra = dashOrderCreate(
        {
          eventId: "ev-lesung",
          lines: [{ ticketTypeId: created.data.id, quantity: 1 }],
          buyer,
          channel: "online",
          method: "karte",
        },
        store,
      )
      expect(extra.success).toBe(false)
      if (extra.success) throw new Error("Ausverkauft sollte scheitern")
      expect(extra.errorMessage).toContain("ausverkauft")
    } finally {
      store.dispose()
    }
  })

  test("JAZZ10 gibt Rabatt und zählt usedTickets hoch", () => {
    const store = dashActionTestStoreCreate()
    try {
      const beforeJazzUsed = store.state.codes.find((code) => code.code === "JAZZ10")?.usedTickets ?? 0
      const result = dashOrderCreate(
        {
          eventId: "ev-jazz-wein",
          lines: [{ ticketTypeId: "tt-jazz-a", quantity: 2 }],
          buyer,
          channel: "online",
          method: "karte",
          codeInput: "jazz10",
        },
        store,
      )
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Bestellung sollte gelingen")
      expect(result.data.order.discount?.code).toBe("JAZZ10")
      expect(result.data.order.discount?.amountCents).toBe(680)
      expect(result.data.order.totalCents).toBe(6800 - 680 + 438)
      expect(store.state.codes.find((code) => code.code === "JAZZ10")?.usedTickets).toBe(beforeJazzUsed + 2)
    } finally {
      store.dispose()
    }
  })

  test("Zugangscode schaltet versteckte Ticketart frei", () => {
    const store = dashActionTestStoreCreate()
    try {
      const beforePresseUsed = store.state.codes.find((code) => code.code === "PRESSE-JAZZ")?.usedTickets ?? 0
      const blocked = dashOrderCreate(
        {
          eventId: "ev-jazz-wein",
          lines: [{ ticketTypeId: "tt-jazz-presse", quantity: 1 }],
          buyer,
          channel: "online",
          method: "karte",
        },
        store,
      )
      expect(blocked.success).toBe(false)
      const result = dashOrderCreate(
        {
          eventId: "ev-jazz-wein",
          lines: [{ ticketTypeId: "tt-jazz-presse", quantity: 1 }],
          buyer,
          channel: "online",
          method: "karte",
          codeInput: "PRESSE-JAZZ",
        },
        store,
      )
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Bestellung sollte gelingen")
      expect(result.data.order.discount?.code).toBe("PRESSE-JAZZ")
      expect(result.data.order.discount?.amountCents).toBe(0)
      expect(result.data.order.payment.method).toBe("kostenlos")
      expect(store.state.codes.find((code) => code.code === "PRESSE-JAZZ")?.usedTickets).toBe(beforePresseUsed + 1)
    } finally {
      store.dispose()
    }
  })

  test("Gutschein wird eingelöst und mindert den Zahlbetrag", () => {
    const store = dashActionTestStoreCreate()
    try {
      const beforeBalance = store.state.vouchers.find((candidate) => candidate.code === "HOF-50-AMLX")?.balanceCents
      if (beforeBalance === undefined) throw new Error("Gutschein fehlt im Seed")
      const result = dashOrderCreate(
        {
          eventId: "ev-jazz-wein",
          lines: [{ ticketTypeId: "tt-jazz-b", quantity: 1 }],
          buyer,
          channel: "online",
          method: "karte",
          voucherCode: "HOF-50-AMLX",
        },
        store,
      )
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Bestellung sollte gelingen")
      expect(result.data.order.voucher?.code).toBe("HOF-50-AMLX")
      // totalCents enthält den Gutschein nicht als Abzug (Modell-Regel);
      // der Gutschein deckt die Summe inkl. Servicegebühr ab.
      expect(result.data.order.voucher?.amountCents).toBe(2900 + 194)
      expect(result.data.order.totalCents).toBe(2900 + 194)
      expect(result.data.order.payment.method).toBe("gutschein")
      const voucher = store.state.vouchers.find((candidate) => candidate.code === "HOF-50-AMLX")
      expect(voucher?.balanceCents).toBe(beforeBalance - (2900 + 194))
      expect(voucher?.redemptions.at(-1)?.orderId).toBe(result.data.order.id)
      expect(voucher?.redemptions.at(-1)?.amountCents).toBe(2900 + 194)
    } finally {
      store.dispose()
    }
  })

  test("checkIn checkt Tickets sofort ein und schreibt Scans", () => {
    const store = dashActionTestStoreCreate()
    try {
      const beforeOk = store.state.scans.filter((scan) => scan.result === "ok").length
      const result = dashOrderCreate(
        {
          eventId: "ev-jazz-wein",
          lines: [{ ticketTypeId: "tt-jazz-a", quantity: 1 }],
          buyer,
          channel: "abendkasse",
          method: "applepay",
          checkIn: { entrance: "Abendkasse", device: "Kasse-1" },
        },
        store,
      )
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Bestellung sollte gelingen")
      expect(result.data.tickets[0]?.checkedInAt).not.toBeNull()
      expect(result.data.tickets[0]?.entrance).toBe("Abendkasse")
      expect(store.state.scans.filter((scan) => scan.result === "ok")).toHaveLength(beforeOk + 1)
    } finally {
      store.dispose()
    }
  })
})

describe("dashTicketScan", () => {
  test("ok, doppelt, unbekannt, falsches-event, storniert", () => {
    const store = dashActionTestStoreCreate()
    try {
      const beforeScans = store.state.scans.length
      const jazz = dashOrderCreate(
        {
          eventId: "ev-jazz-wein",
          lines: [{ ticketTypeId: "tt-jazz-a", quantity: 1 }],
          buyer,
          channel: "online",
          method: "karte",
        },
        store,
      )
      expect(jazz.success).toBe(true)
      if (!jazz.success) throw new Error("Bestellung sollte gelingen")
      const code = jazz.data.tickets[0]?.code ?? ""
      const first = dashTicketScan("ev-jazz-wein", code, "Haupteingang", "Scanner-1", store)
      expect(first.success).toBe(true)
      if (!first.success) throw new Error("Scan sollte gelingen")
      expect(first.data.result).toBe("ok")
      const second = dashTicketScan("ev-jazz-wein", code, "Haupteingang", "Scanner-1", store)
      expect(second.success).toBe(true)
      if (!second.success) throw new Error("Scan sollte gelingen")
      expect(second.data.result).toBe("doppelt")

      const unknown = dashTicketScan("ev-jazz-wein", "T-0000-0000", "Haupteingang", "Scanner-1", store)
      expect(unknown.success).toBe(true)
      if (!unknown.success) throw new Error("Scan sollte gelingen")
      expect(unknown.data.result).toBe("unbekannt")

      const ball = dashOrderCreate(
        {
          eventId: "ev-winterball",
          lines: [{ ticketTypeId: "tt-ball-regulaer", quantity: 1 }],
          buyer,
          channel: "online",
          method: "karte",
        },
        store,
      )
      expect(ball.success).toBe(true)
      if (!ball.success) throw new Error("Bestellung sollte gelingen")
      const foreign = dashTicketScan(
        "ev-jazz-wein",
        ball.data.tickets[0]?.code ?? "",
        "Haupteingang",
        "Scanner-1",
        store,
      )
      expect(foreign.success).toBe(true)
      if (!foreign.success) throw new Error("Scan sollte gelingen")
      expect(foreign.data.result).toBe("falsches-event")

      const ticketId = jazz.data.tickets[0]?.id ?? ""
      const marked = store.update("test", (draft) => {
        const target = draft.tickets.find((candidate) => candidate.id === ticketId)
        if (target) target.status = "storniert"
      })
      expect(marked.success).toBe(true)
      const cancelled = dashTicketScan("ev-jazz-wein", code, "Haupteingang", "Scanner-1", store)
      expect(cancelled.success).toBe(true)
      if (!cancelled.success) throw new Error("Scan sollte gelingen")
      expect(cancelled.data.result).toBe("storniert")
      expect(store.state.scans).toHaveLength(beforeScans + 5)

      const empty = dashTicketScan("ev-jazz-wein", "   ", "Haupteingang", "Scanner-1", store)
      expect(empty.success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})

describe("dashTicketCheckIn", () => {
  test("manueller Check-in und Rücknahme", () => {
    const store = dashActionTestStoreCreate()
    try {
      const ordered = dashOrderCreate(
        {
          eventId: "ev-jazz-wein",
          lines: [{ ticketTypeId: "tt-jazz-a", quantity: 1 }],
          buyer,
          channel: "online",
          method: "karte",
        },
        store,
      )
      expect(ordered.success).toBe(true)
      if (!ordered.success) throw new Error("Bestellung sollte gelingen")
      const ticketId = ordered.data.tickets[0]?.id ?? ""
      const checkIn = dashTicketCheckIn(ticketId, "Seiteneingang", store)
      expect(checkIn.success).toBe(true)
      expect(store.state.tickets.find((ticket) => ticket.id === ticketId)?.checkedInAt).not.toBeNull()
      expect(store.state.scans.at(-1)?.device).toBe("Manuell")
      const undo = dashTicketCheckInUndo(ticketId, store)
      expect(undo.success).toBe(true)
      expect(store.state.tickets.find((ticket) => ticket.id === ticketId)?.checkedInAt).toBeNull()
      expect(store.state.audit.at(-1)?.area).toBe("einlass")
    } finally {
      store.dispose()
    }
  })
})

describe("dashOrderEmailLog", () => {
  test("hängt eine E-Mail an die Bestellung an", () => {
    const store = dashActionTestStoreCreate()
    try {
      const ordered = dashOrderCreate(
        {
          eventId: "ev-jazz-wein",
          lines: [{ ticketTypeId: "tt-jazz-a", quantity: 1 }],
          buyer,
          channel: "online",
          method: "karte",
        },
        store,
      )
      expect(ordered.success).toBe(true)
      if (!ordered.success) throw new Error("Bestellung sollte gelingen")
      const logged = dashOrderEmailLog(ordered.data.order.id, "bestaetigung", store)
      expect(logged.success).toBe(true)
      const emails = store.state.orders.find((order) => order.id === ordered.data.order.id)?.emails ?? []
      expect(emails.length).toBeGreaterThanOrEqual(2)
      expect(emails.at(-1)?.kind).toBe("bestaetigung")
    } finally {
      store.dispose()
    }
  })
})
