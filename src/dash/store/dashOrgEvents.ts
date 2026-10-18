import type { DashEvent } from "../model/dashEventSchema.ts"
import { dashOrgEventsIn } from "./dashOrgEventsIn.ts"
import { dashStateGet } from "./dashStateGet.ts"

export function dashOrgEvents(orgId: string): Array<DashEvent> {
  return dashOrgEventsIn(dashStateGet(), orgId)
}
