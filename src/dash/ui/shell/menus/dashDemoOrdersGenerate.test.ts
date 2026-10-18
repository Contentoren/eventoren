import { describe, expect, test } from "bun:test"
import { dashRandomCreate } from "../../../model/dashRandomCreate.ts"
import { dashStoreCreate } from "../../../store/dashStoreCreate.ts"
import { dashSeedCreate } from "../../../store/seed/dashSeedCreate.ts"
import { dashDemoOrdersGenerate } from "./dashDemoOrdersGenerate.ts"

const fixedNow = new Date("2026-10-18T10:00:00.000Z")

describe("dashDemoOrdersGenerate", () => {
  test("erzeugt Bestellungen mit deutschen Käufern auf kommenden Events", () => {
    const store = dashStoreCreate({ storage: null, now: () => fixedNow, seed: (now) => dashSeedCreate(now) })
    try {
      const before = store.state.orders.length
      const result = dashDemoOrdersGenerate({ count: 10, random: dashRandomCreate(7), store })
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Generierung sollte gelingen")
      expect(result.data.created).toBe(10)
      expect(store.state.orders.length).toBe(before + 10)
      const fresh = store.state.orders.slice(-10)
      for (const order of fresh) {
        expect(order.channel).toBe("online")
        expect(["karte", "paypal", "applepay"]).toContain(order.payment.method)
        expect(order.buyer.email).toMatch(/^[a-z]+\.[a-z]+@example\.de$/)
        expect(order.lines.reduce((sum, line) => sum + line.quantity, 0)).toBeGreaterThanOrEqual(1)
        expect(order.lines.reduce((sum, line) => sum + line.quantity, 0)).toBeLessThanOrEqual(3)
      }
      const eventIds = new Set(fresh.map((order) => order.eventId))
      expect(eventIds.size).toBeGreaterThan(0)
      for (const eventId of eventIds) {
        const event = store.state.events.find((candidate) => candidate.id === eventId)
        expect(event?.orgId).toBe("org-lindenhof")
        expect(event?.status).toBe("veroeffentlicht")
      }
    } finally {
      store.dispose()
    }
  })

  test("meldet Keine verfügbaren Tickets ohne Angebot", () => {
    const store = dashStoreCreate({ storage: null, now: () => fixedNow, seed: (now) => dashSeedCreate(now) })
    try {
      const switched = store.update("test", (draft) => {
        draft.session.activeOrgId = "org-nachtwerk"
      })
      expect(switched.success).toBe(true)
      const result = dashDemoOrdersGenerate({ count: 5, random: dashRandomCreate(1), store })
      expect(result.success).toBe(false)
      if (result.success) throw new Error("Generierung sollte scheitern")
      expect(result.errorMessage).toBe("Keine verfügbaren Tickets.")
    } finally {
      store.dispose()
    }
  })
})
