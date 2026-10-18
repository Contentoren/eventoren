import { describe, expect, test } from "bun:test"

import type { DashOrder } from "../../../model/dashOrderSchema.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreCreate } from "../../dashStoreCreate.ts"
import { dashSeedCreate } from "../../seed/dashSeedCreate.ts"
import { dashOrderCancel } from "./dashOrderCancel.ts"
import { dashOrderInvoicePdf } from "./dashOrderInvoicePdf.ts"
import { dashOrderNoteAdd } from "./dashOrderNoteAdd.ts"
import { dashOrderNoteDelete } from "./dashOrderNoteDelete.ts"
import { dashOrderRefund } from "./dashOrderRefund.ts"
import { dashOrderRefundableGet } from "./dashOrderRefundableGet.ts"
import { dashOrderResend } from "./dashOrderResend.ts"
import { dashTicketHolderUpdate } from "./dashTicketHolderUpdate.ts"

function orderStoreCreate(): DashStore {
  return dashStoreCreate({
    storage: null,
    now: () => new Date("2026-10-18T10:00:00.000Z"),
    seed: (now) => dashSeedCreate(now),
    schedule: (fn) => fn(),
  })
}

function orderPaidByTickets(store: DashStore, ticketCount: number): DashOrder {
  const found = store.state.orders.find((order) => {
    if (order.status !== "bezahlt") return false
    const tickets = store.state.tickets.filter((ticket) => ticket.orderId === order.id)
    return tickets.length === ticketCount && tickets.every((ticket) => ticket.status === "gueltig")
  })
  if (!found) throw new Error(`Keine bezahlte Bestellung mit ${ticketCount} Tickets im Seed.`)
  return found
}

describe("dashOrderRefundableGet", () => {
  test("berechnet Max, Ticket-Anteile und Servicegebühr", () => {
    const store = orderStoreCreate()
    try {
      const order = orderPaidByTickets(store, 2)
      const tickets = store.state.tickets.filter((ticket) => ticket.orderId === order.id)
      const refundable = dashOrderRefundableGet(order, tickets)
      expect(refundable.maxCents).toBe(order.totalCents)
      expect(refundable.ticketMaxCents).toBeGreaterThan(0)
      expect(refundable.feeRefundableCents).toBe(order.serviceFeeCents)
      expect(refundable.perTicket).toHaveLength(tickets.length)
      expect(refundable.perTicket.every((entry) => entry.refundable)).toBe(true)
    } finally {
      store.dispose()
    }
  })
})

describe("dashOrderRefund", () => {
  test("Teilerstattung pro Ticket storniert ein Ticket", () => {
    const store = orderStoreCreate()
    try {
      const order = orderPaidByTickets(store, 2)
      const tickets = store.state.tickets.filter((ticket) => ticket.orderId === order.id)
      const first = tickets[0]
      if (!first) throw new Error("Ticket fehlt")
      const result = dashOrderRefund(
        {
          orderId: order.id,
          mode: "tickets",
          ticketIds: [first.id],
          includeFee: false,
          invalidateTickets: true,
          reason: "Ein Gast kann nicht",
        },
        store,
      )
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Erstattung sollte gelingen")
      expect(result.data.status).toBe("teilerstattet")
      const updated = store.state.orders.find((candidate) => candidate.id === order.id)
      expect(updated?.status).toBe("teilerstattet")
      expect(updated?.refunds).toHaveLength(1)
      expect(store.state.tickets.find((ticket) => ticket.id === first.id)?.status).toBe("storniert")
      expect(updated?.emails.at(-1)?.kind).toBe("erstattung")
      expect(store.state.audit.at(-1)).toMatchObject({ area: "bestellungen" })
    } finally {
      store.dispose()
    }
  })

  test("Betrag über Max wird abgelehnt", () => {
    const store = orderStoreCreate()
    try {
      const order = orderPaidByTickets(store, 2)
      const result = dashOrderRefund(
        {
          orderId: order.id,
          mode: "betrag",
          amountCents: order.totalCents + 1,
          includeFee: false,
          invalidateTickets: false,
          reason: "Zu viel",
        },
        store,
      )
      expect(result.success).toBe(false)
    } finally {
      store.dispose()
    }
  })

  test("volle Erstattung inklusive Gebühr schließt ab", () => {
    const store = orderStoreCreate()
    try {
      const order = orderPaidByTickets(store, 1)
      const tickets = store.state.tickets.filter((ticket) => ticket.orderId === order.id)
      const result = dashOrderRefund(
        {
          orderId: order.id,
          mode: "tickets",
          ticketIds: tickets.map((ticket) => ticket.id),
          includeFee: true,
          invalidateTickets: true,
          reason: "Absage",
        },
        store,
      )
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Erstattung sollte gelingen")
      expect(result.data.status).toBe("erstattet")
      if (order.serviceFeeCents > 0) expect(result.data.refundedCents).toBe(order.totalCents)
      const refund = store.state.orders.find((candidate) => candidate.id === order.id)?.refunds.at(-1)
      expect(refund?.feeCents).toBe(order.serviceFeeCents)
    } finally {
      store.dispose()
    }
  })
})

describe("dashOrderCancel", () => {
  test("storniert alles inklusive Servicegebühr", () => {
    const store = orderStoreCreate()
    try {
      const order = orderPaidByTickets(store, 1)
      const result = dashOrderCancel({ orderId: order.id, reason: "Doppelbuchung" }, store)
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Storno sollte gelingen")
      const updated = store.state.orders.find((candidate) => candidate.id === order.id)
      expect(updated?.status).toBe("storniert")
      expect(updated?.refunds.at(-1)?.feeCents).toBe(order.serviceFeeCents)
      expect(
        store.state.tickets
          .filter((ticket) => ticket.orderId === order.id)
          .every((ticket) => ticket.status === "storniert"),
      ).toBe(true)
      expect(updated?.emails.at(-1)?.kind).toBe("storno")
    } finally {
      store.dispose()
    }
  })

  test("storniert offene Bestellung ohne Erstattung", () => {
    const store = orderStoreCreate()
    try {
      const order = store.state.orders.find((candidate) => candidate.status === "offen")
      if (!order) throw new Error("Keine offene Bestellung im Seed.")
      const refundCount = order.refunds.length
      const result = dashOrderCancel({ orderId: order.id, reason: "Zahlung bleibt aus" }, store)
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Storno sollte gelingen")
      expect(result.data.refundedCents).toBe(0)
      const updated = store.state.orders.find((candidate) => candidate.id === order.id)
      expect(updated?.status).toBe("storniert")
      expect(updated?.refunds).toHaveLength(refundCount)
      expect(store.state.tickets.filter((ticket) => ticket.orderId === order.id).length).toBeGreaterThan(0)
      expect(
        store.state.tickets
          .filter((ticket) => ticket.orderId === order.id)
          .every((ticket) => ticket.status === "storniert"),
      ).toBe(true)
      expect(updated?.emails.at(-1)?.kind).toBe("storno")
      expect(store.state.audit.at(-1)?.action).toBe(`Bestellung ${order.number} storniert (offene Zahlung)`)
    } finally {
      store.dispose()
    }
  })
})

describe("dashTicketHolderUpdate", () => {
  test("schreibt Inhaber um und protokolliert E-Mail", () => {
    const store = orderStoreCreate()
    try {
      const order = orderPaidByTickets(store, 1)
      const ticket = store.state.tickets.find((candidate) => candidate.orderId === order.id)
      if (!ticket) throw new Error("Ticket fehlt")
      const result = dashTicketHolderUpdate(
        { ticketId: ticket.id, holderName: "Anna Beispiel", holderEmail: "anna@example.de" },
        store,
      )
      expect(result.success).toBe(true)
      expect(store.state.tickets.find((candidate) => candidate.id === ticket.id)?.holderName).toBe("Anna Beispiel")
      const updated = store.state.orders.find((candidate) => candidate.id === order.id)
      expect(updated?.emails.at(-1)).toMatchObject({ to: "anna@example.de", kind: "ticket-umgeschrieben" })
      expect(store.state.audit.at(-1)?.action).toContain(ticket.code)
    } finally {
      store.dispose()
    }
  })

  test("lehnt ungültige E-Mail ab", () => {
    const store = orderStoreCreate()
    try {
      const order = orderPaidByTickets(store, 1)
      const ticket = store.state.tickets.find((candidate) => candidate.orderId === order.id)
      if (!ticket) throw new Error("Ticket fehlt")
      expect(
        dashTicketHolderUpdate({ ticketId: ticket.id, holderName: "Anna", holderEmail: "keine-mail" }, store).success,
      ).toBe(false)
    } finally {
      store.dispose()
    }
  })
})

describe("dashOrderNoteAdd", () => {
  test("legt Notiz an und löscht sie wieder", () => {
    const store = orderStoreCreate()
    try {
      const order = orderPaidByTickets(store, 1)
      const added = dashOrderNoteAdd({ orderId: order.id, text: "  Rückruf vereinbart  " }, store)
      expect(added.success).toBe(true)
      if (!added.success) throw new Error("Notiz sollte gelingen")
      expect(added.data.text).toBe("Rückruf vereinbart")
      expect(added.data.author.length).toBeGreaterThan(0)
      const deleted = dashOrderNoteDelete({ orderId: order.id, noteId: added.data.id }, store)
      expect(deleted.success).toBe(true)
      expect(store.state.orders.find((candidate) => candidate.id === order.id)?.notes).toHaveLength(0)
    } finally {
      store.dispose()
    }
  })
})

describe("dashOrderResend", () => {
  test("protokolliert erneuten Versand", () => {
    const store = orderStoreCreate()
    try {
      const order = orderPaidByTickets(store, 1)
      expect(dashOrderResend(order.id, store).success).toBe(true)
      expect(store.state.orders.find((candidate) => candidate.id === order.id)?.emails.at(-1)?.kind).toBe(
        "tickets-erneut",
      )
    } finally {
      store.dispose()
    }
  })
})

describe("dashOrderInvoicePdf", () => {
  test("erzeugt ein PDF mit %-Header", async () => {
    const store = orderStoreCreate()
    try {
      const order = orderPaidByTickets(store, 1)
      const result = await dashOrderInvoicePdf(order.id, store)
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("PDF sollte gelingen")
      const text = new TextDecoder().decode(result.data.slice(0, 8))
      expect(text.startsWith("%PDF")).toBe(true)
    } finally {
      store.dispose()
    }
  })
})
