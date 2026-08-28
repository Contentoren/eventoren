import { createEffect, createUniqueId, onCleanup } from "solid-js"

export function uiDialogStateCreate(inputs: { open: () => boolean; onClose: () => void }) {
  const titleId = `dialog-title-${createUniqueId()}`
  const descriptionId = `dialog-description-${createUniqueId()}`

  let element: HTMLDialogElement | undefined

  const attachRef = (node: HTMLDialogElement) => {
    element = node
  }

  createEffect(() => {
    const node = element
    if (!node) return

    if (inputs.open()) {
      if (!node.open) node.showModal()
      return
    }

    if (node.open) node.close()
  })

  createEffect(() => {
    if (typeof document === "undefined") return
    if (!inputs.open()) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    onCleanup(() => {
      document.body.style.overflow = previousOverflow
    })
  })

  const requestClose = () => {
    if (!inputs.open()) return
    inputs.onClose()
  }

  const dismissOnBackdrop = (event: PointerEvent) => {
    if (event.target !== element) return
    requestClose()
  }

  return { titleId, descriptionId, attachRef, requestClose, dismissOnBackdrop }
}
