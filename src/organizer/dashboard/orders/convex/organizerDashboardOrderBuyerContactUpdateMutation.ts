import { v } from "convex/values"
import * as a from "valibot"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { valibotObjectToConvexFields } from "#src/utils/convex/valibotToConvex.ts"
import {
  organizerDashboardOrderBuyerContactSchema,
  type OrganizerDashboardOrderBuyerContactInput,
} from "../model/organizerDashboardOrderBuyerContactSchema.ts"
import { organizerDashboardOrderScopeGet } from "./organizerDashboardOrderScopeGet.ts"
import { organizerDashboardOrderAuditWrite } from "./organizerDashboardOrderAuditWrite.ts"

export const organizerDashboardOrderBuyerContactUpdateMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    orderId: v.id("ticketOrders"),
    ...valibotObjectToConvexFields(organizerDashboardOrderBuyerContactSchema),
  },
  handler: (ctx, args): PromiseResult<{ contact: OrganizerDashboardOrderBuyerContactInput }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, orderId, ...input }) => {
      const op = "organizerDashboardOrderBuyerContactUpdateMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "bestellungen.verwalten")
      if (!auth.success) return auth
      const scope = await organizerDashboardOrderScopeGet(ctx, orgId, orderId, op)
      if (!scope.success) return scope
      const parsed = a.safeParse(organizerDashboardOrderBuyerContactSchema, input)
      if (!parsed.success) return createResultError(op, parsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
      if (!Object.values(parsed.output).some((value) => value !== undefined))
        return createResultError(op, "Keine Kontaktänderung angegeben")
      const previous = scope.data.order.operationalContact
      const contact = {
        givenName: previous?.givenName,
        familyName: previous?.familyName,
        email: previous?.email,
        phone: previous?.phone,
      }
      for (const key of ["givenName", "familyName", "email", "phone"] as const) {
        const value = parsed.output[key]
        if (value !== undefined) contact[key] = value || undefined
      }
      const at = new Date().toISOString()
      await ctx.db.patch("ticketOrders", orderId, {
        operationalContact: { ...contact, updatedAt: at, updatedByUserId: userId },
      })
      await organizerDashboardOrderAuditWrite(ctx, {
        orgId,
        orderId,
        eventKey: scope.data.order.eventKey,
        actorUserId: userId,
        at,
        action: "buyer_contact_updated",
      })
      return createResult({ contact })
    }),
})
