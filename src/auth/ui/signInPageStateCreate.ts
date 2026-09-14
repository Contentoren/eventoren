import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import { userSessionParse } from "#src/auth/model/UserSession.ts"
import { userSessionSignal } from "#src/auth/ui/signals/userSessionSignal.ts"

export function signInPageStateCreate(inputs: { readonly returnTo: () => string | undefined }) {
  const errorMessage = createSignalObject("")
  const returnTo = () => safeReturnTo(inputs.returnTo())
  const loginUrl = () => `/login/zitadel?returnTo=${encodeURIComponent(returnTo())}`

  onMount(() => {
    const serialized = new URLSearchParams(window.location.search).get("userSession")
    if (!serialized) return

    const sessionResult = userSessionParse("signInPageSessionParse", serialized)
    if (!sessionResult.success) {
      errorMessage.set("Die Anmeldung konnte nicht übernommen werden. Bitte versuche es erneut.")
      return
    }

    userSessionSignal.set(sessionResult.data)
    window.history.replaceState({}, "", `/sign-in?returnTo=${encodeURIComponent(returnTo())}`)
    window.location.assign(returnTo())
  })

  return {
    errorMessage: errorMessage.get,
    loginUrl,
    returnTo,
  }
}

function safeReturnTo(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/"
  return value
}
