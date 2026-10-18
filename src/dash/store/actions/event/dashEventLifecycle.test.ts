import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../../seed/dashSeedCreate.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreCreate } from "../../dashStoreCreate.ts"
import { dashOrderCreate } from "../dashOrderCreate.ts"
import { dashEventPublish } from "./dashEventPublish.ts"
import { dashEventSalesPause } from "./dashEventSalesPause.ts"
import { dashEventCancel } from "./dashEventCancel.ts"

function dashEventLifecycleStoreCreate(): DashStore {
  return dashStoreCreate({
    storage: null,
    now: () => new Date("2026-10-18T10:00:00.000Z"),
    seed: (now) => dashSeedCreate(now),
    schedule: (fn) => fn(),
  })
}

const buyer = { firstName: "Max", lastName: "Mustermann", email: "max@example.de" }

describe("dashEventPublish", () => {
  test("veröffentlicht die Lesung nach Vervollständigung", () => {
    const store = dashEventLifecycleStoreCreate()
    try {
      expect(dashEventPublish("ev-lesung", store).success).toBe(false)
      const patched = store.update("test", (draft) => {
        const event = draft.events.find((candidate) => candidate.id === "ev-lesung")
        if (!event) throw new Error("Event fehlt")
        event.imageAlt = "Autorin liest im Gartensaal"
        event.description = "Drei Autorinnen lesen aus ihren Romanen."
      })
      expect(patched.success).toBe(true)
      const result = dashEventPublish("ev-lesung", store)
      expect(result.success).toBe(true)
      const event = store.state.events.find((candidate) => candidate.id === "ev-lesung")
      expect(event?.status).toBe("veroeffentlicht")
      expect(event?.publishedAt).not.toBeNull()
      expect(store.state.audit.at(-1)?.action).toContain("veröffentlicht")
    } finally {
      store.dispose()
    }
  })

  test("sperrte Org und Absage verhindern das Veröffentlichen", () => {
    const store = dashEventLifecycleStoreCreate()
    try {
      const switched = store.update("test", (draft) => {
        const org = draft.orgs.find((candidate) => candidate.id === "org-lindenhof")
        if (!org) throw new Error("Org fehlt")
        org.status = "pruefung"
      })
      expect(switched.success).toBe(true)
      const blocked = dashEventPublish("ev-jazz-wein", store)
      expect(blocked.success).toBe(false)
      if (blocked.success) throw new Error("Prüfung sollte blockieren")
      expect(blocked.errorMessage).toContain("Organisation freigegeben")
      const cancelled = store.update("test", (draft) => {
        const event = draft.events.find((candidate) => candidate.id === "ev-jazz-wein")
        if (!event) throw new Error("Event fehlt")
        event.status = "abgesagt"
      })
      expect(cancelled.success).toBe(true)
      expect(dashEventPublish("ev-jazz-wein", store).success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})

describe("dashEventSalesPause", () => {
  test("pausiert und setzt fort", () => {
    const store = dashEventLifecycleStoreCreate()
    try {
      expect(dashEventSalesPause("ev-jazz-wein", true, store).success).toBe(true)
      expect(store.state.events.find((event) => event.id === "ev-jazz-wein")?.salesPaused).toBe(true)
      expect(dashEventSalesPause("ev-jazz-wein", true, store).success).toBe(false)
      expect(dashEventSalesPause("ev-jazz-wein", false, store).success).toBe(true)
      expect(store.state.events.find((event) => event.id === "ev-jazz-wein")?.salesPaused).toBe(false)
      expect(dashEventSalesPause("ev-unbekannt", true, store).success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})

describe("dashEventCancel", () => {
  test("Absage mit Erstattung storniert Tickets, erstattet Beträge und sendet eine Nachricht", () => {
    const store = dashEventLifecycleStoreCreate()
    try {
      const first = dashOrderCreate(
        {
          eventId: "ev-jazz-wein",
          lines: [{ ticketTypeId: "tt-jazz-a", quantity: 2 }],
          buyer,
          channel: "online",
          method: "karte",
        },
        store,
      )
      const secondBuyer = { firstName: "Lena", lastName: "Beispiel", email: "lena@example.de" }
      const second = dashOrderCreate(
        {
          eventId: "ev-jazz-wein",
          lines: [{ ticketTypeId: "tt-jazz-b", quantity: 1 }],
          buyer: secondBuyer,
          channel: "online",
          method: "karte",
        },
        store,
      )
      expect(first.success && second.success).toBe(true)
      if (!first.success || !second.success) throw new Error("Bestellungen sollten gelingen")
      const result = dashEventCancel({ eventId: "ev-jazz-wein", reason: "Krankheit der Band", refundAll: true }, store)
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Absage sollte gelingen")
      const createdIds = new Set([first.data.order.id, second.data.order.id])
      const createdOrders = store.state.orders.filter((order) => createdIds.has(order.id))
      expect(result.data.refundedOrders).toBeGreaterThanOrEqual(2)
      expect(result.data.refundedCents).toBeGreaterThan(0)
      const event = store.state.events.find((candidate) => candidate.id === "ev-jazz-wein")
      expect(event?.status).toBe("abgesagt")
      expect(event?.salesPaused).toBe(true)
      expect(event?.cancelReason).toBe("Krankheit der Band")
      for (const order of createdOrders) {
        expect(order.status).toBe("erstattet")
        expect(order.refunds).toHaveLength(1)
        expect(order.refunds[0]?.feeCents).toBe(order.serviceFeeCents)
        expect(order.refunds[0]?.amountCents).toBeGreaterThan(0)
        expect(order.emails.at(-1)?.kind).toBe("absage")
      }
      expect(
        store.state.tickets
          .filter((ticket) => createdIds.has(ticket.orderId))
          .every((ticket) => ticket.status === "storniert"),
      ).toBe(true)
      const message = store.state.messages.filter((item) => item.kind === "absage").at(-1)
      expect(message?.eventId).toBe("ev-jazz-wein")
      expect(message?.status).toBe("gesendet")
      expect(message?.subject).toBe(`Absage: ${event?.title}`)
      expect(message?.recipientCount).toBeGreaterThanOrEqual(2)
      expect(dashEventCancel({ eventId: "ev-jazz-wein", reason: "Nochmal", refundAll: false }, store).success).toBe(
        false,
      )
    } finally {
      store.dispose()
    }
  })

  test("Absage ohne Erstattung informiert nur", () => {
    const store = dashEventLifecycleStoreCreate()
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
      const result = dashEventCancel({ eventId: "ev-jazz-wein", reason: "Unwetter", refundAll: false }, store)
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Absage sollte gelingen")
      expect(result.data).toEqual({ refundedOrders: 0, refundedCents: 0 })
      const order = store.state.orders.find((candidate) => candidate.id === ordered.data.order.id)
      expect(order?.status).toBe("bezahlt")
      expect(order?.refunds).toHaveLength(0)
      expect(
        store.state.tickets
          .filter((ticket) => ticket.orderId === ordered.data.order.id)
          .every((ticket) => ticket.status === "gueltig"),
      ).toBe(true)
      const message = store.state.messages.filter((item) => item.kind === "absage").at(-1)
      expect(message?.eventId).toBe("ev-jazz-wein")
      expect(message?.recipientCount).toBeGreaterThan(0)
    } finally {
      store.dispose()
    }
  })

  test("meldet fehlende Gründe und unbekannte Events", () => {
    const store = dashEventLifecycleStoreCreate()
    try {
      expect(dashEventCancel({ eventId: "ev-jazz-wein", reason: "  ", refundAll: false }, store).success).toBe(false)
      expect(dashEventCancel({ eventId: "ev-unbekannt", reason: "Grund", refundAll: false }, store).success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})
