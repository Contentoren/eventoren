import * as a from "valibot"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"

export type OrganizerDashboardAdmissionScannerLinkRow = {
  readonly linkId: string
  readonly label: string
  readonly entrance: string | null
  readonly eventKeys: string[]
  readonly expiresAt: number
  readonly revokedAt: number | null
  readonly createdAt: number
}

const maxRows = 100

/**
 * Helper scanner links visible to entry staff. Capability codes are never
 * projected; helpers open links via the existing scanner flow.
 */
export const organizerDashboardAdmissionScannerLinkListQuery = query({
  args: { orgId: v.id("orgs"), eventKey: v.string(), token: v.string() },
  handler: (ctx, args): PromiseResult<{ links: OrganizerDashboardAdmissionScannerLinkRow[] }> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId, orgId, eventKey }) => {
      const op = "organizerDashboardAdmissionScannerLinkListQuery"
      const auth = await organizerDashboardAuthorize(queryCtx, userId, orgId, "einlass.nutzen")
      if (!auth.success) return auth
      const rows = await queryCtx.db
        .query("scannerLinks")
        .withIndex("roleAndCreatedAt", (q) => q.eq("role", "helper"))
        .order("desc")
        .take(maxRows)
      const links: OrganizerDashboardAdmissionScannerLinkRow[] = []
      for (const link of rows) {
        if (!link.eventKeys.includes(eventKey)) continue
        const snapshot = link.eventOrgIds?.[eventKey]
        if (snapshot !== undefined && snapshot !== orgId) continue
        links.push({
          linkId: link._id,
          label: link.name,
          entrance: link.entrance ?? null,
          eventKeys: link.eventKeys.filter(
            (key) => (link.eventOrgIds?.[key] ?? null) === orgId || !(key in (link.eventOrgIds ?? {})),
          ),
          expiresAt: link.expiresAt,
          revokedAt: link.revokedAt ?? null,
          createdAt: link.createdAt,
        })
      }
      return createResult({ links })
    }),
})
