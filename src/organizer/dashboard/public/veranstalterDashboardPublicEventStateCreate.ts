import { api } from "#convex/_generated/api.js"
import { publicQueryCreate } from "./publicQueryCreate.ts"

/**
 * Live public event page: token-free Convex subscription to one published
 * event of an active organization, with live tier availability. Same live
 * tables as the dashboard; booking itself stays on the existing checkout.
 */
export function veranstalterDashboardPublicEventStateCreate(inputs: {
  orgSlug: () => string | undefined
  eventKey: () => string | undefined
}) {
  const event = publicQueryCreate(api.organizerDashboardPublic.organizerDashboardPublicEventQuery, () => {
    const orgSlug = inputs.orgSlug()
    const eventKey = inputs.eventKey()
    if (!orgSlug || !eventKey) return undefined
    return { orgSlug, eventKey }
  })
  return { event }
}
