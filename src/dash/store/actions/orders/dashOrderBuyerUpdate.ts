import { createResult, createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

const dashOrderEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function dashOrderBuyerUpdate(
  args: { orderId: string; firstName: string; lastName: string; email: string },
  store: DashStore = dashStoreGet(),
): Result<void> {
  const op = "dashOrderBuyerUpdate"
  const order = store.state.orders.find((candidate) => candidate.id === args.orderId)
  if (!order) return createResultError(op, "Bestellung nicht gefunden.")
  const firstName = args.firstName.trim()
  const lastName = args.lastName.trim()
  const email = args.email.trim()
  if (!firstName) return createResultError(op, "Bitte gib einen Vornamen an.")
  if (!lastName) return createResultError(op, "Bitte gib einen Nachnamen an.")
  if (!dashOrderEmailPattern.test(email)) return createResultError(op, "Bitte gib eine gültige E-Mail-Adresse an.")
  const before = `${order.buyer.firstName} ${order.buyer.lastName} <${order.buyer.email}>`
  const after = `${firstName} ${lastName} <${email}>`
  if (before === after) return createResult(undefined)
  const updated = store.update(op, (draft) => {
    const target = draft.orders.find((candidate) => candidate.id === args.orderId)
    if (!target) throw new Error("Bestellung nicht gefunden.")
    target.buyer = { firstName, lastName, email }
    dashAuditAdd(draft, {
      orgId: target.orgId,
      eventId: target.eventId,
      area: "bestellungen",
      action: `Käufer von Bestellung ${target.number} aktualisiert`,
      before,
      after,
    })
  })
  if (!updated.success) return createResultError(op, "Die Käuferdaten konnten nicht gespeichert werden.")
  return createResult(undefined)
}
