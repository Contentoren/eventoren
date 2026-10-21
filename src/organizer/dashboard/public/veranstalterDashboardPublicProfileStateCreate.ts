import { api } from "#convex/_generated/api.js"
import { publicQueryCreate } from "./publicQueryCreate.ts"

/**
 * Live public organizer profile: token-free Convex subscription to the
 * published events of one active organization. Same live tables as the
 * dashboard (catalogEvents, tiers, issued tickets).
 */
export function veranstalterDashboardPublicProfileStateCreate(inputs: { orgSlug: () => string | undefined }) {
  const profile = publicQueryCreate(api.organizerDashboardPublic.organizerDashboardPublicProfileQuery, () => {
    const orgSlug = inputs.orgSlug()
    if (!orgSlug) return undefined
    return { orgSlug }
  })
  return { profile }
}
