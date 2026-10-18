import Dialog from "@corvu/dialog"
import type { JSX } from "solid-js"
import { onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

export interface DashMobileDrawerProps {
  open: { get: () => boolean; set: (open: boolean) => void }
  label: string
  children: JSX.Element
}

export function dashDrawerStateCreate() {
  return { open: createSignalObject(false) }
}

export function DashMobileDrawer(p: DashMobileDrawerProps) {
  const close = () => p.open.set(false)
  onMount(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    onCleanup(() => window.removeEventListener("keydown", onKey))
  })
  return (
    <Dialog open={p.open.get()} onOpenChange={(open) => p.open.set(open)}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 motion-reduce:transition-none data-closed:opacity-0 lg:hidden" />
        <Dialog.Content
          aria-label={p.label}
          class="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-surface text-content shadow-xl transition-transform duration-200 motion-reduce:transition-none data-closed:-translate-x-full lg:hidden"
        >
          <div class="min-h-0 flex-1 overflow-y-auto">{p.children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
