import { createEffect } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

export interface ConfirmConsequence {
  text: string
  icon?: string
  tone?: "neutral" | "warning" | "danger"
}

export interface ConfirmDialogStateProps {
  open: () => boolean
  onOpenChange: (open: boolean) => void
  confirmLabel: string
  requireText?: string
  onConfirm: () => void | Promise<void>
}

/**
 * State for ConfirmDialog: typed input, exact-match check, pending while the promise runs.
 * Typed text and pending reset when open flips to false.
 */
export function confirmDialogStateCreate(p: ConfirmDialogStateProps) {
  const typed = createSignalObject("")
  const pending = createSignalObject(false)

  const matches = () => {
    if (p.requireText === undefined) return true
    return typed.get() === p.requireText
  }

  const allowed = () => matches() && !pending.get()

  const confirm = async () => {
    if (!p.open()) return
    if (!matches()) return
    if (pending.get()) return
    pending.set(true)
    try {
      await p.onConfirm()
    } finally {
      pending.set(false)
    }
  }

  const onInput = (value: string) => {
    typed.set(value)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter") return
    if (!(event.target instanceof HTMLInputElement)) return
    if (!allowed()) return
    event.preventDefault()
    void confirm()
  }

  createEffect(() => {
    if (!p.open()) {
      typed.set("")
      pending.set(false)
    }
  })

  return { typed, pending, matches, allowed, confirm, onInput, onKeyDown }
}
