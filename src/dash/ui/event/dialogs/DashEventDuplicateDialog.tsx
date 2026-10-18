import { mdiCalendarPlus } from "@adaptive-ds/mdi/mdiCalendarPlus.js"
import { mdiTruckFastOutline } from "@adaptive-ds/mdi/mdiTruckFastOutline.js"
import Dialog from "@corvu/dialog"
import { useNavigate } from "@tanstack/solid-router"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { classesDialogContentMerge, classesDialogOverlayMerge } from "#ui/interactive/dialog/classesDialogContent.js"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { DashDateTimeInput } from "#src/dash/ui/form/DashDateTimeInput.jsx"
import { DashField } from "#src/dash/ui/layout/DashField.jsx"
import { dashStateGet } from "#src/dash/store/dashStateGet.ts"
import { dashEventDuplicate } from "#src/dash/store/actions/event/dashEventDuplicate.ts"

import { dashEventDuplicateDialogStateCreate } from "./dashEventDuplicateDialogStateCreate.ts"

export interface DashEventDuplicateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
}

/**
 * Dialog „Event duplizieren“ (Corvu, Sheet-Größe sm): neues Datum, mitverschobene
 * Phasen und Verkaufsdaten, keine Codes. Schließt bei Erfolg mit Toast.
 */
export function DashEventDuplicateDialog(p: DashEventDuplicateDialogProps) {
  const navigate = useNavigate()
  const startsAt = () => dashStateGet().events.find((event) => event.id === p.eventId)?.startsAt ?? null
  const state = dashEventDuplicateDialogStateCreate({
    open: () => p.open,
    eventId: () => p.eventId,
    startsAt,
    onClose: () => p.onOpenChange(false),
    onDuplicated: (newEventId) => {
      p.onOpenChange(false)
      void navigate({ href: `/demo/dashboard/events/${newEventId}/details` })
    },
  })

  const submit = () => {
    if (state.pending.get()) return
    const iso = state.dateIso.get()
    if (iso === null || !Number.isFinite(Date.parse(iso))) {
      state.error.set("Bitte gib ein gültiges Datum mit Uhrzeit ein.")
      return
    }
    state.error.set(null)
    state.pending.set(true)
    const result = dashEventDuplicate({ eventId: p.eventId, startsAt: iso })
    state.pending.set(false)
    if (!result.success) {
      state.error.set(result.errorMessage)
      return
    }
    p.onOpenChange(false)
    toastAdd({ title: "Event dupliziert", description: "Der Entwurf liegt in deiner Eventliste.", variant: "success" })
    state.onDuplicated(result.data.id)
  }

  return (
    <Dialog
      open={p.open}
      onOpenChange={(open) => {
        state.openReset(open)
        p.onOpenChange(open)
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class={classesDialogOverlayMerge()} />
        <Dialog.Content class={classesDialogContentMerge("w-[calc(100vw-2rem)] max-w-[400px]")}>
          <header class="mb-4">
            <Dialog.Label class="text-lg font-semibold">Event duplizieren</Dialog.Label>
            <Dialog.Description class="mt-1 text-sm text-content-muted">
              Als Entwurf mit neuem Datum anlegen.
            </Dialog.Description>
          </header>
          <DashField label="Neues Datum" for="dash-duplicate-date" error={state.error.get()}>
            <DashDateTimeInput
              valueIso={state.dateIso.get()}
              onChange={(iso) => state.dateIso.set(iso)}
              required
              invalid={state.error.get() !== null}
            />
          </DashField>
          <ul class="mt-4 space-y-1.5 rounded-control bg-surface-muted px-4 py-3 text-sm text-content-muted">
            <li class="flex items-center gap-2">
              <Icon path={mdiTruckFastOutline} class="size-4 shrink-0" />
              Phasen und Verkaufsdaten werden mitverschoben
            </li>
            <li class="flex items-center gap-2">
              <Icon path={mdiCalendarPlus} class="size-4 shrink-0" />
              Codes werden nicht übernommen
            </li>
          </ul>
          <div class="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" class="h-9 px-3 text-sm" onClick={() => p.onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button
              variant={buttonVariant.contrast}
              class="h-9 px-3 text-sm gap-1.5"
              onClick={submit}
              disabled={state.pending.get()}
            >
              {state.pending.get() ? "Wird dupliziert …" : "Duplizieren"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
