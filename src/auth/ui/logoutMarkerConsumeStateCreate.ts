import { onMount } from "solid-js"
import { eventorenLogoutMarkerCookie } from "#src/auth/model/eventorenLogoutMarkerCookie.ts"
import { eventorenSsoAttemptsExhaust } from "#src/auth/model/eventorenSsoAttemptsExhaust.ts"
import { userSessionsClear } from "#src/auth/ui/signals/userSessionsClear.ts"

export function logoutMarkerConsumeStateCreate(options: { readonly clear?: () => void } = {}): void {
  onMount(() => {
    if (!document.cookie.includes(`${eventorenLogoutMarkerCookie.name}=1`)) return
    eventorenSsoAttemptsExhaust()
    userSessionsClear()
    options.clear?.()
    // biome-ignore lint/suspicious/noDocumentCookie: the marker is intentionally client-readable and short-lived
    document.cookie = eventorenLogoutMarkerCookie.clear(window.location.protocol === "https:")
  })
}
