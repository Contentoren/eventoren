import { createResultError, type Result } from "#result"

import type { DashOrder } from "../../../model/dashOrderSchema.ts"
import type { DashTicket } from "../../../model/dashTicketSchema.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashBoxOfficeSaleCreate } from "./dashBoxOfficeSaleCreate.ts"
import { dashBoxOfficeSalePay } from "./dashBoxOfficeSalePay.ts"

export type DashBoxOfficeGuestBuyInput = {
  eventId: string
  lines: { ticketTypeId: string; quantity: number }[]
  buyerName: string
  buyerEmail: string
  method: "applepay" | "googlepay" | "karte"
}

/** Selbstbedienung ohne Vorgang: legt Sale an und bezahlt ihn in einem Schritt. */
export function dashBoxOfficeGuestBuy(
  input: DashBoxOfficeGuestBuyInput,
  store: DashStore = dashStoreGet(),
): Result<{ order: DashOrder; tickets: DashTicket[] }> {
  const op = "dashBoxOfficeGuestBuy"
  const created = dashBoxOfficeSaleCreate({ eventId: input.eventId, lines: input.lines }, store)
  if (!created.success) return created
  const paid = dashBoxOfficeSalePay(
    { saleId: created.data.id, buyerName: input.buyerName, buyerEmail: input.buyerEmail, method: input.method },
    store,
  )
  if (!paid.success) return createResultError(op, paid.errorMessage)
  return paid
}
