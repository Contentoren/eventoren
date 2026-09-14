import { v } from "convex/values"
import { type QueryCtx, query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { docOrgMemberToModel } from "#src/org/member_convex/docOrgMemberToModel.ts"
import type { OrgMemberModel } from "#src/org/member_model/OrgMemberModel.ts"
import { authQueryResult } from "#src/utils/convex_backend/authQueryResult.ts"
import { createTokenValidator } from "#src/utils/convex_backend/createTokenValidator.ts"

export type OrgMembersListValidatorType = typeof orgMembersListValidator.type

export const orgMembersListFields = {
  orgHandle: v.string(),
} as const

export const orgMembersListValidator = v.object(orgMembersListFields)

export const orgMembersListQuery = query({
  args: createTokenValidator(orgMembersListFields),
  handler: async (ctx, args) => await authQueryResult(ctx, args, orgMemberListFn),
})

export async function orgMemberListFn(
  ctx: QueryCtx,
  args: OrgMembersListValidatorType,
): PromiseResult<OrgMemberModel[]> {
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
    .collect()

  return createResult(members.map(docOrgMemberToModel))
}
