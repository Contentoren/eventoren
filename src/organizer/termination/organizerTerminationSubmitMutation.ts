import * as v from "valibot"
import { mutation } from "#convex/_generated/server.js"
import { internal } from "#convex/_generated/api.js"
import { createResult, createResultError } from "#result"
import { valibotToConvex } from "#src/utils/convex/valibotToConvex.ts"
import { organizerTerminationRequestSchema } from "./organizerTerminationRequestSchema.ts"
import { organizerTerminationDeclarationCreate } from "./organizerTerminationDeclarationCreate.ts"
export const organizerTerminationSubmitMutation = mutation({
  args: valibotToConvex(organizerTerminationRequestSchema.pipe[0].entries),
  handler: async (ctx, args) => {
    const parsed = v.safeParse(organizerTerminationRequestSchema, args)
    if (!parsed.success) return createResultError("organizerTerminationSubmit", v.summarize(parsed.issues))
    const input = parsed.output
    const existing = await ctx.db
      .query("organizerTerminationRequests")
      .withIndex("requestKey", (q) => q.eq("requestKey", input.requestKey))
      .unique()
    if (existing) {
      const same =
        Object.keys(input).every((key) => Reflect.get(existing, key) === Reflect.get(input, key)) &&
        existing.requestedDate === input.requestedDate &&
        existing.extraordinaryReason === input.extraordinaryReason
      if (!same)
        return createResultError(
          "organizerTerminationSubmit",
          "Anfrageschlüssel bereits verwendet. Bitte ursprüngliche Erklärung erneut senden.",
        )
      return createResult({ requestKey: existing.requestKey, receiptToken: input.receiptToken })
    }
    const requestId = await ctx.db.insert("organizerTerminationRequests", {
      ...input,
      receivedAt: new Date().toISOString(),
      declaration: organizerTerminationDeclarationCreate(input),
    })
    await ctx.db.insert("organizerTerminationDeliveries", {
      requestId,
      userSent: false,
      operatorSent: false,
      status: "pending",
      attempts: 0,
      updatedAt: Date.now(),
    })
    await ctx.scheduler.runAfter(0, internal.organizerTerminationEmail.organizerTerminationEmailInternalAction, {
      requestId,
    })
    console.info("organizerTermination received", { requestId })
    return createResult({ requestKey: input.requestKey, receiptToken: input.receiptToken })
  },
})
