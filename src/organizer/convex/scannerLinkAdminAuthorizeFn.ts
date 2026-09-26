import type { MutationCtx, QueryCtx } from "#convex/_generated/server.js"
import { createResultError } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { catalogAdminAuthorizeFn } from "#src/catalog/convex/catalogAdminAuthorizeFn.ts"

export async function scannerLinkAdminAuthorizeFn(ctx: MutationCtx | QueryCtx, userId: IdUser) {
  const authorized = await catalogAdminAuthorizeFn(ctx, userId)
  if (!authorized.success) return authorized
  if (authorized.data.deletedAt) return createResultError("scannerLinkAdminAuthorizeFn", "Admin account unavailable")
  return authorized
}
