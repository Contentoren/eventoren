import { createSignalObject } from "#ui/utils/createSignalObject.ts"

export function scannerLinkShareControlsStateCreate(url: () => string, title: () => string) {
  const message = createSignalObject("")
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(new URL(url(), window.location.origin).href)
      message.set("Link kopiert.")
    } catch {
      message.set("Kopieren nicht verfügbar. Bitte den Link im Feld markieren und manuell kopieren.")
    }
  }
  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: title(), url: new URL(url(), window.location.origin).href })
        message.set("Link geteilt.")
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
      }
    }
    await copy()
  }
  return { message: message.get, copy, share }
}
