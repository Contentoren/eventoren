import { mdiClose } from "@adaptive-ds/mdi/mdiClose.js"
import Dialog from "@corvu/dialog"
import { cn } from "cn"
import type { JSX } from "solid-js"
import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonCvaIconOnly, buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { buttonIconCva } from "#ui/interactive/button/buttonIconCva.js"
import { type ConfirmConsequence, confirmDialogStateCreate } from "#ui/interactive/dialog/confirmDialogStateCreate.js"
import { Icon } from "#ui/static/icon/Icon.jsx"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  consequences?: ConfirmConsequence[]
  confirmLabel: string
  cancelLabel?: string
  tone?: "danger" | "brand"
  requireText?: string
  onConfirm: () => void | Promise<void>
  children?: JSX.Element
  /** Rendered inside another dialog's content: lighter overlay, higher z. */
  nested?: boolean
}

const consequenceToneIconClass: Record<NonNullable<ConfirmConsequence["tone"]>, string> = {
  neutral: "text-content-muted",
  warning: "text-warning dark:text-amber-300",
  danger: "text-danger dark:text-red-300",
}

/**
 * Controlled destructive-confirm dialog. Consequences render as a compact icon list
 * in a soft box. With requireText the confirm stays disabled until the exact match;
 * Enter submits when allowed. Pending state while the promise runs.
 */
export function ConfirmDialog(p: ConfirmDialogProps) {
  const state = confirmDialogStateCreate({
    open: () => p.open,
    onOpenChange: (open) => p.onOpenChange(open),
    confirmLabel: p.confirmLabel,
    requireText: p.requireText,
    onConfirm: () => p.onConfirm(),
  })

  const confirmVariant = () => (p.tone === "brand" ? buttonVariant.contrast : buttonVariant.filledRed)

  return (
    <Dialog open={p.open} onOpenChange={p.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          class={cn(
            "fixed inset-0 transition-opacity duration-200 motion-reduce:transition-none data-closed:opacity-0",
            p.nested ? "z-[60] bg-black/20" : "z-40 bg-black/40",
          )}
        />
        <Dialog.Content
          class={cn(
            "fixed left-1/2 top-1/2 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2",
            "max-h-[92dvh] overflow-y-auto rounded-card border border-border-subtle bg-surface p-5 text-content shadow-xl",
            "max-w-lg transition-transform duration-200 motion-reduce:transition-none",
            "data-closed:opacity-0 data-closed:scale-95",
            p.nested ? "z-[70]" : "z-50",
          )}
        >
          <header class="mb-4 flex items-start justify-between gap-2">
            <div class="min-w-0">
              <Dialog.Label class="text-lg font-semibold">{p.title}</Dialog.Label>
              <Show when={p.description}>
                <Dialog.Description class="mt-1 text-sm text-content-muted">{p.description}</Dialog.Description>
              </Show>
            </div>
            <Dialog.Close
              class={cn(buttonCvaIconOnly(buttonVariant.outline, false, false), "shrink-0")}
              aria-label="Schließen"
              title="Schließen"
            >
              <Icon path={mdiClose} class={buttonIconCva(buttonVariant.outline, "")} />
            </Dialog.Close>
          </header>
          <Show when={p.children}>{p.children}</Show>
          <Show when={p.consequences && p.consequences.length > 0}>
            <ul class="mb-4 space-y-1.5 rounded-control bg-surface-muted px-4 py-3 text-sm">
              <For each={p.consequences ?? []}>
                {(item) => (
                  <li class="flex items-center gap-2">
                    <Show when={item.icon}>
                      <Icon
                        path={item.icon ?? ""}
                        class={cn("size-4", consequenceToneIconClass[item.tone ?? "neutral"])}
                      />
                    </Show>
                    <span>{item.text}</span>
                  </li>
                )}
              </For>
            </ul>
          </Show>
          <Show when={p.requireText !== undefined}>
            <div class="mb-4">
              <Label for="confirm-dialog-require-text">Zur Bestätigung „{p.requireText}“ eingeben</Label>
              <Input
                id="confirm-dialog-require-text"
                class="mt-1.5"
                value={state.typed.get()}
                onInput={(event) => state.onInput(event.currentTarget.value)}
                onKeyDown={(event) => state.onKeyDown(event)}
                autocomplete="off"
              />
            </div>
          </Show>
          <div class="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => p.onOpenChange(false)}>
              {p.cancelLabel ?? "Abbrechen"}
            </Button>
            <Button variant={confirmVariant()} onClick={() => void state.confirm()} disabled={!state.allowed()}>
              {state.pending.get() ? "Wird ausgeführt …" : p.confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
