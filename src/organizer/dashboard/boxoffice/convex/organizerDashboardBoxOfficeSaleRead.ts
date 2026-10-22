import { v } from "convex/values"
import { mutation, query, type MutationCtx, type QueryCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import type { Id } from "#convex/_generated/dataModel.js"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { organizerDashboardAdmissionScopeGet } from "../../admission/convex/organizerDashboardAdmissionScopeGet.ts"
import {
  organizerDashboardBoxOfficeSaleRowCreate,
  type OrganizerDashboardBoxOfficeSaleRow,
} from "./organizerDashboardBoxOfficeSaleCreateMutation.ts"

async function saleScopeGet(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<"orgs">,
  saleId: Id<"organizerDashboardBoxOfficeSales">,
  op: string,
) {
  const sale = await ctx.db.get("organizerDashboardBoxOfficeSales", saleId)
  if (!sale || String(sale.orgId) !== String(orgId)) return createResultError(op, "Kassenvorgang nicht gefunden")
  return createResult(sale)
}

/** Organizer view of one box-office sale (`abendkasse.nutzen`). */
export const organizerDashboardBoxOfficeSaleGetQuery = query({
  args: { orgId: v.id("orgs"), token: v.string(), saleId: v.id("organizerDashboardBoxOfficeSales") },
  handler: (ctx, args): PromiseResult<OrganizerDashboardBoxOfficeSaleRow> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId, orgId, saleId }) => {
      const op = "organizerDashboardBoxOfficeSaleGetQuery"
      const auth = await organizerDashboardAuthorize(queryCtx, userId, orgId, "abendkasse.nutzen")
      if (!auth.success) return auth
      const scoped = await saleScopeGet(queryCtx, orgId, saleId, op)
      if (!scoped.success) return scoped
      return createResult(organizerDashboardBoxOfficeSaleRowCreate(scoped.data))
    }),
})

/** Organizer sale list per event (`abendkasse.nutzen`), newest first. */
export const organizerDashboardBoxOfficeSaleListQuery = query({
  args: { orgId: v.id("orgs"), token: v.string(), eventKey: v.string() },
  handler: (ctx, args): PromiseResult<{ sales: OrganizerDashboardBoxOfficeSaleRow[] }> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId, orgId, eventKey }) => {
      const op = "organizerDashboardBoxOfficeSaleListQuery"
      const auth = await organizerDashboardAuthorize(queryCtx, userId, orgId, "abendkasse.nutzen")
      if (!auth.success) return auth
      const scope = await organizerDashboardAdmissionScopeGet(queryCtx, orgId, eventKey, op)
      if (!scope.success) return scope
      const page = await queryCtx.db
        .query("organizerDashboardBoxOfficeSales")
        .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", eventKey))
        .order("desc")
        .take(50)
      return createResult({
        sales: page
          .filter((sale) => String(sale.orgId) === String(orgId))
          .map((sale) => organizerDashboardBoxOfficeSaleRowCreate(sale)),
      })
    }),
})

/** Cancels a waiting sale (`abendkasse.preise`). Paid sales stay immutable. */
export const organizerDashboardBoxOfficeSaleCancelMutation = mutation({
  args: { orgId: v.id("orgs"), token: v.string(), saleId: v.id("organizerDashboardBoxOfficeSales") },
  handler: (ctx, args): PromiseResult<OrganizerDashboardBoxOfficeSaleRow> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, saleId }) => {
      const op = "organizerDashboardBoxOfficeSaleCancelMutation"
      const auth = await organizerDashboardAuthorize(mutationCtx, userId, orgId, "abendkasse.preise")
      if (!auth.success) return auth
      const scoped = await saleScopeGet(mutationCtx, orgId, saleId, op)
      if (!scoped.success) return scoped
      if (scoped.data.status !== "wartet") return createResultError(op, "Nur wartende Vorgänge sind stornierbar")
      await mutationCtx.db.patch("organizerDashboardBoxOfficeSales", saleId, { status: "abgebrochen" })
      const sale = await mutationCtx.db.get("organizerDashboardBoxOfficeSales", saleId)
      if (!sale) return createResultError(op, "Kassenvorgang nicht gefunden.")
      return createResult(organizerDashboardBoxOfficeSaleRowCreate(sale))
    }),
})
