import { createSignalObject } from "#ui/utils/createSignalObject.ts"

export function demoControlsStateCreate() {
  const open = createSignalObject(false)
  const hidden = demoControlsHiddenRead()

  return {
    open: open.get,
    hidden,
    openOverlay: () => open.set(true),
    closeOverlay: () => open.set(false),
  }
}

function demoControlsHiddenRead() {
  if (typeof window === "undefined") return false
  return new URL(window.location.href).searchParams.get("demoControls") === "hidden"
}
