import { mdiClose } from "@adaptive-ds/mdi/mdiClose.js"
import Dialog from "@corvu/dialog"
import { cn } from "cn"
import type { JSX } from "solid-js"
import { Show } from "solid-js"
import { buttonCvaIconOnly, buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { buttonIconCva } from "#ui/interactive/button/buttonIconCva.js"
import { type ModalDialogSize, modalDialogStateCreate } from "#ui/interactive/dialog/modalDialogStateCreate.js"
import { Icon } from "#ui/static/icon/Icon.jsx"

export interface ModalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  size?: ModalDialogSize
  footer?: JSX.Element
  children: JSX.Element
  class?: string
  /** Rendered inside another dialog's content: lighter overlay (bg-black/20), higher z. */
  nested?: boolean
}

/**
 * Controlled centered dialog: card (rounded-card, border, shadow-xl) on desktop,
 * full-width bottom sheet below 640 px. Scrollable body (max-h-70vh), sticky
 * footer. Overlay click, Escape, focus trap, focus restore and scroll lock come
 * from corvu. Render as a JSX child of a Sheet's content to stack as a nested
 * layer (parent Sheet stays open, Escape closes only the top layer).
 */
export function ModalDialog(p: ModalDialogProps) {
  const state = modalDialogStateCreate({
    size: () => p.size ?? "md",
    nested: () => p.nested ?? false,
  })

  return (
    <Dialog open={p.open} onOpenChange={p.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class={state.overlayClass()} />
        <Dialog.Content class={state.contentClass(p.class)}>
          <div class="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-border-subtle sm:hidden" aria-hidden="true" />
          <header class="flex shrink-0 items-start gap-3 border-b border-border-subtle px-5 py-4">
            <div class="min-w-0 flex-1">
              <Dialog.Label class="text-base font-semibold">{p.title}</Dialog.Label>
              <Show when={p.description}>
                <Dialog.Description class="mt-0.5 text-sm text-content-muted">{p.description}</Dialog.Description>
              </Show>
            </div>
            <Dialog.Close
              class={cn(buttonCvaIconOnly(buttonVariant.ghost, false, false), "shrink-0")}
              aria-label="Schließen"
              title="Schließen"
            >
              <Icon path={mdiClose} class={buttonIconCva(buttonVariant.ghost, "")} />
            </Dialog.Close>
          </header>
          <div class="max-h-[70vh] min-h-0 flex-1 overflow-y-auto px-5 py-4">{p.children}</div>
          <Show when={p.footer}>
            <footer class="sticky bottom-0 flex shrink-0 items-center justify-end gap-2 border-t border-border-subtle bg-surface px-5 py-4">
              {p.footer}
            </footer>
          </Show>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
