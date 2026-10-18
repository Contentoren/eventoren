import { createEffect, on } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

/** Zustand für den „Als Vorlage speichern“-Dialog: Name (Standard Eventtitel), Fehler, pending. */
export function dashTemplateSaveDialogStateCreate(inputs: {
  open: () => boolean
  eventId: () => string
  defaultName: () => string
  onClose: () => void
  onSaved: (templateId: string) => void
}) {
  const name = createSignalObject("")
  const error = createSignalObject<string | null>(null)
  const pending = createSignalObject(false)

  const fill = () => {
    error.set(null)
    pending.set(false)
    name.set(inputs.defaultName())
  }

  const openReset = (open: boolean) => {
    if (!open) return
    fill()
  }

  // Corvus onOpenChange feuert bei gesteuertem `open` (Search-Params/URL) kein
  // `true`: Beim Öffnen — und bei Eventwechsel — aus dem Store nachfüllen.
  createEffect(
    on(
      [inputs.open, inputs.eventId],
      ([isOpen]) => {
        if (!isOpen) return
        fill()
      },
      { defer: false },
    ),
  )

  return { name, error, pending, openReset, onClose: inputs.onClose, onSaved: inputs.onSaved }
}

export type DashTemplateSaveDialogState = ReturnType<typeof dashTemplateSaveDialogStateCreate>
