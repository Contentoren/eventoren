import { createUniqueId, onCleanup, onMount } from "solid-js"

export function uiPopoverStateCreate(inputs: { open: () => boolean; onClose: () => void }) {
  const panelId = `popover-panel-${createUniqueId()}`

  let root: HTMLDivElement | undefined

  const attachRef = (node: HTMLDivElement) => {
    root = node
  }

  const requestClose = () => {
    if (!inputs.open()) return
    inputs.onClose()
  }

  onMount(() => {
    if (typeof document === "undefined") return

    const onPointerDown = (event: PointerEvent) => {
      if (!inputs.open()) return
      const node = root
      if (!node) return
      if (event.target instanceof Node && node.contains(event.target)) return
      requestClose()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      requestClose()
    }

    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)

    onCleanup(() => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    })
  })

  return { panelId, attachRef, requestClose }
}
