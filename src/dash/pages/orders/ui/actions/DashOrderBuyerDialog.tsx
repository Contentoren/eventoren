import { mdiAlertCircleOutline } from "@adaptive-ds/mdi/mdiAlertCircleOutline.js"
import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { ModalDialog } from "#ui/interactive/dialog/ModalDialog.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { DashField } from "../../../../ui/layout/DashField.tsx"
import type { DashOrderBuyerDialogState } from "./dashOrderBuyerDialogStateCreate.ts"

/** Käuferdaten-Dialog (ModalDialog sm, nested im Order-Sheet): Vorname/Nachname/E-Mail mit Validierung. */
export function DashOrderBuyerDialog(p: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderNumber: string
  state: DashOrderBuyerDialogState
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
      title="Käuferdaten bearbeiten"
      description={`Bestellung ${p.orderNumber}`}
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
        <div class="grid grid-cols-2 gap-3">
          <DashField label="Vorname" for="dash-buyer-first" required error={p.state.error.get()}>
            <Input
              id="dash-buyer-first"
              class="h-10 text-sm rounded-control"
              value={p.state.firstName.get()}
              onInput={(event) => p.state.firstName.set(event.currentTarget.value)}
              autocomplete="given-name"
            />
          </DashField>
          <DashField label="Nachname" for="dash-buyer-last" required>
            <Input
              id="dash-buyer-last"
              class="h-10 text-sm rounded-control"
              value={p.state.lastName.get()}
              onInput={(event) => p.state.lastName.set(event.currentTarget.value)}
              autocomplete="family-name"
            />
          </DashField>
        </div>
        <DashField label="E-Mail" for="dash-buyer-email" required>
          <Input
            id="dash-buyer-email"
            type="email"
            class="h-10 text-sm rounded-control"
            value={p.state.email.get()}
            onInput={(event) => p.state.email.set(event.currentTarget.value)}
            autocomplete="email"
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
    </ModalDialog>
  )
}
