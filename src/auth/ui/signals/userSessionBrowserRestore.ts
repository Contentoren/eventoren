import { userSessionParse } from "#src/auth/model/UserSession.ts"
import { userSessionSignal } from "./userSessionSignal.ts"

export function userSessionBrowserRestore(): void {
  if (typeof sessionStorage === "undefined") return
  const serialized = sessionStorage.getItem("userSession")
  if (!serialized) return
  const result = userSessionParse("userSessionBrowserRestore", serialized)
  if (result.success) userSessionSignal.set(result.data)
}
