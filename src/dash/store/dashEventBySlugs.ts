import type { DashEvent } from "../model/dashEventSchema.ts"
import { dashEventBySlugsIn } from "./dashEventBySlugsIn.ts"
import { dashStateGet } from "./dashStateGet.ts"

export function dashEventBySlugs(orgSlug: string, eventSlug: string): DashEvent | null {
  return dashEventBySlugsIn(dashStateGet(), orgSlug, eventSlug)
}
