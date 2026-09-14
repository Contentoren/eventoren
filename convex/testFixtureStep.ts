import { internalAction } from "./_generated/server.js"
import { v } from "convex/values"
import { internal } from "./_generated/api.js"

export const testFixtureStep = internalAction({
  args: { value: v.string() },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.testFixtureComplete.testFixtureComplete, {
      value: `${args.value}:complete`,
    })
  },
})
