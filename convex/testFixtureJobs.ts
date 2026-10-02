import { internalQuery } from "./_generated/server.js"
import { paginationOptsValidator } from "convex/server"

export const testFixtureJobs = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => await ctx.db.system.query("_scheduled_functions").paginate(args.paginationOpts),
})
