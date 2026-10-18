import { createResult, createResultError, type Result } from "#result"

import type { DashOrder } from "../../../model/dashOrderSchema.ts"
import type { DashPaymentMethod } from "../../../model/dashPaymentMethodSchema.ts"
import type { DashTicket } from "../../../model/dashTicketSchema.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashOrderCreate } from "../dashOrderCreate.ts"

export type DashBoxOfficeSalePayInput = {
  saleId: string
  buyerName: string
  buyerEmail: string
  method: "applepay" | "googlepay" | "karte"
}

function payBuyerNameSplit(name: string): { firstName: string; lastName: string } {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0)
  if (parts.length === 0) return { firstName: "", lastName: "" }
  if (parts.length === 1) return { firstName: parts[0] ?? "", lastName: parts[0] ?? "" }
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") }
}

/** Bezahlt einen wartenden Vorgang: legt Bestellung (abendkasse, eingecheckt) an und schließt den Vorgang. */
export function dashBoxOfficeSalePay(
  input: DashBoxOfficeSalePayInput,
  store: DashStore = dashStoreGet(),
): Result<{ order: DashOrder; tickets: DashTicket[] }> {
  const op = "dashBoxOfficeSalePay"
  const sale = store.state.boxOfficeSales.find((candidate) => candidate.id === input.saleId)
  if (!sale) return createResultError(op, "Vorgang nicht gefunden.")
  if (sale.status === "bezahlt") return createResultError(op, "Dieser Vorgang ist schon bezahlt.")
  if (sale.status === "abgebrochen") return createResultError(op, "Dieser Vorgang wurde abgebrochen.")
  const name = payBuyerNameSplit(input.buyerName)
  if (!name.firstName || !name.lastName) return createResultError(op, "Bitte gib deinen Vor- und Nachnamen an.")
  const email = input.buyerEmail.trim()
  if (!email.includes("@")) return createResultError(op, "Bitte gib eine gültige E-Mail-Adresse an.")
  const method: DashPaymentMethod = input.method
  if (method !== "applepay" && method !== "googlepay" && method !== "karte")
    return createResultError(op, "Unbekannte Zahlart.")
  const event = store.state.events.find((candidate) => candidate.id === sale.eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  const created = dashOrderCreate(
    {
      eventId: sale.eventId,
      lines: sale.lines.map((line) => ({ ticketTypeId: line.ticketTypeId, quantity: line.quantity })),
      buyer: { firstName: name.firstName, lastName: name.lastName, email },
      channel: "abendkasse",
      method,
      checkIn: { entrance: "Abendkasse", device: "Abendkasse" },
    },
    store,
  )
  if (!created.success) return created
  const nowIso = new Date().toISOString()
  const ticketCount = created.data.tickets.length
  const updated = store.update(op, (draft) => {
    const target = draft.boxOfficeSales.find((candidate) => candidate.id === sale.id)
    if (!target) throw new Error("Vorgang nicht gefunden.")
    target.status = "bezahlt"
    target.paidAt = nowIso
    target.orderId = created.data.order.id
    target.buyerEmail = email
    dashAuditAdd(draft, {
      orgId: event.orgId,
      eventId: event.id,
      area: "abendkasse",
      action: `Abendkassen-Vorgang bezahlt (${ticketCount} Tickets)`,
      before: "wartet",
      after: `bezahlt · ${created.data.order.number}`,
    })
  })
  if (!updated.success) return createResultError(op, "Die Zahlung konnte nicht gespeichert werden.")
  return createResult(created.data)
}
