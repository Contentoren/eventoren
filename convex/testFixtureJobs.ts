import { internalQuery } from "./_generated/server.js"

export const testFixtureJobs = internalQuery({
  args: {},
  handler: async (ctx) => await ctx.db.system.query("_scheduled_functions").collect(),
})
