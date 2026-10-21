import { v } from "convex/values"
import * as a from "valibot"
import { internalQuery } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardPermissionSchema } from "../../model/organizerDashboardPermissionSchema.ts"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authTokenSessionResolve } from "#src/utils/convex_backend/authTokenSessionResolve.ts"
import { organizerDashboardOrderScopeGet } from "./organizerDashboardOrderScopeGet.ts"

export type OrganizerDashboardOrderBillingCoordinates = {
  userId: Id<"users">
  eventKey: string
  paymentReference: string
  orderReference: string
  stripeMode: "live" | "test"
}

/**
 * Internal gate for the organizer billing actions. Resolves the session
 * token to a user, enforces the per-function permission, checks the
 * organization order scope, and returns the billing coordinates from the
 * persisted order row. Payment, order, and mode references never come from
 * interface input: the stored checkout context is the only authority.
 */
export const organizerDashboardOrderBillingAccessQuery = internalQuery({
  args: { token: v.string(), orgId: v.id("orgs"), orderId: v.id("ticketOrders"), permission: v.string() },
  handler: async (ctx, args): PromiseResult<OrganizerDashboardOrderBillingCoordinates> => {
    const op = "organizerDashboardOrderBillingAccessQuery"
    const permission = a.safeParse(organizerDashboardPermissionSchema, args.permission)
    if (!permission.success) return createResultError(op, "Unknown permission")
    const verified = await authTokenSessionResolve(ctx, args.token)
    if (!verified.success) return verified
    const userId = verified.data.sub as Id<"users">
    const auth = await organizerDashboardAuthorize(ctx, userId, args.orgId, permission.output)
    if (!auth.success) return auth
    const scope = await organizerDashboardOrderScopeGet(ctx, args.orgId, args.orderId, op)
    if (!scope.success) return scope
    const order = scope.data.order
    if (order.paymentStatus !== "paid") return createResultError(op, "Bestellung ist nicht bezahlt")
    if (!order.billingOrderReference)
      return createResultError(op, "Für diese Bestellung liegt keine Billing-Abrechnung vor")
    return createResult({
      userId,
      eventKey: scope.data.event.eventKey,
      paymentReference: order.paymentReference,
      orderReference: order.billingOrderReference,
      stripeMode: order.stripeMode,
    })
  },
})
