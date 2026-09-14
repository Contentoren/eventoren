import { onMount } from "solid-js"
import { userSessionSignal } from "#src/auth/ui/signals/userSessionSignal.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"

export function eventorenAuthControlStateCreate() {
  const browserReady = createSignalObject(false)

  onMount(() => {
    browserReady.set(true)
  })

  const logout = async (event: SubmitEvent) => {
    event.preventDefault()
    userSessionSignal.set(null)
    try {
      await fetch("/logout", { method: "POST", credentials: "same-origin" })
    } finally {
      window.location.assign("/")
    }
  }

  return {
    isAuthenticated: () => browserReady.get() && userSessionSignal.get() !== null,
    logout,
  }
}
