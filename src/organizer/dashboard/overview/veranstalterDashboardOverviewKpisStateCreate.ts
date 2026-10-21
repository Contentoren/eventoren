import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"

/**
 * Live overview KPIs for the dashboard overview section. Subscribes to the
 * authorized overview query only when the active membership may see revenue
 * (umsatz.sehen); otherwise no query runs. Buckets and deltas arrive
 * Berlin-based from the backend; display stays Europe/Berlin.
 */
export function veranstalterDashboardOverviewKpisStateCreate(inputs: {
  orgId: () => string | undefined
  canRead: () => boolean
  range: () => "7" | "30" | "365"
}) {
  const overview = queryCreate(api.organizerDashboardOverview.organizerDashboardOverviewQuery, () => {
    const orgId = inputs.orgId()
    if (!orgId || !inputs.canRead()) return undefined
    return { orgId: orgId as Id<"orgs">, range: inputs.range() }
  })
  return { overview }
}
