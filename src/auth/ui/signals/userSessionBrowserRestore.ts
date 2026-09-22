import { userSessionIsStillValid, userSessionParse } from "#src/auth/model/UserSession.ts"
import { eventorenAuthContextUse } from "../eventorenAuthContextUse.ts"
import { userSessionSignal } from "./userSessionSignal.ts"

export function userSessionBrowserRestore(): void {
  const auth = eventorenAuthContextUse()
  if (auth.ready() && auth.identity() !== null) return
  if (typeof sessionStorage === "undefined") return
  const serialized = sessionStorage.getItem("userSession")
  if (!serialized) return
  const result = userSessionParse("userSessionBrowserRestore", serialized)
  if (result.success && userSessionIsStillValid(result.data)) {
    userSessionSignal.set(result.data)
    return
  }
  userSessionSignal.set(null)
}
