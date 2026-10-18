import { onCleanup, onMount } from "solid-js"
import { isServer } from "solid-js/web"

export interface StickySaveBarKeyProps {
  visible: () => boolean
  saving?: () => boolean
  onSave: () => void
}

/** Ctrl/⌘+S triggers onSave while visible; listener is cleaned up. */
export function stickySaveBarStateCreate(p: StickySaveBarKeyProps) {
  const onKeyDown = (event: KeyboardEvent) => {
    if (!p.visible()) return
    if (!(event.ctrlKey || event.metaKey)) return
    if (event.key !== "s" && event.key !== "S") return
    event.preventDefault()
    if (p.saving?.()) return
    p.onSave()
  }

  onMount(() => {
    if (isServer) return
    window.addEventListener("keydown", onKeyDown)
    onCleanup(() => {
      window.removeEventListener("keydown", onKeyDown)
    })
  })

  return {}
}
