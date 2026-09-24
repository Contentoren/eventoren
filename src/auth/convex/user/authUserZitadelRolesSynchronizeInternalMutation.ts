import { v } from "convex/values"
import { internalMutation, type MutationCtx } from "#convex/_generated/server.js"
import type { PromiseResult } from "#result"
import { synchronizeUserZitadelRolesFn } from "#src/auth/convex/crud/synchronizeUserZitadelRolesFn.ts"
import type { DocUser, IdUser } from "#src/auth/convex/IdUser.ts"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"
import { zitadelRoleValidator } from "#src/auth/model_field/zitadelRoleValidator.ts"

export const authUserZitadelRolesSynchronizeInternalMutation = internalMutation({
  args: {
    userId: vIdUser,
    zitadelUserId: v.string(),
    roles: v.array(zitadelRoleValidator),
    organizerInvitedAt: v.optional(v.string()),
  },
  handler: async (ctx, args): PromiseResult<DocUser> =>
    authUserZitadelRolesSynchronizeFn(ctx, args.userId, args.zitadelUserId, args.roles, args.organizerInvitedAt),
})

async function authUserZitadelRolesSynchronizeFn(
  ctx: MutationCtx,
  userId: IdUser,
  zitadelUserId: string,
  roles: readonly (typeof zitadelRoleValidator.type)[],
  organizerInvitedAt?: string,
): PromiseResult<DocUser> {
  return synchronizeUserZitadelRolesFn(ctx, userId, zitadelUserId, roles, organizerInvitedAt)
}
