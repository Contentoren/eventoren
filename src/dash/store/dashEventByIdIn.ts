import type { DashEvent } from "../model/dashEventSchema.ts"
import type { DashState } from "../model/dashStateSchema.ts"

export function dashEventByIdIn(state: DashState, id: string): DashEvent | null {
  return state.events.find((event) => event.id === id) ?? null
}
