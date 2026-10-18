import { describe, expect, test } from "bun:test"
import { dashBoxOfficeSaleCreate } from "./actions/kasse/dashBoxOfficeSaleCreate.ts"
import { dashBoxOfficeSalePay } from "./actions/kasse/dashBoxOfficeSalePay.ts"
import { type DashStorage, type DashStore, type DashStoreListener, dashStoreCreate } from "./dashStoreCreate.ts"
import { dashSeedCreate } from "./seed/dashSeedCreate.ts"

function dashSharedStorageCreate(): DashStorage & { values: Map<string, string> } {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

function dashCrossTabStoreCreate(storage: DashStorage): { store: DashStore; listeners: Array<DashStoreListener> } {
  const listeners: Array<DashStoreListener> = []
  const store = dashStoreCreate({
    storage,
    now: () => new Date("2026-10-18T10:00:00.000Z"),
    seed: (now) => dashSeedCreate(now),
    schedule: (fn) => fn(),
    addStorageListener: (handler) => {
      listeners.push(handler)
      return () => {
        const index = listeners.indexOf(handler)
        if (index >= 0) listeners.splice(index, 1)
      }
    },
  })
  return { store, listeners }
}

function dashDeliver(listeners: Array<DashStoreListener>, key: string, newValue: string | null): void {
  for (const listener of listeners) listener({ key, newValue })
}

const dashStoreKey = "eventoren-demo-plattform-v1"

describe("dashStore Cross-Tab", () => {
  test("Store B sieht den Bezahlstatus von Store A per Storage-Event", () => {
    const storage = dashSharedStorageCreate()
    const tabA = dashCrossTabStoreCreate(storage)
    const tabB = dashCrossTabStoreCreate(storage)
    try {
      // Kasse (Tab A) legt einen Vorgang an und persistiert.
      const created = dashBoxOfficeSaleCreate(
        { eventId: "ev-indie-night", lines: [{ ticketTypeId: "tt-indie-abendkasse", quantity: 2 }] },
        tabA.store,
      )
      expect(created.success).toBe(true)
      if (!created.success) throw new Error("Anlage schlug fehl")
      const saleId = created.data.id
      tabA.store.flush()

      // Cross-Tab-Zustellung an Tab B: Vorgang ist "wartet".
      dashDeliver(tabB.listeners, dashStoreKey, storage.values.get(dashStoreKey) ?? null)
      // Kassen-Lesart (wie dashKasseStateCreate.sale()): reaktiver Store-Read.
      const saleInB = () => tabB.store.state.boxOfficeSales.find((candidate) => candidate.id === saleId)
      expect(saleInB()?.status).toBe("wartet")

      // Gast (Tab A) bezahlt und flusht sofort (wie die Gast-Seite nach dashBoxOfficeSalePay).
      const paid = dashBoxOfficeSalePay(
        { saleId, buyerName: "Lea Schneider", buyerEmail: "lea@example.de", method: "applepay" },
        tabA.store,
      )
      expect(paid.success).toBe(true)
      tabA.store.flush()
      dashDeliver(tabB.listeners, dashStoreKey, storage.values.get(dashStoreKey) ?? null)

      // Der Kassen-Tab sieht jetzt "bezahlt" → der reaktive sale()-Read löst den grünen Screen aus.
      expect(saleInB()?.status).toBe("bezahlt")
      expect(tabA.store.state.boxOfficeSales.find((candidate) => candidate.id === saleId)?.orderId).toBe(
        saleInB()?.orderId,
      )

      // Ungültige Events ändern nichts.
      dashDeliver(tabB.listeners, dashStoreKey, "{kaputt")
      expect(saleInB()?.status).toBe("bezahlt")
      dashDeliver(tabB.listeners, "anderer-schluessel", storage.values.get(dashStoreKey) ?? null)
      expect(saleInB()?.status).toBe("bezahlt")
    } finally {
      tabA.store.dispose()
      tabB.store.dispose()
    }
  })

  test("flush schreibt sofort, nicht erst per schedule", () => {
    const storage = dashSharedStorageCreate()
    const queued: Array<() => void> = []
    const listeners: Array<DashStoreListener> = []
    const store = dashStoreCreate({
      storage,
      now: () => new Date("2026-10-18T10:00:00.000Z"),
      seed: (now) => dashSeedCreate(now),
      // schedule wartet bewusst (Idle-Callback in Hintergrund-Tabs) …
      schedule: (fn) => {
        queued.push(fn)
      },
      addStorageListener: (handler) => {
        listeners.push(handler)
        return () => undefined
      },
    })
    try {
      const created = dashBoxOfficeSaleCreate(
        { eventId: "ev-indie-night", lines: [{ ticketTypeId: "tt-indie-abendkasse", quantity: 1 }] },
        store,
      )
      expect(created.success).toBe(true)
      if (!created.success) throw new Error("Anlage schlug fehl")
      // … aber flush() schreibt synchron, sodass andere Tabs sofort beliefert werden können.
      store.flush()
      expect(storage.values.get(dashStoreKey)).toContain(created.data.id)
      expect(queued).toHaveLength(0)
    } finally {
      store.dispose()
    }
  })
})
