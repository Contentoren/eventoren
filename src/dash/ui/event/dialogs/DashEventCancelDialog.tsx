import { mdiCashRefund } from "@adaptive-ds/mdi/mdiCashRefund.js"
import { mdiEmailOutline } from "@adaptive-ds/mdi/mdiEmailOutline.js"
import { mdiPauseCircle } from "@adaptive-ds/mdi/mdiPauseCircle.js"
import { Show } from "solid-js"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import type { ConfirmConsequence } from "#ui/interactive/dialog/confirmDialogStateCreate.js"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { DashField } from "#src/dash/ui/layout/DashField.jsx"
import { dashStateGet } from "#src/dash/store/dashStateGet.ts"
import { dashCentsFormat } from "#src/dash/model/dashCentsFormat.ts"
import { dashOrderTicketValue } from "#src/dash/model/dashOrderTicketValue.ts"
import { dashEventCancel } from "#src/dash/store/actions/event/dashEventCancel.ts"

import { dashEventCancelDialogStateCreate } from "./dashEventCancelDialogStateCreate.ts"

export interface DashEventCancelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
}

/**
 * Dialog „Event absagen“ (ConfirmDialog, tone danger, requireText = Eventname):
 * Grund (Pflicht), Erstattungs-Schalter, live berechnete Folgen. Schließt bei Erfolg mit Toast.
 */
export function DashEventCancelDialog(p: DashEventCancelDialogProps) {
  const state = dashEventCancelDialogStateCreate({
    open: () => p.open,
    eventId: () => p.eventId,
    onClose: () => p.onOpenChange(false),
    onCancelled: () => {},
  })

  const event = () => dashStateGet().events.find((candidate) => candidate.id === p.eventId)

  const consequences = (): ConfirmConsequence[] => {
    const store = dashStateGet()
    const current = event()
    if (!current) return []
    const refundable = state.refundAll.get()
      ? store.orders.filter(
          (order) => order.eventId === current.id && (order.status === "bezahlt" || order.status === "teilerstattet"),
        )
      : []
    const refundedCents = refundable.reduce((sum, order) => {
      const remaining =
        dashOrderTicketValue(order) - order.refunds.reduce((part, refund) => part + refund.amountCents, 0)
      return sum + Math.max(0, remaining)
    }, 0)
    const holderEmails = new Set<string>()
    for (const ticket of store.tickets) {
      if (ticket.eventId !== current.id || ticket.status !== "gueltig") continue
      holderEmails.add(ticket.holderEmail.toLowerCase())
    }
    const items: ConfirmConsequence[] = [
      { text: "Der Verkauf wird sofort gestoppt", icon: mdiPauseCircle, tone: "warning" },
      {
        text: `${holderEmails.size} Ticketinhaber bekommen eine Absage-E-Mail`,
        icon: mdiEmailOutline,
        tone: "neutral",
      },
    ]
    if (state.refundAll.get()) {
      items.unshift({
        text: `${refundable.length} Bestellungen werden erstattet · ${dashCentsFormat(refundedCents)}`,
        icon: mdiCashRefund,
        tone: "danger",
      })
    }
    return items
  }

  const confirm = () => {
    if (state.pending.get()) return
    const reasonText = state.reason.get().trim()
    if (!reasonText) {
      state.error.set("Bitte gib einen Grund für die Absage an.")
      return
    }
    state.error.set(null)
    state.pending.set(true)
    const result = dashEventCancel({ eventId: p.eventId, reason: reasonText, refundAll: state.refundAll.get() })
    state.pending.set(false)
    if (!result.success) {
      state.error.set(result.errorMessage)
      throw new Error(result.errorMessage)
    }
    p.onOpenChange(false)
    toastAdd({
      title: `„${event()?.title ?? "Event"}“ abgesagt`,
      description: state.refundAll.get()
        ? `${result.data.refundedOrders} Bestellungen erstattet · ${dashCentsFormat(result.data.refundedCents)}.`
        : "Alle Ticketinhaber bekommen eine Absage-E-Mail.",
      variant: "success",
    })
    state.onCancelled()
  }

  return (
    <ConfirmDialog
      open={p.open}
      onOpenChange={(open) => {
        state.openReset(open)
        p.onOpenChange(open)
      }}
      title={`„${event()?.title ?? "Event"}“ absagen?`}
      description="Diese Aktion stoppt den Verkauf sofort und informiert alle Ticketinhaber."
      consequences={consequences()}
      confirmLabel="Event absagen"
      tone="danger"
      requireText={event()?.title ?? ""}
      onConfirm={confirm}
    >
      <div class="mb-4 flex flex-col gap-3">
        <DashField label="Grund der Absage" for="dash-cancel-reason" required error={state.error.get()}>
          <Textarea
            id="dash-cancel-reason"
            class="h-10 text-sm rounded-control"
            value={state.reason.get()}
            onInput={(current) => state.reason.set(current.currentTarget.value)}
            placeholder="z. B. Krankheit der Band"
          />
        </DashField>
        <Show when={event()?.status !== "entwurf"}>
          <Checkbox
            id="dash-cancel-refund"
            checked={state.refundAll.get()}
            onChange={(checked) => state.refundAll.set(checked)}
          >
            <span class="text-sm">
              <span class="font-medium">Alle Bestellungen erstatten</span>
              <span class="text-content-muted"> · inklusive Servicegebühr</span>
            </span>
          </Checkbox>
        </Show>
        <Show when={state.error.get()}>
          {(message) => (
            <p role="alert" class="flex items-center gap-1 text-xs text-danger dark:text-red-300">
              {message()}
            </p>
          )}
        </Show>
        <p class="flex items-center gap-1.5 text-xs text-content-muted">
          <span aria-hidden="true">ⓘ</span> Die Absage geht als E-Mail an alle Ticketinhaber.
        </p>
      </div>
    </ConfirmDialog>
  )
}
