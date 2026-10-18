import type { DashState } from "../model/dashStateSchema.ts"
import type { DashUser } from "../model/dashUserSchema.ts"

export function dashSessionUserIn(state: DashState): DashUser | null {
  return state.users.find((user) => user.id === state.session.userId) ?? null
}
