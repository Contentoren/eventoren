import { createResultError, type Result } from "#result"

import type { DashStore } from "../dashStoreCreate.ts"
import { dashStoreGet } from "../dashStoreGet.ts"

export function dashOrderEmailLog(orderId: string, kind: string, store: DashStore = dashStoreGet()): Result<void> {
  const op = "dashOrderEmailLog"
  const order = store.state.orders.find((candidate) => candidate.id === orderId)
  if (!order) return createResultError(op, "Bestellung nicht gefunden.")
  const normalized = kind.trim()
  if (!normalized) return createResultError(op, "Bitte gib eine E-Mail-Art an.")
  return store.update(op, (draft) => {
    const target = draft.orders.find((candidate) => candidate.id === orderId)
    if (!target) throw new Error("Bestellung nicht gefunden.")
    target.emails.push({ at: new Date().toISOString(), to: target.buyer.email, kind: normalized })
  })
}
