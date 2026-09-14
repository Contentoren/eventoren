import { v } from "convex/values"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"
import { verifyTokenGetUserId } from "#src/auth/server/jwt_token/verifyTokenGetUserId.ts"
import type { IdOrgMember } from "#src/org/member_convex/IdOrgMember.ts"
import { orgRoleValidator } from "#src/org/org_model_field/orgRoleValidator.ts"
import { nowIso } from "#utils/date/nowIso.js"

export type OrgMemberCreateValidatorType = typeof orgMemberCreateValidator.type

export const orgMemberCreateFields = {
  token: v.string(),
  // id
  orgHandle: v.string(),
  userId: vIdUser,
  // data
  role: orgRoleValidator,
  // meta
  // invitedBy: vIdUser,
} as const

export const orgMemberCreateValidator = v.object(orgMemberCreateFields)

export const orgMemberCreateMutation = mutation({
  args: orgMemberCreateValidator,
  handler: orgMemberCreateFn,
})

export async function orgMemberCreateFn(
  ctx: MutationCtx,
  args: OrgMemberCreateValidatorType,
): PromiseResult<IdOrgMember> {
  const op = "orgMemberCreateFn"

  const verifiedResult = await verifyTokenGetUserId(args.token)
  if (!verifiedResult.success) {
    console.info(verifiedResult)
    return verifiedResult
  }
  const invitedBy = verifiedResult.data

  const user = await ctx.db.get("users", args.userId)
  if (!user) {
    const errorMessage = "user not found"
    console.info(op, errorMessage, args.userId)
    return createResultError(op, errorMessage, args.userId)
  }

  const org = await ctx.db
    .query("orgs")
    .withIndex("orgHandle", (q) => q.eq("orgHandle", args.orgHandle))
    .unique()
  if (!org) {
    return createResultError(op, "Organization not found", args.orgHandle)
  }

  const now = nowIso()
  const orgMemberId = await ctx.db.insert("orgMembers", {
    orgId: org._id,
    orgHandle: org.orgHandle,
    userId: args.userId,
    role: args.role,
    invitedBy: invitedBy,
    createdAt: now,
    updatedAt: now,
  })
  return createResult(orgMemberId)
}
