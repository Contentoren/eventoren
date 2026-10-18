import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../../seed/dashSeedCreate.ts"
import { dashStoreCreate, type DashStore } from "../../dashStoreCreate.ts"
import { dashAdminPayoutMarkPaid } from "./dashAdminPayoutMarkPaid.ts"

function dashAdminPayoutTestStoreCreate(): DashStore {
  return dashStoreCreate({
    storage: null,
    now: () => new Date("2026-09-15T12:00:00.000Z"),
    seed: (now) => dashSeedCreate(now),
    schedule: (fn) => fn(),
  })
}

describe("dashAdminPayoutMarkPaid", () => {
  test("markiert bereite Auszahlungen als ausgezahlt und schreibt je ein Audit", () => {
    const store = dashAdminPayoutTestStoreCreate()
    try {
      const ready = store.state.payouts.filter((payout) => payout.status === "bereit")
      expect(ready.length).toBeGreaterThan(0)
      const auditsBefore = store.state.audit.length
      const result = dashAdminPayoutMarkPaid(
        ready.map((payout) => payout.id),
        store,
      )
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data.updated).toBe(ready.length)
      for (const payout of ready) {
        const after = store.state.payouts.find((candidate) => candidate.id === payout.id)
        expect(after?.status).toBe("ausgezahlt")
        expect(after?.paidAt).not.toBeNull()
        expect(after?.reference.startsWith("AUS-2026-")).toBe(true)
      }
      const added = store.state.audit.slice(auditsBefore)
      expect(added.length).toBe(ready.length)
      for (const entry of added) {
        expect(entry.area).toBe("admin")
        expect(entry.action).toContain("als ausgezahlt markiert")
      }
    } finally {
      store.dispose()
    }
  })

  test("überspringt bereits ausgezahlte und vergibt fehlende Referenzen", () => {
    const store = dashAdminPayoutTestStoreCreate()
    try {
      const paid = store.state.payouts.find((payout) => payout.status === "ausgezahlt")
      const ready = store.state.payouts.find((payout) => payout.status === "bereit")
      expect(ready).toBeDefined()
      if (!ready) return
      const paidAtBefore = paid?.paidAt
      const ids = [ready.id, ...(paid ? [paid.id] : [])]
      const result = dashAdminPayoutMarkPaid(ids, store)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data.updated).toBe(1)
      const after = store.state.payouts.find((candidate) => candidate.id === ready.id)
      expect(after?.status).toBe("ausgezahlt")
      expect(after?.paidAt).not.toBeNull()
      if (paid) {
        const afterPaid = store.state.payouts.find((candidate) => candidate.id === paid.id)
        expect(afterPaid?.paidAt).toBe(paidAtBefore)
      }
    } finally {
      store.dispose()
    }
  })

  test("lehnt leere Auswahl und unbekannte Ids ab", () => {
    const store = dashAdminPayoutTestStoreCreate()
    try {
      expect(dashAdminPayoutMarkPaid([], store).success).toBe(false)
      expect(dashAdminPayoutMarkPaid(["payout-unbekannt"], store).success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})
