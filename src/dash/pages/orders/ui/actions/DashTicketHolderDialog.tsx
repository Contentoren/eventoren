import { mdiAlertCircleOutline } from "@adaptive-ds/mdi/mdiAlertCircleOutline.js"
import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { ModalDialog } from "#ui/interactive/dialog/ModalDialog.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import type { DashTicket } from "../../../../model/dashTicketSchema.ts"
import { DashField } from "../../../../ui/layout/DashField.tsx"
import type { DashTicketHolderDialogState } from "./dashTicketHolderDialogStateCreate.ts"

/** Umschreiben-Dialog (ModalDialog sm, nested im Order-Sheet): Ticket-Inhaber Name/E-Mail, neue E-Mail geht raus. */
export function DashTicketHolderDialog(p: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: DashTicket | null
  ticketTypeLabel: string | null
  state: DashTicketHolderDialogState
  onSubmit: () => void
}) {
  return (
    <ModalDialog
      nested
      open={p.open}
      onOpenChange={(open) => {
        if (!open) p.state.error.set(null)
        p.onOpenChange(open)
      }}
      size="sm"
      title="Ticket umschreiben"
      description={p.ticket ? `${p.ticket.code}${p.ticketTypeLabel ? ` · ${p.ticketTypeLabel}` : ""}` : "Ticket wählen"}
      footer={
        <div class="flex w-full flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant={buttonVariant.outline}
            class="h-9 px-3 text-sm"
            onClick={() => p.onOpenChange(false)}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            variant={buttonVariant.contrast}
            class="h-9 px-3 text-sm"
            disabled={p.state.pending.get()}
            onClick={p.onSubmit}
          >
            {p.state.pending.get() ? "Wird gespeichert …" : "Speichern"}
          </Button>
        </div>
      }
    >
      <div class="flex flex-col gap-4">
        <DashField label="Name" for="dash-holder-name" required error={p.state.error.get()}>
          <Input
            id="dash-holder-name"
            class="h-10 text-sm rounded-control"
            value={p.state.holderName.get()}
            onInput={(event) => p.state.holderName.set(event.currentTarget.value)}
            autocomplete="name"
            placeholder="z. B. Mara Lindner"
          />
        </DashField>
        <DashField label="E-Mail" for="dash-holder-email" required>
          <Input
            id="dash-holder-email"
            type="email"
            class="h-10 text-sm rounded-control"
            value={p.state.holderEmail.get()}
            onInput={(event) => p.state.holderEmail.set(event.currentTarget.value)}
            autocomplete="email"
            placeholder="mara@example.de"
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
        <p class="text-xs text-content-muted">Der neue Inhaber bekommt das Ticket per E-Mail zugeschickt.</p>
      </div>
    </ModalDialog>
  )
}
