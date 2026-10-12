import { v } from "convex/values"
import type { MutationCtx } from "#convex/_generated/server.js"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { catalogAdminAuthorizeFn } from "#src/catalog/convex/catalogAdminAuthorizeFn.js"
import type { TicketActivationCodeGenerateResult } from "#src/ticketing/TicketActivationCodeGenerateResult.ts"
import { ticketActivationCodeLimits } from "#src/ticketing/ticketActivationCodeLimits.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { ticketActivationCodeCreate } from "./ticketActivationCodeCreate.js"

const codeCollisionRetriesMax = 10

export const ticketActivationCodeGenerateMutation = mutation({
  args: {
    token: v.string(),
    eventKey: v.string(),
    tierKey: v.string(),
    count: v.number(),
  },
  handler: async (ctx, args): PromiseResult<TicketActivationCodeGenerateResult> =>
    authMutationTokenToUserId(ctx, args, ticketActivationCodeGenerateAuthorizedFn),
})

async function ticketActivationCodeGenerateAuthorizedFn(
  ctx: MutationCtx,
  args: { readonly eventKey: string; readonly tierKey: string; readonly count: number; readonly userId: IdUser },
): PromiseResult<TicketActivationCodeGenerateResult> {
  const op = "ticketActivationCodeGenerateMutation"
  const adminResult = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!adminResult.success) return adminResult
  if (!Number.isSafeInteger(args.count) || args.count < 1 || args.count > ticketActivationCodeLimits.countMax)
    return createResultError(op, `Die Anzahl muss zwischen 1 und ${ticketActivationCodeLimits.countMax} liegen`)
  const eventKey = args.eventKey.trim()
  const tierKey = args.tierKey.trim()
  if (eventKey.length === 0 || tierKey.length === 0)
    return createResultError(op, "Event und Ticketprodukt sind erforderlich")

  const event = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
    .unique()
  if (!event || event.deletedAt) return createResultError(op, "Das Event wurde nicht gefunden")
  const tier = await ctx.db
    .query("catalogTicketTiers")
    .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id).eq("tierKey", tierKey))
    .unique()
  if (!tier || tier.archivedAt) return createResultError(op, "Das Ticketprodukt wurde nicht gefunden")

  // Stable per-product numbering across batches: continue after the highest stored number.
  const latest = await ctx.db
    .query("ticketActivationCodes")
    .withIndex("tierIdAndNumber", (q) => q.eq("tierId", tier._id))
    .order("desc")
    .first()
  let nextNumber = (latest?.number ?? 0) + 1
  const now = new Date().toISOString()
  const generated: {
    readonly id: string
    readonly number: number
    readonly code: string
    readonly status: "available"
  }[] = []
  for (let index = 0; index < args.count; index++) {
    const code = await ticketActivationCodeUniqueCreate(ctx, op)
    if (!code.success) return code
    const id = await ctx.db.insert("ticketActivationCodes", {
      eventId: event._id,
      tierId: tier._id,
      eventKey: event.eventKey,
      tierKey: tier.tierKey,
      code: code.data,
      number: nextNumber,
      status: "available",
      createdAt: now,
      updatedAt: now,
    })
    generated.push({ id, number: nextNumber, code: code.data, status: "available" as const })
    nextNumber += 1
  }
  // Generation never toggles activationCodeRequired; the product switch stays managed separately.
  return createResult({ eventKey: event.eventKey, tierKey: tier.tierKey, generated, lastNumber: nextNumber - 1 })
}

// Convex indexes are not unique constraints: the collision read inside this same
// mutation plus the transactional index-range conflict on concurrent commits keeps
// globally unique codes. Parallel mutations generating the same candidate retry
// the whole transaction and then draw a fresh candidate.
async function ticketActivationCodeUniqueCreate(ctx: MutationCtx, op: string): PromiseResult<string> {
  for (let attempt = 0; attempt < codeCollisionRetriesMax; attempt++) {
    const candidate = ticketActivationCodeCreate()
    const collision = await ctx.db
      .query("ticketActivationCodes")
      .withIndex("code", (q) => q.eq("code", candidate))
      .first()
    if (!collision) return createResult(candidate)
  }
  return createResultError(op, "Es konnte kein eindeutiger Code erzeugt werden. Bitte erneut versuchen")
}
