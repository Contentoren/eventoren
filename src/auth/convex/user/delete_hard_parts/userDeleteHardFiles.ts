import type { MutationCtx } from "#convex/_generated/server.js"
import type { IdUser } from "#src/auth/convex/IdUser.ts"

export async function userDeleteHardFiles(ctx: MutationCtx, userId: IdUser, cursor: string | null = null) {
  const files = await ctx.db
    .query("files")
    // No userId index exists on this legacy table. Bound the scan to one cursor page.
    .paginate({ cursor, numItems: 100 })

  await Promise.all(files.page.filter((file) => file.userId === userId).map((file) => ctx.db.delete("files", file._id)))
  return { isDone: files.isDone, continueCursor: files.continueCursor }
}
