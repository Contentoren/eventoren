import { onCleanup, onMount } from "solid-js"

/**
 * Registers ⌘K / Ctrl+K to open the palette. Call during component setup only.
 * Listeners attach on the client via onMount and detach via onCleanup (SSR-safe).
 */
export function commandPaletteShortcutRegister(onOpen: () => void): void {
  onMount(() => {
    if (typeof document === "undefined") return
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        onOpen()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    onCleanup(() => document.removeEventListener("keydown", onKeyDown))
  })
}
