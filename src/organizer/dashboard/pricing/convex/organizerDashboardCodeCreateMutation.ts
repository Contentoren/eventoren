import * as a from "valibot"
import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { organizerDashboardCodeGenerate } from "#src/organizer/dashboard/pricing/organizerDashboardCodeGenerate.ts"
import { organizerDashboardCodeNormalize } from "#src/organizer/dashboard/pricing/organizerDashboardCodeNormalize.ts"
import {
  organizerDashboardCodeBulkCreateSchema,
  organizerDashboardCodeCreateSchema,
} from "#src/organizer/dashboard/pricing/organizerDashboardCodeSchema.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerDashboardPricingEventScopeGet } from "./organizerDashboardPricingEventScopeGet.ts"

function organizerDashboardCodeRandom(): () => number {
  const words = crypto.getRandomValues(new Uint32Array(128))
  let cursor = 0
  return () => {
    const word = words[cursor % words.length] as number
    cursor += 1
    return word / 2 ** 32
  }
}

function organizerDashboardCodeBusinessCheck(args: {
  readonly op: string
  readonly kind: "rabatt" | "zugang"
  readonly discountType: "prozent" | "betrag" | undefined
  readonly discountValue: number | undefined
  readonly tierKeys: readonly string[]
}): PromiseResult<null> {
  if (args.kind === "rabatt") {
    if (args.discountType === undefined || args.discountValue === undefined) {
      return createResultError(args.op, "Rabatt braucht Art und Wert")
    }
    if (args.discountType === "prozent" && args.discountValue > 10000) {
      return createResultError(args.op, "Prozentrabatt maximal 100 %")
    }
  } else {
    if (args.tierKeys.length === 0) {
      return createResultError(args.op, "Zugangscode braucht mindestens eine Ticketart")
    }
    if (args.discountType !== undefined || args.discountValue !== undefined) {
      return createResultError(args.op, "Zugangscode kennt keinen Rabatt")
    }
  }
  return createResult(null)
}

/**
 * Creates one discount or access code, or a bulk batch with a shared prefix.
 * Codes are stored normalized; duplicates within the event are refused.
 * Hidden tiers unlock only through `zugang` codes that name them.
 */
export const organizerDashboardCodeCreateMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    eventKey: v.string(),
    kind: v.union(v.literal("rabatt"), v.literal("zugang")),
    code: v.optional(v.string()),
    prefix: v.optional(v.string()),
    count: v.optional(v.number()),
    discountType: v.optional(v.union(v.literal("prozent"), v.literal("betrag"))),
    discountValue: v.optional(v.number()),
    tierKeys: v.optional(v.array(v.string())),
    maxTickets: v.optional(v.number()),
    validFrom: v.optional(v.string()),
    validUntil: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: (ctx, args): PromiseResult<{ readonly codes: readonly string[] }> =>
    authMutationTokenToUserId(
      ctx,
      args,
      async (
        ctx,
        {
          userId,
          orgId,
          eventKey,
          kind,
          code,
          prefix,
          count,
          discountType,
          discountValue,
          tierKeys,
          maxTickets,
          validFrom,
          validUntil,
          note,
        },
      ) => {
        const op = "organizerDashboardCodeCreateMutation"
        const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "codes.bearbeiten")
        if (!auth.success) return auth
        const bulk = count !== undefined || prefix !== undefined
        const parsed = bulk
          ? a.safeParse(organizerDashboardCodeBulkCreateSchema, {
              orgId: String(orgId),
              eventKey,
              kind,
              ...(prefix !== undefined ? { prefix } : {}),
              count: count ?? 1,
              ...(discountType !== undefined ? { discountType } : {}),
              ...(discountValue !== undefined ? { discountValue } : {}),
              ...(tierKeys !== undefined ? { tierKeys } : {}),
              ...(maxTickets !== undefined ? { maxTickets } : {}),
              ...(validFrom !== undefined ? { validFrom } : {}),
              ...(validUntil !== undefined ? { validUntil } : {}),
              ...(note !== undefined ? { note } : {}),
            })
          : a.safeParse(organizerDashboardCodeCreateSchema, {
              orgId: String(orgId),
              eventKey,
              kind,
              ...(code !== undefined ? { code } : {}),
              ...(discountType !== undefined ? { discountType } : {}),
              ...(discountValue !== undefined ? { discountValue } : {}),
              ...(tierKeys !== undefined ? { tierKeys } : {}),
              ...(maxTickets !== undefined ? { maxTickets } : {}),
              ...(validFrom !== undefined ? { validFrom } : {}),
              ...(validUntil !== undefined ? { validUntil } : {}),
              ...(note !== undefined ? { note } : {}),
            })
        if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
        const input = parsed.output
        const business = organizerDashboardCodeBusinessCheck({
          op,
          kind: input.kind,
          discountType: input.discountType,
          discountValue: input.discountValue,
          tierKeys: input.tierKeys ?? [],
        })
        if (!business.success) return business
        const scope = await organizerDashboardPricingEventScopeGet(ctx, orgId, input.eventKey, op)
        if (!scope.success) return scope
        const resolvedTierKeys = input.tierKeys ?? []
        for (const tierKey of resolvedTierKeys) {
          const tierScope = await organizerDashboardPricingEventScopeGet(
            ctx,
            orgId,
            scope.data.event.eventKey,
            op,
            tierKey,
          )
          if (!tierScope.success) return tierScope
        }
        const existing = await ctx.db
          .query("organizerDashboardCodes")
          .withIndex("orgIdAndEventKeyAndCode", (q) => q.eq("orgId", orgId).eq("eventKey", scope.data.event.eventKey))
          .collect()
        const taken = new Set(existing.map((row) => row.code))
        const random = organizerDashboardCodeRandom()
        const candidates =
          "count" in input
            ? organizerDashboardCodeGenerate({
                prefix: input.prefix,
                count: input.count,
                existing: [...taken],
                random,
              })
            : [
                input.code === undefined
                  ? (organizerDashboardCodeGenerate({ count: 1, existing: [...taken], random })[0] as string)
                  : organizerDashboardCodeNormalize(input.code),
              ]
        if (candidates.length === 0 || candidates.some((candidate) => candidate === undefined)) {
          return createResultError(op, "Keine freien Codes verfügbar")
        }
        for (const candidate of candidates) {
          if (!/^[A-Z0-9-]{4,32}$/.test(candidate as string)) {
            return createResultError(op, "Code: 4–32 Zeichen aus A–Z, 0–9 und -")
          }
          if (taken.has(candidate as string)) return createResultError(op, `Code ${candidate} existiert bereits`)
          taken.add(candidate as string)
        }
        const at = new Date().toISOString()
        const created: string[] = []
        for (const candidate of candidates) {
          await ctx.db.insert("organizerDashboardCodes", {
            orgId,
            eventKey: scope.data.event.eventKey,
            kind: input.kind,
            code: candidate as string,
            ...(input.discountType !== undefined ? { discountType: input.discountType } : {}),
            ...(input.discountValue !== undefined ? { discountValue: input.discountValue } : {}),
            tierKeys: resolvedTierKeys,
            ...(input.maxTickets !== undefined ? { maxTickets: input.maxTickets } : {}),
            usedTickets: 0,
            ...(input.validFrom !== undefined ? { validFrom: input.validFrom } : {}),
            ...(input.validUntil !== undefined ? { validUntil: input.validUntil } : {}),
            active: true,
            ...(input.note !== undefined ? { note: input.note } : {}),
            createdAt: at,
            updatedAt: at,
          })
          created.push(candidate as string)
        }
        return createResult({ codes: created })
      },
    ),
})
