import { internalMutation } from "./_generated/server.js"
import { v } from "convex/values"

export const testFixtureComplete = internalMutation({
  args: { value: v.string() },
  handler: async (_ctx, _args) => undefined,
})
