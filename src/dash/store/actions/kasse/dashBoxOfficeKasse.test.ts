import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../../seed/dashSeedCreate.ts"
import { dashStoreCreate, type DashStore } from "../../dashStoreCreate.ts"
import { dashBoxOfficeGuestBuy } from "./dashBoxOfficeGuestBuy.ts"
import { dashBoxOfficeSaleCancel } from "./dashBoxOfficeSaleCancel.ts"
import { dashBoxOfficeSaleCreate } from "./dashBoxOfficeSaleCreate.ts"
import { dashBoxOfficeSalePay } from "./dashBoxOfficeSalePay.ts"

function kasseStoreCreate(): DashStore {
  return dashStoreCreate({
    storage: null,
    now: () => new Date("2026-10-18T10:00:00.000Z"),
    seed: (now) => dashSeedCreate(now),
    schedule: (fn) => fn(),
  })
}

const akLines = [{ ticketTypeId: "tt-indie-abendkasse", quantity: 2 }]

describe("dashBoxOfficeSaleCreate", () => {
  test("legt einen wartenden Vorgang mit Phasenpreis an", () => {
    const store = kasseStoreCreate()
    try {
      const result = dashBoxOfficeSaleCreate({ eventId: "ev-indie-night", lines: akLines }, store)
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Anlage schlug fehl")
      expect(result.data.status).toBe("wartet")
      expect(result.data.totalCents).toBe(2800 * 2)
      expect(result.data.lines[0]?.unitPriceCents).toBe(2800)
      const audit = store.state.audit.at(-1)
      expect(audit?.area).toBe("abendkasse")
    } finally {
      store.dispose()
    }
  })

  test("lehnt Online-Ticketarten und leere Körbe ab", () => {
    const store = kasseStoreCreate()
    try {
      const online = dashBoxOfficeSaleCreate(
        { eventId: "ev-indie-night", lines: [{ ticketTypeId: "tt-indie-stehplatz", quantity: 1 }] },
        store,
      )
      expect(online.success).toBe(false)
      const empty = dashBoxOfficeSaleCreate({ eventId: "ev-indie-night", lines: [] }, store)
      expect(empty.success).toBe(false)
      const unknown = dashBoxOfficeSaleCreate({ eventId: "ev-unbekannt", lines: akLines }, store)
      expect(unknown.success).toBe(false)
    } finally {
      store.dispose()
    }
  })

  test("lehnt mehr als das Restkontingent ab", () => {
    const store = kasseStoreCreate()
    try {
      const result = dashBoxOfficeSaleCreate(
        { eventId: "ev-indie-night", lines: [{ ticketTypeId: "tt-indie-abendkasse", quantity: 500 }] },
        store,
      )
      expect(result.success).toBe(false)
      if (result.success) throw new Error("Überbuchung wurde angenommen")
      expect(result.errorMessage).toContain("nur noch")
    } finally {
      store.dispose()
    }
  })
})

describe("dashBoxOfficeSalePay", () => {
  test("bezahlt einen Vorgang, checkt Tickets ein und schreibt einen Scan", () => {
    const store = kasseStoreCreate()
    try {
      const created = dashBoxOfficeSaleCreate({ eventId: "ev-indie-night", lines: akLines }, store)
      expect(created.success).toBe(true)
      if (!created.success) throw new Error("Anlage schlug fehl")
      const paid = dashBoxOfficeSalePay(
        { saleId: created.data.id, buyerName: "Lea Schneider", buyerEmail: "lea@example.de", method: "applepay" },
        store,
      )
      expect(paid.success).toBe(true)
      if (!paid.success) throw new Error("Zahlung schlug fehl")
      expect(paid.data.order.channel).toBe("abendkasse")
      expect(paid.data.order.payment.method).toBe("applepay")
      expect(paid.data.tickets).toHaveLength(2)
      for (const ticket of paid.data.tickets) {
        expect(ticket.checkedInAt).not.toBeNull()
        expect(ticket.entrance).toBe("Abendkasse")
      }
      const scans = store.state.scans.filter(
        (scan) => scan.ticketId && paid.data.tickets.some((t) => t.id === scan.ticketId),
      )
      expect(scans).toHaveLength(2)
      expect(scans[0]?.entrance).toBe("Abendkasse")
      const sale = store.state.boxOfficeSales.find((candidate) => candidate.id === created.data.id)
      expect(sale?.status).toBe("bezahlt")
      expect(sale?.orderId).toBe(paid.data.order.id)
      expect(sale?.buyerEmail).toBe("lea@example.de")
      const audit = store.state.audit.at(-1)
      expect(audit?.area).toBe("abendkasse")
      expect(audit?.action).toContain("bezahlt")
      const again = dashBoxOfficeSalePay(
        { saleId: created.data.id, buyerName: "Lea Schneider", buyerEmail: "lea@example.de", method: "karte" },
        store,
      )
      expect(again.success).toBe(false)
    } finally {
      store.dispose()
    }
  })

  test("lehnt fehlende Namen und E-Mails freundlich ab", () => {
    const store = kasseStoreCreate()
    try {
      const created = dashBoxOfficeSaleCreate({ eventId: "ev-indie-night", lines: akLines }, store)
      expect(created.success).toBe(true)
      if (!created.success) throw new Error("Anlage schlug fehl")
      const noName = dashBoxOfficeSalePay(
        { saleId: created.data.id, buyerName: "  ", buyerEmail: "lea@example.de", method: "karte" },
        store,
      )
      expect(noName.success).toBe(false)
      const noMail = dashBoxOfficeSalePay(
        { saleId: created.data.id, buyerName: "Lea Schneider", buyerEmail: "keine-mail", method: "karte" },
        store,
      )
      expect(noMail.success).toBe(false)
      const unknown = dashBoxOfficeSalePay(
        { saleId: "sale-unbekannt", buyerName: "Lea Schneider", buyerEmail: "lea@example.de", method: "karte" },
        store,
      )
      expect(unknown.success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})

describe("dashBoxOfficeSaleCancel", () => {
  test("bricht einen wartenden Vorgang ab, bezahlte nicht", () => {
    const store = kasseStoreCreate()
    try {
      const created = dashBoxOfficeSaleCreate({ eventId: "ev-indie-night", lines: akLines }, store)
      expect(created.success).toBe(true)
      if (!created.success) throw new Error("Anlage schlug fehl")
      const cancelled = dashBoxOfficeSaleCancel(created.data.id, store)
      expect(cancelled.success).toBe(true)
      if (!cancelled.success) throw new Error("Abbruch schlug fehl")
      expect(cancelled.data.status).toBe("abgebrochen")
      const paid = dashBoxOfficeSalePay(
        { saleId: created.data.id, buyerName: "Lea Schneider", buyerEmail: "lea@example.de", method: "karte" },
        store,
      )
      expect(paid.success).toBe(false)
      const again = dashBoxOfficeSaleCancel(created.data.id, store)
      expect(again.success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})

describe("dashBoxOfficeGuestBuy", () => {
  test("kauft ohne Vorgang in einem Schritt und checkt ein", () => {
    const store = kasseStoreCreate()
    try {
      const result = dashBoxOfficeGuestBuy(
        {
          eventId: "ev-indie-night",
          lines: [{ ticketTypeId: "tt-indie-abendkasse", quantity: 1 }],
          buyerName: "Max Mustermann",
          buyerEmail: "max@example.de",
          method: "googlepay",
        },
        store,
      )
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Kauf schlug fehl")
      expect(result.data.order.channel).toBe("abendkasse")
      expect(result.data.tickets[0]?.checkedInAt).not.toBeNull()
      const sales = store.state.boxOfficeSales.filter((candidate) => candidate.eventId === "ev-indie-night")
      expect(sales.some((sale) => sale.status === "bezahlt" && sale.orderId === result.data.order.id)).toBe(true)
    } finally {
      store.dispose()
    }
  })
})
