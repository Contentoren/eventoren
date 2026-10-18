import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../../seed/dashSeedCreate.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreCreate } from "../../dashStoreCreate.ts"
import { dashGuestAdd } from "./dashGuestAdd.ts"
import { dashGuestBulkAdd } from "./dashGuestBulkAdd.ts"
import { dashGuestCheckIn } from "./dashGuestCheckIn.ts"
import { dashGuestCheckInUndo } from "./dashGuestCheckInUndo.ts"
import { dashGuestDelete } from "./dashGuestDelete.ts"
import { dashGuestQuotaDelete } from "./dashGuestQuotaDelete.ts"
import { dashGuestQuotaUpsert } from "./dashGuestQuotaUpsert.ts"
import { dashGuestTicketSend } from "./dashGuestTicketSend.ts"

function guestsStoreCreate(): DashStore {
  return dashStoreCreate({
    storage: null,
    now: () => new Date("2026-10-18T10:00:00.000Z"),
    seed: (now) => dashSeedCreate(now),
    schedule: (fn) => fn(),
  })
}

function quotaUsed(store: DashStore, quotaId: string): number {
  return store.state.guests
    .filter((guest) => guest.quotaId === quotaId)
    .reduce((sum, guest) => sum + 1 + guest.plusOnes, 0)
}

describe("dashGuestQuotaUpsert", () => {
  test("legt an und lehnt Limit unter belegten Plätzen ab", () => {
    const store = guestsStoreCreate()
    try {
      const created = dashGuestQuotaUpsert({ eventId: "ev-winterball", name: "Presse Extra", limit: 5 }, store)
      expect(created.success).toBe(true)
      if (!created.success) return
      expect(created.data.name).toBe("Presse Extra")
      const rename = dashGuestQuotaUpsert(
        { id: created.data.id, eventId: "ev-winterball", name: "Presse Extra Plus", limit: 6 },
        store,
      )
      expect(rename.success).toBe(true)
      const used = quotaUsed(store, "gq-winter-presse")
      expect(used).toBeGreaterThan(0)
      const tooSmall = dashGuestQuotaUpsert(
        { id: "gq-winter-presse", eventId: "ev-winterball", name: "Presse", limit: Math.max(0, used - 1) },
        store,
      )
      expect(tooSmall.success).toBe(false)
    } finally {
      store.dispose()
    }
  })

  test("löscht nur leere Kontingente", () => {
    const store = guestsStoreCreate()
    try {
      const created = dashGuestQuotaUpsert({ eventId: "ev-winterball", name: "Leer", limit: 3 }, store)
      expect(created.success).toBe(true)
      if (!created.success) return
      const deleted = dashGuestQuotaDelete(created.data.id, store)
      expect(deleted.success).toBe(true)
      const blocked = dashGuestQuotaDelete("gq-winter-presse", store)
      expect(blocked.success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})

describe("dashGuestAdd", () => {
  test("legt Gast mit 0-€-Ticket an (Presse, +1) und verlinkt das erste Ticket", () => {
    const store = guestsStoreCreate()
    try {
      const before = store.state.orders.length
      const added = dashGuestAdd(
        {
          eventId: "ev-winterball",
          quotaId: "gq-winter-presse",
          name: "Tina Test",
          email: "tina@example.de",
          plusOnes: 1,
          note: "Interview",
          sendTicket: true,
        },
        store,
      )
      expect(added.success).toBe(true)
      if (!added.success) return
      expect(added.data.plusOnes).toBe(1)
      expect(added.data.ticketId).not.toBeNull()
      const order = store.state.orders.find((candidate) =>
        store.state.tickets.some((ticket) => ticket.id === added.data.ticketId && ticket.orderId === candidate.id),
      )
      expect(order?.channel).toBe("gaesteliste")
      expect(order?.payment.method).toBe("kostenlos")
      expect(order?.totalCents).toBe(0)
      const tickets = store.state.tickets.filter((ticket) => ticket.orderId === order?.id)
      expect(tickets).toHaveLength(2)
      expect(store.state.orders.length).toBe(before + 1)
    } finally {
      store.dispose()
    }
  })

  test("lehnt volles Kontingent und fehlende E-Mail bei Ticketversand ab", () => {
    const store = guestsStoreCreate()
    try {
      const used = quotaUsed(store, "gq-indie-gaeste")
      const quota = store.state.guestQuotas.find((candidate) => candidate.id === "gq-indie-gaeste")
      expect(quota).toBeDefined()
      const rest = (quota?.limit ?? 0) - used
      expect(rest).toBeGreaterThanOrEqual(0)
      const overflow = dashGuestAdd(
        {
          eventId: "ev-indie-night",
          quotaId: "gq-indie-gaeste",
          name: "Zuviel Gast",
          email: "zuviel@example.de",
          plusOnes: rest + 1,
          note: "",
          sendTicket: false,
        },
        store,
      )
      expect(overflow.success).toBe(false)
      const full = dashGuestQuotaUpsert(
        { id: "gq-indie-gaeste", eventId: "ev-indie-night", name: "Gästeliste", limit: used },
        store,
      )
      expect(full.success).toBe(true)
      const rejected = dashGuestAdd(
        {
          eventId: "ev-indie-night",
          quotaId: "gq-indie-gaeste",
          name: "Kein Platz",
          email: "kein-platz@example.de",
          plusOnes: 0,
          note: "",
          sendTicket: false,
        },
        store,
      )
      expect(rejected.success).toBe(false)
      expect(rejected.success ? "" : rejected.errorMessage).toContain("voll")
      const noMail = dashGuestAdd(
        {
          eventId: "ev-winterball",
          quotaId: "gq-winter-presse",
          name: "Ohne Mail",
          email: "",
          plusOnes: 0,
          note: "",
          sendTicket: true,
        },
        store,
      )
      expect(noMail.success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})

describe("dashGuestBulkAdd + Ticket + Check-in + Löschen", () => {
  test("importiert drei Zeilen, sendet, checkt ein und storniert beim Löschen", () => {
    const store = guestsStoreCreate()
    try {
      const result = dashGuestBulkAdd(
        {
          eventId: "ev-winterball",
          quotaId: "gq-winter-verein",
          entries: [
            { name: "Bulk Eins", email: "bulk-eins@example.de" },
            { name: "Bulk Zwei", email: "bulk-zwei@example.de" },
            { name: "Bulk Drei", email: "" },
          ],
          sendTicket: false,
        },
        store,
      )
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data.added).toBe(3)
      expect(result.data.errors).toHaveLength(0)
      const first = store.state.guests.find((guest) => guest.name === "Bulk Eins")
      expect(first).toBeDefined()
      if (!first) return
      expect(first.ticketId).toBeNull()
      const sent = dashGuestTicketSend(first.id, store)
      expect(sent.success).toBe(true)
      const withTicket = store.state.guests.find((guest) => guest.id === first.id)
      expect(withTicket?.ticketId).not.toBeNull()
      const checked = dashGuestCheckIn(first.id, store)
      expect(checked.success).toBe(true)
      expect(store.state.guests.find((guest) => guest.id === first.id)?.checkedInAt).not.toBeNull()
      const undone = dashGuestCheckInUndo(first.id, store)
      expect(undone.success).toBe(true)
      expect(store.state.guests.find((guest) => guest.id === first.id)?.checkedInAt).toBeNull()
      const deleted = dashGuestDelete(first.id, store)
      expect(deleted.success).toBe(true)
      expect(store.state.guests.some((guest) => guest.id === first.id)).toBe(false)
      const ticketOrder = withTicket?.ticketId
        ? store.state.orders.find((candidate) =>
            store.state.tickets.some((ticket) => ticket.id === withTicket.ticketId && ticket.orderId === candidate.id),
          )
        : undefined
      void ticketOrder
      const leftover = store.state.tickets.filter(
        (ticket) =>
          ticket.id === withTicket?.ticketId ||
          store.state.orders.some(
            (candidate) =>
              candidate.id === ticket.orderId &&
              candidate.eventId === "ev-winterball" &&
              candidate.channel === "gaesteliste" &&
              ticket.holderName === "Bulk Eins",
          ),
      )
      expect(leftover.every((ticket) => ticket.status === "storniert")).toBe(true)
    } finally {
      store.dispose()
    }
  })
})
