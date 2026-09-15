import { onMount } from "solid-js"
import { userSessionSignal } from "#src/auth/ui/signals/userSessionSignal.ts"
import { userSessionsClear } from "#src/auth/ui/signals/userSessionsClear.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"

export function eventorenAuthControlStateCreate() {
  const browserReady = createSignalObject(false)

  onMount(() => {
    browserReady.set(true)
  })

  const logout = async (event: SubmitEvent) => {
    event.preventDefault()
    const token = userSessionSignal.get()?.token
    userSessionsClear()
    try {
      await fetch("/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      })
    } finally {
      window.location.assign("/")
    }
  }

  return {
    isAuthenticated: () => browserReady.get() && userSessionSignal.get() !== null,
    logout,
  }
}
