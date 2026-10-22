import * as a from "valibot"
import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResultError, type PromiseResult } from "#result"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerTicketCheckInApply } from "#src/organizer/convex/organizerTicketCheckInApply.ts"
import { organizerTicketCheckInTargetResolve } from "#src/organizer/convex/organizerTicketCheckInTargetResolve.ts"
import type { Id } from "#convex/_generated/dataModel.js"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { organizerDashboardAdmissionCheckInSchema } from "../model/organizerDashboardAdmissionCheckInSchema.ts"
import type { OrganizerDashboardAdmissionScanResult } from "../model/organizerDashboardAdmissionScanResultSchema.ts"
import { organizerDashboardAdmissionScopeGet } from "./organizerDashboardAdmissionScopeGet.ts"
import { organizerDashboardAdmissionScanResultOf } from "./organizerDashboardAdmissionScanResultOf.ts"

/**
 * Manual check-in by an organizer with `einlass.nutzen`. Every attempt —
 * accepted or rejected — is logged with entrance and machine-readable reason
 * so the live admission view can show rejected scans.
 */
export const organizerDashboardAdmissionCheckInMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    eventKey: v.string(),
    entrance: v.string(),
    ticketCode: v.optional(v.string()),
    ticketId: v.optional(v.id("ticketIssued")),
  },
  handler: (ctx, args): PromiseResult<unknown> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, ...input }) => {
      const op = "organizerDashboardAdmissionCheckInMutation"
      const auth = await organizerDashboardAuthorize(mutationCtx, userId, orgId, "einlass.nutzen")
      if (!auth.success) return auth
      const parsed = a.safeParse(organizerDashboardAdmissionCheckInSchema, {
        ...input,
        ...(input.ticketId !== undefined ? { ticketId: String(input.ticketId) } : {}),
      })
      if (!parsed.success) return createResultError(op, parsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
      const { eventKey, entrance, ticketCode } = parsed.output
      const ticketId = input.ticketId as Id<"ticketIssued"> | undefined
      if ((ticketCode === undefined) === (ticketId === undefined)) {
        return createResultError(op, "Genau einen Ticketcode oder eine Ticket-ID angeben")
      }
      const scope = await organizerDashboardAdmissionScopeGet(mutationCtx, orgId, eventKey, op)
      if (!scope.success) return scope
      const at = new Date().toISOString()
      const log = async (
        result: OrganizerDashboardAdmissionScanResult,
        ticketCodeLogged: string,
        ticketDocId: Id<"ticketIssued"> | undefined,
        reason?: string,
      ) => {
        await mutationCtx.db.insert("organizerDashboardAdmissionScans", {
          orgId,
          eventKey,
          ...(ticketDocId !== undefined ? { ticketId: ticketDocId } : {}),
          ticketCode: ticketCodeLogged,
          entrance,
          action: "checkin",
          result,
          ...(reason ? { reason } : {}),
          actorUserId: String(userId),
          at,
        })
      }
      const resolved = await organizerTicketCheckInTargetResolve(
        mutationCtx,
        scope.data,
        {
          ...(ticketCode !== undefined ? { ticketCode } : {}),
          ...(ticketId !== undefined ? { ticketId } : {}),
        },
        op,
      )
      if (!resolved.success) {
        const result = organizerDashboardAdmissionScanResultOf(resolved.code)
        await log(result, ticketCode ?? "", undefined, resolved.code)
        return resolved
      }
      const user = await mutationCtx.db.get("users", userId)
      if (!user) return createResultError(op, "User not found")
      const applied = await organizerTicketCheckInApply(mutationCtx, resolved.data, { user }, op)
      if (!applied.success) {
        const result = organizerDashboardAdmissionScanResultOf(applied.code)
        await log(result, resolved.data.ticket.code, resolved.data.ticket._id, applied.code)
        return applied
      }
      await log("ok", resolved.data.ticket.code, resolved.data.ticket._id)
      return applied
    }),
})
