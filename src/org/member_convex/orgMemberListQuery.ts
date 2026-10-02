import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { type QueryCtx, query } from "#convex/_generated/server.js"
import { createResult, createResultError } from "#result"
import { docOrgMemberToModel } from "#src/org/member_convex/docOrgMemberToModel.ts"
import type { OrgMembersListPageResult } from "#src/org/member_convex/OrgMembersListPageResult.ts"
import { authQueryResult } from "#src/utils/convex_backend/authQueryResult.ts"
import { createTokenValidator } from "#src/utils/convex_backend/createTokenValidator.ts"

export type OrgMembersListValidatorType = typeof orgMembersListValidator.type

export const orgMembersListFields = {
  orgHandle: v.string(),
  paginationOpts: paginationOptsValidator,
} as const

export const orgMembersListValidator = v.object(orgMembersListFields)

export const orgMembersListQuery = query({
  args: createTokenValidator(orgMembersListFields),
  handler: async (ctx, args): Promise<OrgMembersListPageResult> => {
    // Keep the existing token-only authorization policy. Returning the page
    // outside authQueryResult preserves the top-level cursor metadata in API types.
    const authorized = await authQueryResult(ctx, args, async () => createResult(null))
    if (!authorized.success) return authorized
    return orgMemberListFn(ctx, args)
  },
})

export async function orgMemberListFn(
  ctx: QueryCtx,
  args: OrgMembersListValidatorType,
): Promise<OrgMembersListPageResult> {
  const op = "orgMemberListFn"

  const org = await ctx.db
    .query("orgs")
    .withIndex("orgHandle", (q) => q.eq("orgHandle", args.orgHandle))
    .unique()
  if (!org) {
    return createResultError(op, "Organization not found", args.orgHandle)
  }

  const members = await ctx.db
    .query("orgMembers")
    .withIndex("orgId", (q) => q.eq("orgId", org._id))
    .paginate(args.paginationOpts)

  return {
    ...createResult(members.page.map(docOrgMemberToModel)),
    isDone: members.isDone,
    nextCursor: members.isDone ? null : members.continueCursor,
  }
}
