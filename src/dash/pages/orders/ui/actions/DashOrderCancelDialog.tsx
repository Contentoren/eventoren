import { mdiAlertCircleOutline } from "@adaptive-ds/mdi/mdiAlertCircleOutline.js"
import { mdiCashRefund } from "@adaptive-ds/mdi/mdiCashRefund.js"
import { mdiEmailOutline } from "@adaptive-ds/mdi/mdiEmailOutline.js"
import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import { Show } from "solid-js"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import type { ConfirmConsequence } from "#ui/interactive/dialog/confirmDialogStateCreate.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { dashCentsFormat } from "../../../../model/dashCentsFormat.ts"
import type { DashOrderStatus } from "../../../../model/dashOrderStatusSchema.ts"
import { DashField } from "../../../../ui/layout/DashField.tsx"
import type { DashOrderCancelDialogState } from "./dashOrderCancelDialogStateCreate.ts"

/** Stornieren-Dialog (ConfirmDialog danger, nested im Order-Sheet): Folgen-Box + Pflicht-Grund im Textfeld. */
export function DashOrderCancelDialog(p: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderNumber: string
  orderStatus: DashOrderStatus
  state: DashOrderCancelDialogState
  onSubmit: () => void
}) {
  const consequences = (): ConfirmConsequence[] => {
    const count = p.state.ticketCount()
    const items: ConfirmConsequence[] = [
      { text: `Alle ${count} ${count === 1 ? "Ticket wird" : "Tickets werden"} ungültig`, icon: mdiTicketOutline },
    ]
    if (p.orderStatus === "offen") {
      items.push({ text: "Die SEPA-Zahlung wird nicht mehr eingezogen", icon: mdiCashRefund })
    } else {
      items.push({
        text: `${dashCentsFormat(p.state.amountCents())} inkl. Servicegebühr werden erstattet`,
        icon: mdiCashRefund,
      })
    }
    items.push({ text: "Käufer bekommt eine E-Mail", icon: mdiEmailOutline })
    return items
  }

  return (
    <ConfirmDialog
      nested
      open={p.open}
      onOpenChange={(open) => {
        p.state.openReset(open)
        p.onOpenChange(open)
      }}
      title={`Bestellung ${p.orderNumber} stornieren?`}
      description={
        p.orderStatus === "offen"
          ? "Die offene Bestellung wird storniert — es wurde noch nichts bezahlt."
          : "Die komplette Bestellung wird storniert und erstattet."
      }
      consequences={consequences()}
      confirmLabel="Stornieren"
      tone="danger"
      onConfirm={p.onSubmit}
    >
      <div class="mb-4 flex flex-col gap-1.5">
        <DashField label="Grund der Stornierung" for="dash-cancel-reason" required error={p.state.error.get()}>
          <Textarea
            id="dash-cancel-reason"
            class="text-sm rounded-control"
            rows={3}
            value={p.state.reason.get()}
            onInput={(event) => p.state.reason.set(event.currentTarget.value)}
            placeholder="z. B. Kunde hat doppelt gebucht"
          />
        </DashField>
        <Show when={p.state.error.get()}>
          {(message) => (
            <p role="alert" class="flex items-center gap-1 text-xs text-danger">
              <Icon path={mdiAlertCircleOutline} class="size-3.5 shrink-0" />
              {message()}
            </p>
          )}
        </Show>
      </div>
    </ConfirmDialog>
  )
}
