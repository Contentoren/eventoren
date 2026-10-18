import { createEffect, on } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

/** Zustand für den Absagen-Dialog: Grund, Erstattungs-Schalter, Fehler, live berechnete Folgen. */
export function dashEventCancelDialogStateCreate(inputs: {
  open: () => boolean
  eventId: () => string
  onClose: () => void
  onCancelled: () => void
}) {
  const reason = createSignalObject("")
  const refundAll = createSignalObject(true)
  const error = createSignalObject<string | null>(null)
  const pending = createSignalObject(false)

  const fill = () => {
    reason.set("")
    refundAll.set(true)
    error.set(null)
    pending.set(false)
  }

  const openReset = (open: boolean) => {
    if (!open) return
    fill()
  }

  // Gesteuertes `open` (Search-Params/URL): Zurücksetzen beim Öffnen, auch wenn
  // Corvus onOpenChange(true) nicht feuert (Grund bleibt bewusst leer).
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

  return {
    reason,
    refundAll,
    error,
    pending,
    openReset,
    eventId: inputs.eventId,
    onClose: inputs.onClose,
    onCancelled: inputs.onCancelled,
  }
}

export type DashEventCancelDialogState = ReturnType<typeof dashEventCancelDialogStateCreate>
