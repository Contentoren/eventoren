import Dialog from "@corvu/dialog"
import type { JSX } from "solid-js"
import { onCleanup, onMount } from "solid-js"

/** Mobile drawer for the Veranstalter navigation, focus-safe via dialog primitives. */
export function VeranstalterDashboardMobileDrawer(p: {
  readonly open: { get: () => boolean; set: (open: boolean) => void }
  readonly label: string
  readonly children: JSX.Element
}) {
  const close = () => p.open.set(false)
  onMount(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    onCleanup(() => window.removeEventListener("keydown", onKey))
  })
  return (
    <Dialog open={p.open.get()} onOpenChange={(open: boolean) => p.open.set(open)}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 motion-reduce:transition-none data-closed:opacity-0 lg:hidden" />
        <Dialog.Content
          aria-label={p.label}
          class="fixed inset-y-0 left-0 z-50 flex max-h-dvh w-[300px] max-w-[85vw] flex-col bg-surface shadow-xl transition-transform duration-200 motion-reduce:transition-none data-closed:-translate-x-full lg:hidden"
        >
          <div class="flex min-h-0 flex-1 flex-col">{p.children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
