import type { DashEvent } from "../model/dashEventSchema.ts"
import type { DashState } from "../model/dashStateSchema.ts"

export function dashOrgEventsIn(state: DashState, orgId: string): Array<DashEvent> {
  return state.events
    .filter((event) => event.orgId === orgId)
    .sort((left, right) => (left.startsAt < right.startsAt ? -1 : left.startsAt > right.startsAt ? 1 : 0))
}
