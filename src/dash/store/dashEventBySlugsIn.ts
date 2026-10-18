import type { DashEvent } from "../model/dashEventSchema.ts"
import type { DashState } from "../model/dashStateSchema.ts"

export function dashEventBySlugsIn(state: DashState, orgSlug: string, eventSlug: string): DashEvent | null {
  const org = state.orgs.find((candidate) => candidate.slug === orgSlug)
  if (!org) return null
  return state.events.find((event) => event.orgId === org.id && event.slug === eventSlug) ?? null
}
