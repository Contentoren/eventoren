import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { dashCentsFormat } from "../../../../model/dashCentsFormat.ts"
import type { DashOrder } from "../../../../model/dashOrderSchema.ts"
import type { DashTicket } from "../../../../model/dashTicketSchema.ts"
import { dashOrderRefundableGet } from "../../../../store/actions/orders/dashOrderRefundableGet.ts"
import { dashOrderReasonOptions } from "../../model/dashOrderReasonOptions.ts"

/** Zustand für den Erstatten-Dialog: Modus, Ticketauswahl, Betrag, Gebühren-Schalter, Grund. */
export function dashOrderRefundDialogStateCreate(inputs: {
  order: () => DashOrder
  tickets: () => DashTicket[]
  onClose: () => void
  onRefunded: () => void
}) {
  const mode = createSignalObject<"tickets" | "betrag">("tickets")
  const selectedIds = createSignalObject<string[]>([])
  const amountCents = createSignalObject<number | null>(null)
  const includeFee = createSignalObject(false)
  const invalidateTickets = createSignalObject(true)
  const reason = createSignalObject<string>(dashOrderReasonOptions[0]?.value ?? "kulanz")
  const reasonNote = createSignalObject("")
  const error = createSignalObject<string | null>(null)
  const pending = createSignalObject(false)

  const refundable = () => dashOrderRefundableGet(inputs.order(), inputs.tickets())

  const refundableTickets = () => {
    const per = new Map(refundable().perTicket.map((entry) => [entry.ticketId, entry]))
    return inputs
      .tickets()
      .filter((ticket) => per.get(ticket.id)?.refundable === true)
      .map((ticket) => ({ ticket, amountCents: per.get(ticket.id)?.amountCents ?? 0 }))
  }

  const allRemainingSelected = () => {
    const ids = refundable()
      .perTicket.filter((entry) => entry.refundable)
      .map((entry) => entry.ticketId)
    return ids.length > 0 && ids.every((id) => selectedIds.get().includes(id))
  }

  const amountCentsAllRemaining = () =>
    amountCents.get() !== null && amountCents.get() === refundable().maxCents && refundable().maxCents > 0

  const feeAvailable = () => (mode.get() === "tickets" ? allRemainingSelected() : amountCentsAllRemaining())

  const feeCents = () => (includeFee.get() && feeAvailable() ? refundable().feeRefundableCents : 0)

  const ticketCents = () => {
    if (mode.get() === "tickets") {
      const per = new Map(refundable().perTicket.map((entry) => [entry.ticketId, entry.amountCents]))
      return selectedIds.get().reduce((sum, id) => sum + (per.get(id) ?? 0), 0)
    }
    return amountCents.get() ?? 0
  }

  const totalCents = () => ticketCents() + feeCents()

  const valid = () => {
    if (mode.get() === "tickets") return selectedIds.get().length > 0 && totalCents() > 0
    const amount = amountCents.get()
    return (
      amount !== null && Number.isInteger(amount) && amount >= 1 && amount <= refundable().maxCents && totalCents() > 0
    )
  }

  const invalidCount = () =>
    inputs.tickets().filter((ticket) => {
      const entry = refundable().perTicket.find((candidate) => candidate.ticketId === ticket.id)
      return ticket.orderId === inputs.order().id && entry?.refundable !== true
    }).length

  const consequences = () => {
    const invalid = invalidateTickets.get() && mode.get() === "tickets" ? selectedIds.get().length : 0
    return {
      ticketLabel:
        invalid > 0
          ? `${invalid} ${invalid === 1 ? "Ticket wird" : "Tickets werden"} ungültig`
          : "Tickets bleiben gültig",
      amountLabel: dashCentsFormat(totalCents()),
    }
  }

  const openReset = (orderId: string | null) => {
    mode.set("tickets")
    selectedIds.set([])
    amountCents.set(null)
    includeFee.set(false)
    invalidateTickets.set(true)
    reason.set(dashOrderReasonOptions[0]?.value ?? "kulanz")
    reasonNote.set("")
    error.set(null)
    pending.set(false)
    void orderId
  }

  const toggleTicket = (ticketId: string) => {
    const current = selectedIds.get()
    selectedIds.set(current.includes(ticketId) ? current.filter((id) => id !== ticketId) : [...current, ticketId])
  }

  return {
    mode,
    selectedIds,
    amountCents,
    includeFee,
    invalidateTickets,
    reason,
    reasonNote,
    error,
    pending,
    refundable,
    refundableTickets,
    allRemainingSelected,
    feeAvailable,
    feeCents,
    ticketCents,
    totalCents,
    valid,
    invalidCount,
    consequences,
    openReset,
    toggleTicket,
    order: inputs.order,
    tickets: inputs.tickets,
    onClose: inputs.onClose,
    onRefunded: inputs.onRefunded,
  }
}

export type DashOrderRefundDialogState = ReturnType<typeof dashOrderRefundDialogStateCreate>
