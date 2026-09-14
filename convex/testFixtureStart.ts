import { internalMutation } from "./_generated/server.js"
import { v } from "convex/values"
import { internal } from "./_generated/api.js"

export const testFixtureStart = internalMutation({
  args: { value: v.string() },
  handler: async (ctx, args): Promise<unknown> => {
    return await ctx.scheduler.runAfter(0, internal.testFixtureStep.testFixtureStep, {
      value: `${args.value}:step`,
    })
  },
})
