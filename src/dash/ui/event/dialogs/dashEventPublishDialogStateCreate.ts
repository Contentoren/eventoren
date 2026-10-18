import { createEffect, on } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

/** Zustand für den Veröffentlichen-Dialog: Erfolgsansicht nach dem Veröffentlichen. */
export function dashEventPublishDialogStateCreate(inputs: { open: () => boolean }) {
  const published = createSignalObject(false)
  const error = createSignalObject<string | null>(null)
  const pending = createSignalObject(false)

  const fill = () => {
    published.set(false)
    error.set(null)
    pending.set(false)
  }

  const openReset = (open: boolean) => {
    if (!open) return
    fill()
  }

  // Gesteuertes `open` (Search-Params/URL): Zurücksetzen beim Öffnen, auch wenn
  // Corvus onOpenChange(true) nicht feuert.
  createEffect(
    on(
      inputs.open,
      (isOpen) => {
        if (!isOpen) return
        fill()
      },
      { defer: false },
    ),
  )

  return { published, error, pending, openReset }
}

export type DashEventPublishDialogState = ReturnType<typeof dashEventPublishDialogStateCreate>
