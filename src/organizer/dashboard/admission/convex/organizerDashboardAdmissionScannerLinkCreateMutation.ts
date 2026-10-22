import * as a from "valibot"
import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerDashboardMigrationScannerSnapshotCreate } from "#src/organizer/dashboard/migration/organizerDashboardMigrationScannerScope.ts"
import { scannerLinkCodeCreate } from "#src/organizer/convex/scannerLinkCodeCreate.ts"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { organizerDashboardAdmissionScannerLinkSchema } from "../model/organizerDashboardAdmissionScannerLinkSchema.ts"
import { organizerDashboardAdmissionScopeGet } from "./organizerDashboardAdmissionScopeGet.ts"

const maxDurationMs = 365 * 24 * 60 * 60 * 1000

/**
 * Creates a helper scanner link for one org event. Requires
 * `tickets.bearbeiten`: granting entry access is explicit and scoped to the
 * organizer's own event. Capability codes stay server-side.
 */
export const organizerDashboardAdmissionScannerLinkCreateMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    eventKey: v.string(),
    label: v.string(),
    entrance: v.optional(v.string()),
    expiresAt: v.number(),
  },
  handler: (ctx, args): PromiseResult<{ linkId: Id<"scannerLinks"> }> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, ...input }) => {
      const op = "organizerDashboardAdmissionScannerLinkCreateMutation"
      const auth = await organizerDashboardAuthorize(mutationCtx, userId, orgId, "tickets.bearbeiten")
      if (!auth.success) return auth
      const parsed = a.safeParse(organizerDashboardAdmissionScannerLinkSchema, input)
      if (!parsed.success) return createResultError(op, parsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
      const { eventKey, label, entrance } = parsed.output
      const now = Date.now()
      if (!Number.isSafeInteger(input.expiresAt) || input.expiresAt <= now || input.expiresAt > now + maxDurationMs) {
        return createResultError(op, "Ablauf muss in der Zukunft und innerhalb eines Jahres liegen")
      }
      const scope = await organizerDashboardAdmissionScopeGet(mutationCtx, orgId, eventKey, op)
      if (!scope.success) return scope
      if (scope.data.status !== "published") {
        return createResultError(op, "Nur veröffentlichte Veranstaltungen bekommen Scanner-Links")
      }
      const snapshot = await organizerDashboardMigrationScannerSnapshotCreate(mutationCtx.db, [eventKey])
      if (!snapshot.success) return snapshot
      const linkId = await mutationCtx.db.insert("scannerLinks", {
        code: scannerLinkCodeCreate(),
        name: label,
        role: "helper",
        eventKeys: [eventKey],
        eventOrgIds: snapshot.data,
        createdByUserId: userId,
        ...(entrance !== undefined ? { entrance } : {}),
        expiresAt: input.expiresAt,
        createdAt: now,
      })
      return createResult({ linkId })
    }),
})
