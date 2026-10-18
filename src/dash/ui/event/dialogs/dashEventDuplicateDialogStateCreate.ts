import { createEffect, on } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

import { dashEventDuplicateDefaultIso } from "./dashEventDialogsTime.ts"

/** Zustand für den Duplizieren-Dialog: neues Datum als ISO (gleiche Uhrzeit +7 Tage), Fehler, pending. */
export function dashEventDuplicateDialogStateCreate(inputs: {
  open: () => boolean
  eventId: () => string
  startsAt: () => string | null
  onClose: () => void
  onDuplicated: (newEventId: string) => void
}) {
  const dateIso = createSignalObject<string | null>(null)
  const error = createSignalObject<string | null>(null)
  const pending = createSignalObject(false)

  const fill = () => {
    error.set(null)
    pending.set(false)
    dateIso.set(dashEventDuplicateDefaultIso(inputs.startsAt()))
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

  return { dateIso, error, pending, openReset, onClose: inputs.onClose, onDuplicated: inputs.onDuplicated }
}

export type DashEventDuplicateDialogState = ReturnType<typeof dashEventDuplicateDialogStateCreate>
