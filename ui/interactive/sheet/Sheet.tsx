import Dialog from "@corvu/dialog"
import { mdiClose } from "@adaptive-ds/mdi/mdiClose.js"
import type { JSX } from "solid-js"
import { Show } from "solid-js"
import { buttonVariant, buttonCvaIconOnly } from "#ui/interactive/button/buttonCva.js"
import { buttonIconCva } from "#ui/interactive/button/buttonIconCva.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { classMerge } from "#ui/utils/classMerge.js"

export type SheetSize = "sm" | "md" | "lg" | "xl"

export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  size?: SheetSize
  headerActions?: JSX.Element
  footer?: JSX.Element
  children: JSX.Element
  class?: string
}

const sheetSizeWidth: Record<SheetSize, string> = {
  sm: "sm:w-[400px]",
  md: "sm:w-[480px]",
  lg: "sm:w-[560px]",
  xl: "sm:w-[720px]",
}

/**
 * Controlled side panel on desktop (right, full height, overlay bg-black/40)
 * and bottom sheet on mobile (max-h-92dvh, grab handle).
 * Escape, overlay click, focus trap, focus restore and body scroll lock come from corvu.
 * Second-layer dialogs (ConfirmDialog, ModalDialog, …) must be rendered as JSX
 * children of this Sheet's content: corvu then treats them as nested layers, so
 * interacting with the child never closes the Sheet, Escape closes only the
 * top-most layer, and closing the child restores focus into the Sheet.
 */
export function Sheet(p: SheetProps) {
  return (
    <Dialog open={p.open} onOpenChange={p.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 motion-reduce:transition-none data-closed:opacity-0" />
        <Dialog.Content
          class={classMerge(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col",
            "rounded-t-2xl border-t border-border-subtle bg-surface text-content shadow-xl",
            "sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:max-h-none",
            "sm:rounded-none sm:border-t-0 sm:border-l sm:max-w-[calc(100vw-2rem)]",
            sheetSizeWidth[p.size ?? "md"],
            "transition-transform duration-200 motion-reduce:transition-none",
            "data-closed:translate-y-full sm:data-closed:translate-x-full sm:data-closed:translate-y-0",
            p.class,
          )}
        >
          <div class="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-border-subtle sm:hidden" aria-hidden="true" />
          <header class="flex shrink-0 items-start gap-3 border-b border-border-subtle px-5 py-4">
            <div class="min-w-0 flex-1">
              <Dialog.Label class="text-base font-semibold">{p.title}</Dialog.Label>
              <Show when={p.description}>
                <Dialog.Description class="mt-0.5 text-sm text-content-muted">{p.description}</Dialog.Description>
              </Show>
            </div>
            <Show when={p.headerActions}>{p.headerActions}</Show>
            <Dialog.Close
              class={classMerge(buttonCvaIconOnly(buttonVariant.ghost, false, false), "shrink-0")}
              aria-label="Schließen"
              title="Schließen"
            >
              <Icon path={mdiClose} class={buttonIconCva(buttonVariant.ghost, "")} />
            </Dialog.Close>
          </header>
          <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">{p.children}</div>
          <Show when={p.footer}>
            <footer class="flex shrink-0 items-center justify-end gap-2 border-t border-border-subtle px-5 py-4">
              {p.footer}
            </footer>
          </Show>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
