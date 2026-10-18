import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { DashOrder } from "../../../../model/dashOrderSchema.ts"
import type { DashTicket } from "../../../../model/dashTicketSchema.ts"
import { dashOrderRefundableGet } from "../../../../store/actions/orders/dashOrderRefundableGet.ts"

/** Zustand für den Stornieren-Dialog: Pflicht-Grund im Textfeld, Fehler, Sende-Status. */
export function dashOrderCancelDialogStateCreate(inputs: { order: () => DashOrder; tickets: () => DashTicket[] }) {
  const reason = createSignalObject("")
  const error = createSignalObject<string | null>(null)
  const pending = createSignalObject(false)

  const refundable = () => dashOrderRefundableGet(inputs.order(), inputs.tickets())
  const ticketCount = () => refundable().perTicket.filter((entry) => entry.refundable).length
  const amountCents = () => refundable().ticketMaxCents + refundable().feeRefundableCents

  const openReset = (open: boolean) => {
    if (!open) return
    reason.set("")
    error.set(null)
    pending.set(false)
  }

  return { reason, error, pending, refundable, ticketCount, amountCents, openReset }
}

export type DashOrderCancelDialogState = ReturnType<typeof dashOrderCancelDialogStateCreate>
