import { v } from "convex/values"
import * as a from "valibot"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { valibotObjectToConvexFields } from "#src/utils/convex/valibotToConvex.ts"
import { organizerDashboardOrderParticipantUpdateSchema } from "../model/organizerDashboardOrderParticipantUpdateSchema.ts"
import {
  organizerDashboardOrderParticipantCreate,
  type OrganizerDashboardOrderParticipant,
} from "../model/organizerDashboardOrderParticipantCreate.ts"
import { organizerDashboardOrderScopeGet } from "./organizerDashboardOrderScopeGet.ts"
import { organizerDashboardOrderAuditWrite } from "./organizerDashboardOrderAuditWrite.ts"

export const organizerDashboardOrderParticipantUpdateMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    orderId: v.id("ticketOrders"),
    ticketId: v.id("ticketIssued"),
    ...valibotObjectToConvexFields(organizerDashboardOrderParticipantUpdateSchema),
  },
  handler: (ctx, args): PromiseResult<{ participant: OrganizerDashboardOrderParticipant }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, orderId, ticketId, ...input }) => {
      const op = "organizerDashboardOrderParticipantUpdateMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "bestellungen.verwalten")
      if (!auth.success) return auth
      const scope = await organizerDashboardOrderScopeGet(ctx, orgId, orderId, op)
      if (!scope.success) return scope
      const ticket = await ctx.db.get("ticketIssued", ticketId)
      if (!ticket || ticket.orderId !== orderId || ticket.eventKey !== scope.data.event.eventKey)
        return createResultError(op, "Ticket nicht verfügbar")
      const parsed = a.safeParse(organizerDashboardOrderParticipantUpdateSchema, input)
      if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
      if (!Object.values(parsed.output).some((value) => value !== undefined))
        return createResultError(op, "Keine Teilnehmeränderung angegeben")
      const patch = {
        ...(parsed.output.participantName === undefined
          ? {}
          : { participantName: parsed.output.participantName || undefined }),
        ...(parsed.output.participantEmail === undefined
          ? {}
          : { participantEmail: parsed.output.participantEmail || undefined }),
      }
      await ctx.db.patch("ticketIssued", ticketId, patch)
      await organizerDashboardOrderAuditWrite(ctx, {
        orgId,
        orderId,
        eventKey: ticket.eventKey,
        actorUserId: userId,
        at: new Date().toISOString(),
        action: "participant_updated",
      })
      return createResult({ participant: organizerDashboardOrderParticipantCreate({ ...ticket, ...patch }) })
    }),
})
