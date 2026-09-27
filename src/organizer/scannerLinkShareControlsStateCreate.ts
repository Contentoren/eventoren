import { createSignalObject } from "#ui/utils/createSignalObject.ts"

export function scannerLinkShareControlsStateCreate(url: () => string, title: () => string, selectUrl: () => void) {
  const message = createSignalObject("")
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(new URL(url(), window.location.origin).href)
      message.set("Link kopiert.")
    } catch {
      selectUrl()
      message.set("Link nicht kopiert. Zwischenablage nicht verfügbar; der Link ist markiert. Bitte manuell kopieren.")
    }
  }
  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: title(), url: new URL(url(), window.location.origin).href })
        message.set("Link geteilt.")
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          message.set("Teilen abgebrochen.")
          return
        }
      }
    }
    await copy()
  }
  return { message: message.get, copy, share }
}
