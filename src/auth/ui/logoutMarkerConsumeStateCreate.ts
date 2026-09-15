import { onMount } from "solid-js"
import { eventorenLogoutMarkerCookie } from "#src/auth/model/eventorenLogoutMarkerCookie.ts"
import { userSessionsClear } from "#src/auth/ui/signals/userSessionsClear.ts"

export function logoutMarkerConsumeStateCreate(): void {
  onMount(() => {
    if (!document.cookie.includes(`${eventorenLogoutMarkerCookie.name}=1`)) return
    userSessionsClear()
    // biome-ignore lint/suspicious/noDocumentCookie: the marker is intentionally client-readable and short-lived
    document.cookie = eventorenLogoutMarkerCookie.clear(window.location.protocol === "https:")
  })
}
