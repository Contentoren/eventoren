import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import { ticketActivationCodeNormalize } from "./ticketActivationCodeNormalize.js"

const codePattern = /^[A-Z0-9]{8}$/

export const ticketActivationCodeValidateQuery = query({
  args: {
    eventKey: v.string(),
    tierKey: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args): PromiseResult<{ readonly valid: boolean }> => {
    // Minimal public answer on purpose: every failure mode maps to the same
    // generic invalid response, so no account or code-inventory details leak.
    const invalid = () => createResult({ valid: false as const })
    const normalized = ticketActivationCodeNormalize(args.code)
    if (!codePattern.test(normalized)) return invalid()
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey.trim()))
      .unique()
    if (!event || event.deletedAt || event.status !== "published") return invalid()
    const tier = await ctx.db
      .query("catalogTicketTiers")
      .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id).eq("tierKey", args.tierKey.trim()))
      .unique()
    if (!tier || tier.archivedAt) return invalid()
    const stored = await ctx.db
      .query("ticketActivationCodes")
      .withIndex("code", (q) => q.eq("code", normalized))
      .first()
    if (!stored || stored.tierId !== tier._id) return invalid()
    if (stored.status !== "available") return invalid()
    return createResult({ valid: true as const })
  },
})
