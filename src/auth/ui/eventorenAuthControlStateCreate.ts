import { createResult, createResultError, type PromiseResult } from "#result"
import { eventorenSsoAttemptsExhaust } from "#src/auth/model/eventorenSsoAttemptsExhaust.ts"
import { userSessionsClear } from "#src/auth/ui/signals/userSessionsClear.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import { eventorenAuthContextUse } from "./eventorenAuthContextUse.ts"

export function eventorenAuthControlStateCreate() {
  const auth = eventorenAuthContextUse()
  const errorMessage = createSignalObject("")

  const logout = async (event: SubmitEvent): PromiseResult<void> => {
    event.preventDefault()
    errorMessage.set("")
    let response: Response
    try {
      response = await fetch("/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
      })
    } catch (error) {
      const result = createResultError(
        "eventorenAuthControlLogout",
        "Die Abmeldung konnte nicht abgeschlossen werden.",
        error instanceof Error ? error.message : String(error),
      )
      errorMessage.set(result.errorMessage)
      return result
    }
    if (!response.ok) {
      const result = createResultError(
        "eventorenAuthControlLogout",
        "Die Abmeldung konnte nicht abgeschlossen werden.",
        `${response.status} ${response.statusText}`.trim(),
      )
      errorMessage.set(result.errorMessage)
      return result
    }

    eventorenSsoAttemptsExhaust()
    userSessionsClear()
    auth.clear()
    window.location.assign("/")
    return createResult(undefined)
  }

  return {
    isAuthenticated: () => auth.ready() && auth.identity() !== null,
    errorMessage: errorMessage.get,
    logout,
  }
}
