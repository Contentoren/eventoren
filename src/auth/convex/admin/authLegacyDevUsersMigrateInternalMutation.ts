import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { userRole } from "#src/auth/model_field/userRole.ts"

const migrationPageSize = 100

export const authLegacyDevUsersMigrateInternalMutation = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db.query("users").order("asc").paginate({
      cursor,
      numItems: migrationPageSize,
    })
    let migrated = 0
    for (const user of page.page) {
      // Historical records can still contain this value even though the active schema cannot create it.
      const storedRole: string = user.role
      if (storedRole !== "dev") continue
      await ctx.db.patch("users", user._id, { role: userRole.admin, updatedAt: new Date().toISOString() })
      migrated += 1
    }
    console.log("Legacy dev role migration batch completed", {
      scanned: page.page.length,
      migrated,
      isDone: page.isDone,
    })
    return { cursor: page.continueCursor, isDone: page.isDone, migrated, scanned: page.page.length }
  },
})
