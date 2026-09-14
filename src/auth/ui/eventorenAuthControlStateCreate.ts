import { userSessionSignal } from "#src/auth/ui/signals/userSessionSignal.ts"

export function eventorenAuthControlStateCreate() {
  const logout = async (event: SubmitEvent) => {
    event.preventDefault()
    userSessionSignal.set(null)
    try {
      await fetch("/logout", { method: "POST", credentials: "same-origin" })
    } finally {
      window.location.assign("/")
    }
  }

  return { logout }
}
