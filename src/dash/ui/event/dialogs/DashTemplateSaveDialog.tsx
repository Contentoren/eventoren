import Dialog from "@corvu/dialog"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { classesDialogContentMerge, classesDialogOverlayMerge } from "#ui/interactive/dialog/classesDialogContent.js"
import { Input } from "#ui/input/input/Input.jsx"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { DashField } from "#src/dash/ui/layout/DashField.jsx"
import { dashStateGet } from "#src/dash/store/dashStateGet.ts"
import { dashTemplateCreateFromEvent } from "#src/dash/store/actions/event/dashTemplateCreateFromEvent.ts"

import { dashTemplateSaveDialogStateCreate } from "./dashTemplateSaveDialogStateCreate.ts"

export interface DashTemplateSaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
}

/**
 * Dialog „Als Vorlage speichern“ mit Namensfeld (Standard Eventtitel).
 * Schließt bei Erfolg mit Toast und Link zur Vorlagenliste.
 */
export function DashTemplateSaveDialog(p: DashTemplateSaveDialogProps) {
  const defaultName = () => dashStateGet().events.find((event) => event.id === p.eventId)?.title ?? ""
  const state = dashTemplateSaveDialogStateCreate({
    open: () => p.open,
    eventId: () => p.eventId,
    defaultName,
    onClose: () => p.onOpenChange(false),
    onSaved: () => {},
  })

  const submit = () => {
    if (state.pending.get()) return
    if (state.name.get().trim() === "") {
      state.error.set("Bitte gib einen Namen für die Vorlage an.")
      return
    }
    state.error.set(null)
    state.pending.set(true)
    const result = dashTemplateCreateFromEvent({ eventId: p.eventId, name: state.name.get() })
    state.pending.set(false)
    if (!result.success) {
      state.error.set(result.errorMessage)
      return
    }
    p.onOpenChange(false)
    toastAdd({
      title: "Vorlage gespeichert",
      description: "Du findest sie in der Vorlagenliste.",
      variant: "success",
      children: (
        <LinkButtonInternal to="/demo/dashboard/events" search={{ tab: "vorlagen" }} variant="outline" size="sm">
          Ansehen
        </LinkButtonInternal>
      ),
    })
    state.onSaved(result.data.id)
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
            <Dialog.Label class="text-lg font-semibold">Als Vorlage speichern</Dialog.Label>
            <Dialog.Description class="mt-1 text-sm text-content-muted">
              Titel, Preise und Ablauf wiederverwenden.
            </Dialog.Description>
          </header>
          <DashField label="Name der Vorlage" for="dash-template-name" error={state.error.get()}>
            <Input
              id="dash-template-name"
              class="h-10 text-sm rounded-control"
              value={state.name.get()}
              onInput={(event) => state.name.set(event.currentTarget.value)}
              autocomplete="off"
            />
          </DashField>
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
              {state.pending.get() ? "Wird gespeichert …" : "Vorlage speichern"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
