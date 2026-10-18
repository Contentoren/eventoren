import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { dashDownload } from "../../../../export/dashDownload.ts"
import { dashFileNameCreate } from "../../../../export/dashFileNameCreate.ts"
import type { DashOrder } from "../../../../model/dashOrderSchema.ts"
import type { DashTicket } from "../../../../model/dashTicketSchema.ts"
import { dashCan } from "../../../../store/dashCan.ts"
import { dashOrderBuyerUpdate } from "../../../../store/actions/orders/dashOrderBuyerUpdate.ts"
import { dashOrderCancel } from "../../../../store/actions/orders/dashOrderCancel.ts"
import { dashOrderInvoicePdf } from "../../../../store/actions/orders/dashOrderInvoicePdf.ts"
import { dashOrderNoteAdd } from "../../../../store/actions/orders/dashOrderNoteAdd.ts"
import { dashOrderNoteDelete } from "../../../../store/actions/orders/dashOrderNoteDelete.ts"
import { dashOrderRefund } from "../../../../store/actions/orders/dashOrderRefund.ts"
import { dashOrderRefundableGet } from "../../../../store/actions/orders/dashOrderRefundableGet.ts"
import { dashOrderResend } from "../../../../store/actions/orders/dashOrderResend.ts"
import { dashSessionUser } from "../../../../store/dashSessionUser.ts"
import { dashTicketHolderUpdate } from "../../../../store/actions/orders/dashTicketHolderUpdate.ts"
import type { DashOrderSheetActions } from "../DashOrderSheet.tsx"
import { dashCentsFormat } from "../../../../model/dashCentsFormat.ts"
import { dashOrderReasonLabel } from "../../model/dashOrderReasonOptions.ts"
import { dashOrderBuyerDialogStateCreate } from "./dashOrderBuyerDialogStateCreate.ts"
import { dashOrderCancelDialogStateCreate } from "./dashOrderCancelDialogStateCreate.ts"
import { dashOrderNotesStateCreate } from "./dashOrderNotesStateCreate.ts"
import { dashTicketHolderDialogStateCreate } from "./dashTicketHolderDialogStateCreate.ts"
import { dashOrderRefundDialogStateCreate } from "./dashOrderRefundDialogStateCreate.ts"

/** Welcher Aktions-Dialog gerade offen ist (genau einer zur Zeit). */
export type DashOrderActionDialog = "refund" | "cancel" | "buyer" | "holder" | null

/**
 * Orchestriert alle Sheet-Aktionen: permission-gefilterte Callbacks für die
 * Sheet-Props plus Dialog-Zustände für Erstatten/Stornieren/Käufer/Umschreiben.
 * Die Sheet-Daten bleiben reaktiv (lesend aus dem Store), kein lokaler Refresh nötig.
 */
export function dashOrderSheetActionsStateCreate(inputs: {
  order: () => DashOrder
  tickets: () => DashTicket[]
  ticketTypeName: (ticketTypeId: string) => string | null
}) {
  const canRefund = () => dashCan("bestellungen.erstatten")
  const canManage = () => dashCan("bestellungen.verwalten")
  const orderRefundable = () => {
    const order = inputs.order()
    if (order.status === "storniert" || order.status === "offen") return false
    return dashOrderRefundableGet(order, inputs.tickets()).maxCents > 0
  }
  const orderCancellable = () => {
    const order = inputs.order()
    if (order.status === "storniert") return false
    // Offene Bestellungen sind stornierbar (keine Erstattung — die SEPA-Zahlung
    // wird nicht mehr eingezogen); bezahlte nur, solange noch etwas erstattbar ist.
    if (order.status === "offen") return true
    return dashOrderRefundableGet(order, inputs.tickets()).maxCents > 0
  }

  const dialog = createSignalObject<DashOrderActionDialog>(null)
  const holderTicketId = createSignalObject<string | null>(null)
  const notesState = dashOrderNotesStateCreate()
  const sessionUserName = () => dashSessionUser()?.name?.trim() || null
  const refundState = dashOrderRefundDialogStateCreate({
    order: inputs.order,
    tickets: inputs.tickets,
    onClose: () => dialog.set(null),
    onRefunded: () => dialog.set(null),
  })
  const cancelState = dashOrderCancelDialogStateCreate({ order: inputs.order, tickets: inputs.tickets })
  const buyerState = dashOrderBuyerDialogStateCreate({ order: inputs.order })
  const holderTicket = () => inputs.tickets().find((ticket) => ticket.id === holderTicketId.get()) ?? null
  const holderState = dashTicketHolderDialogStateCreate({ ticket: holderTicket })

  const openRefund = (order: DashOrder) => {
    refundState.openReset(order.id)
    refundState.selectedIds.set(
      refundState
        .refundable()
        .perTicket.filter((entry) => entry.refundable)
        .map((entry) => entry.ticketId),
    )
    dialog.set("refund")
  }

  const openCancel = (order: DashOrder) => {
    void order
    cancelState.openReset(true)
    dialog.set("cancel")
  }

  const openBuyer = (order: DashOrder) => {
    void order
    buyerState.openReset(true)
    dialog.set("buyer")
  }

  const openHolder = (_order: DashOrder, ticket: DashTicket) => {
    if (ticket.status === "storniert") {
      toastAdd({ title: "Stornierte Tickets können nicht umgeschrieben werden", variant: "error" })
      return
    }
    holderTicketId.set(ticket.id)
    holderState.holderName.set(ticket.holderName)
    holderState.holderEmail.set(ticket.holderEmail)
    holderState.error.set(null)
    holderState.pending.set(false)
    dialog.set("holder")
  }

  const refundSubmit = () => {
    if (refundState.pending.get()) return
    const order = inputs.order()
    const reasonText =
      refundState.reason.get() === "sonstiges" && refundState.reasonNote.get().trim() !== ""
        ? refundState.reasonNote.get().trim()
        : dashOrderReasonLabel(refundState.reason.get())
    const result = dashOrderRefund({
      orderId: order.id,
      mode: refundState.mode.get(),
      ticketIds: refundState.mode.get() === "tickets" ? refundState.selectedIds.get() : undefined,
      amountCents: refundState.mode.get() === "betrag" ? (refundState.amountCents.get() ?? 0) : undefined,
      includeFee: refundState.includeFee.get(),
      invalidateTickets: refundState.invalidateTickets.get(),
      reason: reasonText,
    })
    if (!result.success) {
      refundState.error.set(result.errorMessage)
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    refundState.pending.set(false)
    refundState.error.set(null)
    dialog.set(null)
    toastAdd({
      title: `Erstattung über ${dashCentsFormat(result.data.refundedCents)} ausgelöst`,
      description: "Der Käufer bekommt eine E-Mail.",
      variant: "success",
    })
  }

  const cancelWasOpen = () => inputs.order().status === "offen"
  const cancelSubmit = () => {
    if (cancelState.pending.get()) return
    const text = cancelState.reason.get().trim()
    if (!text) {
      cancelState.error.set("Bitte gib einen Grund für die Stornierung an.")
      return
    }
    cancelState.pending.set(true)
    const result = dashOrderCancel({ orderId: inputs.order().id, reason: text })
    cancelState.pending.set(false)
    if (!result.success) {
      cancelState.error.set(result.errorMessage)
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    dialog.set(null)
    toastAdd({
      title: `Bestellung ${inputs.order().number} storniert`,
      description: cancelWasOpen()
        ? "Die SEPA-Zahlung wird nicht mehr eingezogen."
        : `${dashCentsFormat(result.data.refundedCents)} inkl. Servicegebühr werden erstattet.`,
      variant: "success",
    })
  }

  const resend = (order: DashOrder) => {
    const result = dashOrderResend(order.id)
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: `Tickets erneut an ${order.buyer.email} gesendet`, variant: "success" })
  }

  const invoice = (order: DashOrder) => {
    toastAdd({ title: "Rechnung wird erstellt …" })
    void dashOrderInvoicePdf(order.id).then((result) => {
      if (!result.success) {
        toastAdd({ title: result.errorMessage, variant: "error" })
        return
      }
      const date =
        dashFileNameCreate([`rechnung ${order.number}`], "pdf", new Date())
          .split("_")
          .at(-1) ?? ""
      dashDownload(`rechnung_${order.number.toLowerCase()}_${date}.pdf`, result.data, "application/pdf")
      toastAdd({ title: "Rechnung heruntergeladen", variant: "success" })
    })
  }

  const buyerSubmit = () => {
    if (buyerState.pending.get()) return
    buyerState.pending.set(true)
    const result = dashOrderBuyerUpdate({
      orderId: inputs.order().id,
      firstName: buyerState.firstName.get(),
      lastName: buyerState.lastName.get(),
      email: buyerState.email.get(),
    })
    buyerState.pending.set(false)
    if (!result.success) {
      buyerState.error.set(result.errorMessage)
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    dialog.set(null)
    toastAdd({ title: "Käuferdaten gespeichert", variant: "success" })
  }

  const holderSubmit = () => {
    if (holderState.pending.get()) return
    const ticket = holderTicket()
    if (!ticket) return
    holderState.pending.set(true)
    const result = dashTicketHolderUpdate({
      ticketId: ticket.id,
      holderName: holderState.holderName.get(),
      holderEmail: holderState.holderEmail.get(),
    })
    holderState.pending.set(false)
    if (!result.success) {
      holderState.error.set(result.errorMessage)
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    dialog.set(null)
    holderTicketId.set(null)
    toastAdd({
      title: `Ticket auf ${holderState.holderName.get().trim()} umgeschrieben · neue E-Mail gesendet`,
      variant: "success",
    })
  }

  const noteAdd = (order: DashOrder, text: string) => {
    const result = dashOrderNoteAdd({ orderId: order.id, text })
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: "Notiz hinzugefügt", variant: "success" })
  }

  const noteDelete = (order: DashOrder, noteId: string, author: string) => {
    const userName = dashSessionUser()?.name?.trim() ?? ""
    if (userName === "" || author !== userName) {
      toastAdd({ title: "Du kannst nur deine eigenen Notizen löschen", variant: "error" })
      return
    }
    const result = dashOrderNoteDelete({ orderId: order.id, noteId })
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: "Notiz gelöscht", variant: "success" })
  }

  const actions: Partial<DashOrderSheetActions> = {}
  if (canManage()) {
    actions.resend = resend
    actions.invoice = invoice
    actions.editBuyer = openBuyer
    actions.editHolder = openHolder
    actions.addNote = noteAdd
  }
  if (canManage() || canRefund()) {
    // Rechnung bleibt auch für Erstatter sichtbar (Belegprüfung vor Erstattung)
    actions.invoice ??= invoice
  }
  if (canRefund() && orderRefundable()) {
    actions.refund = openRefund
  }
  if (canRefund() && orderCancellable()) {
    actions.cancel = openCancel
  }

  return {
    dialog,
    holderTicketId,
    holderTicket,
    notesState,
    sessionUserName,
    refundState,
    cancelState,
    buyerState,
    holderState,
    actions,
    canManage,
    canRefund,
    openRefund,
    openCancel,
    openBuyer,
    openHolder,
    refundSubmit,
    cancelSubmit,
    resend,
    invoice,
    buyerSubmit,
    holderSubmit,
    noteAdd,
    noteDelete,
    ticketTypeName: inputs.ticketTypeName,
  }
}

export type DashOrderSheetActionsState = ReturnType<typeof dashOrderSheetActionsStateCreate>
