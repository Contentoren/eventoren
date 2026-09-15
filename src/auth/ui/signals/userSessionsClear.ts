import { userSessionSignal } from "./userSessionSignal.ts"
import { userSessionsSignal } from "./userSessionsSignal.ts"

export function userSessionsClear(): void {
  userSessionSignal.set(null)
  userSessionsSignal.set([])
}
