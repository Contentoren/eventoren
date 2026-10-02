/// <reference types="vite/client" />

import { makeFunctionReference, type ApiFromModules, type FunctionReturnType } from "convex/server"
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { internal } from "../convex/_generated/api.js"
import type { MutationCtx } from "../convex/_generated/server.js"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { createTokenResult } from "../src/auth/server/jwt_token/createTokenResult.ts"
import { verifyTokenResult } from "../src/auth/server/jwt_token/verifyTokenResult.ts"
import { orgLeaveMutation } from "../src/org/member_convex/orgLeaveMutation.ts"
import { orgMembersListQuery } from "../src/org/member_convex/orgMemberListQuery.ts"

// These source functions are not deployed exports of convex/org.ts. Register
// their real validators/handlers only in the test module, without exposing APIs.
// ApiFromModules exercises the registered handler's inferred args
// and return type (including top-level page metadata), not a hand-written API.
type MembershipTestApi = ApiFromModules<{
  orgMembershipTest: { orgMembersListQuery: typeof orgMembersListQuery; orgLeaveMutation: typeof orgLeaveMutation }
}>
const listQuery: MembershipTestApi["orgMembershipTest"]["orgMembersListQuery"] = makeFunctionReference(
  "orgMembershipTest:orgMembersListQuery",
)
const leaveMutation: MembershipTestApi["orgMembershipTest"]["orgLeaveMutation"] = makeFunctionReference(
  "orgMembershipTest:orgLeaveMutation",
)
const modules = {
  ...import.meta.glob("../convex/**/*.ts"),
  "../convex/orgMembershipTest.ts": async () => ({ orgMembersListQuery, orgLeaveMutation }),
}
const now = "2026-10-02T00:00:00.000Z"

afterEach(() => vi.unstubAllEnvs())

function membershipInsert(
  ctx: MutationCtx,
  userId: Id<"users">,
  org: { _id: Id<"orgs">; orgHandle: string },
  role: "guest" | "member" = "member",
) {
  return ctx.db.insert("orgMembers", {
    userId,
    orgId: org._id,
    orgHandle: org.orgHandle,
    role,
    invitedBy: userId,
    createdAt: now,
    updatedAt: now,
  })
}

async function membershipTestCreate() {
  vi.stubEnv("AUTH_SECRET", "eventoren-org-membership-test-secret")
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Member",
      role: "customer",
      createdAt: now,
      updatedAt: now,
    })
    const otherId = await ctx.db.insert("users", {
      name: "Other",
      role: "customer",
      createdAt: now,
      updatedAt: now,
    })
    const orgs = []
    for (const orgHandle of ["tenant-a", "tenant-b"]) {
      const _id = await ctx.db.insert("orgs", { orgHandle, createdAt: now, updatedAt: now })
      orgs.push({ _id, orgHandle })
    }
    orgs.sort((a, b) => (a._id < b._id ? -1 : 1))
    return { userId, otherId, lowOrg: orgs[0]!, highOrg: orgs[1]! }
  })
  const token = await createTokenResult(ids.userId, ids.highOrg.orgHandle, "guest")
  const otherToken = await createTokenResult(ids.otherId)
  if (!token.success || !otherToken.success) throw new Error("test token failed")
  return { t, ...ids, token: token.data, otherToken: otherToken.data }
}

test("member list traverses every chronological page, keeping data an array and excluding other tenants", async () => {
  const { t, userId, otherId, lowOrg, highOrg, token } = await membershipTestCreate()
  const expected = await t.run(async (ctx) => {
    const members = []
    for (let i = 0; i < 11; i += 1) {
      await membershipInsert(ctx, userId, lowOrg)
      members.push(await membershipInsert(ctx, i % 2 ? otherId : userId, highOrg, i % 2 ? "guest" : "member"))
    }
    return members
  })
  const all = []
  let cursor: string | null = null
  // A client/test traversal, not an unbounded server-side pagination loop.
  for (let pageNumber = 0; pageNumber < 4; pageNumber += 1) {
    const result: FunctionReturnType<typeof listQuery> = await t.query(listQuery, {
      token,
      orgHandle: highOrg.orgHandle,
      paginationOpts: { numItems: 3, cursor },
    })
    expect(result.success).toBe(true)
    if (!result.success) throw new Error(result.errorMessage)
    expect(Array.isArray(result.data)).toBe(true)
    expect(result.data.map((member) => member.memberId)).toEqual(expected.slice(pageNumber * 3, pageNumber * 3 + 3))
    expect(result.data.every((member) => member.orgHandle === highOrg.orgHandle)).toBe(true)
    expect(result.data[0]).not.toHaveProperty("orgId")
    expect(result.data[0]).not.toHaveProperty("_creationTime")
    all.push(...result.data.map((member) => member.memberId))
    expect(result.isDone).toBe(pageNumber === 3)
    expect(result.nextCursor === null).toBe(pageNumber === 3)
    cursor = result.nextCursor
  }
  expect(all).toEqual(expected)
  expect(new Set(all).size).toBe(11)
})

test("member list retains token-only authorization and handles empty and missing organizations", async () => {
  const { t, userId, lowOrg, highOrg, token, otherToken } = await membershipTestCreate()
  const memberId = await t.run((ctx) => membershipInsert(ctx, userId, highOrg))
  const args = { orgHandle: highOrg.orgHandle, paginationOpts: { numItems: 2, cursor: null } }
  for (const invalidToken of ["", "not-a-token"])
    expect(await t.query(listQuery, { ...args, token: invalidToken })).toMatchObject({ success: false })
  // The existing query authenticates a token, but does not require membership.
  // Pagination must not silently introduce a different authorization policy.
  const other = await t.query(listQuery, { ...args, token: otherToken })
  expect(other).toMatchObject({ success: true, data: [{ memberId }], isDone: true, nextCursor: null })
  expect(await t.query(listQuery, { ...args, token, orgHandle: lowOrg.orgHandle })).toEqual({
    success: true,
    data: [],
    isDone: true,
    nextCursor: null,
  })
  expect(await t.query(listQuery, { ...args, token, orgHandle: "missing" })).toMatchObject({
    success: false,
    errorMessage: "Organization not found",
  })
})

test("default membership uses oldest creation across organizations, not compound-index orgId order", async () => {
  const { t, userId, otherId, lowOrg, highOrg } = await membershipTestCreate()
  await t.run(async (ctx) => {
    await membershipInsert(ctx, otherId, lowOrg)
    await membershipInsert(ctx, userId, highOrg, "guest")
    await membershipInsert(ctx, userId, lowOrg, "member")
  })
  // Prove this fixture actually distinguishes the prefix and compound order.
  const compound = await t.run((ctx) =>
    ctx.db
      .query("orgMembers")
      .withIndex("userIdOrgId", (q) => q.eq("userId", userId))
      .first(),
  )
  expect(compound?.orgId).toBe(lowOrg._id)
  expect(await t.query(internal.org.getOrgMemberHandleAndRoleInternalQuery, { userId })).toEqual({
    orgHandle: highOrg.orgHandle,
    orgRole: "guest",
  })
})

test("leave deletes only the oldest exact user/org membership and retains duplicates and other-user distractors", async () => {
  const { t, userId, otherId, lowOrg, highOrg, token } = await membershipTestCreate()
  const ids = await t.run(async (ctx) => {
    const otherUser = await membershipInsert(ctx, otherId, highOrg)
    const otherOrg = await membershipInsert(ctx, userId, lowOrg)
    const oldest = await membershipInsert(ctx, userId, highOrg, "guest")
    const newest = await membershipInsert(ctx, userId, highOrg, "member")
    return { otherUser, otherOrg, oldest, newest }
  })
  const left = await t.mutation(leaveMutation, { token, orgHandle: highOrg.orgHandle })
  expect(left.success).toBe(true)
  if (!left.success) throw new Error(left.errorMessage)
  expect(left.data.profile.userId).toBe(userId)
  expect(left.data.profile).not.toHaveProperty("orgHandle")
  expect(left.data.profile).not.toHaveProperty("orgRole")
  const decoded = await verifyTokenResult(left.data.token)
  expect(decoded.success).toBe(true)
  if (!decoded.success) throw new Error(decoded.errorMessage)
  expect(decoded.data.sub).toBe(userId)
  expect(decoded.data).not.toHaveProperty("orgHandle")
  await t.run(async (ctx) => {
    expect(await ctx.db.get("orgMembers", ids.oldest)).toBeNull()
    for (const id of [ids.newest, ids.otherUser, ids.otherOrg])
      expect(await ctx.db.get("orgMembers", id)).not.toBeNull()
    expect(await ctx.db.get("orgs", highOrg._id)).not.toBeNull()
    expect(
      await ctx.db
        .query("authSessions")
        .withIndex("token", (q) => q.eq("token", left.data.token))
        .first(),
    ).toMatchObject({ userId })
  })
  expect(await t.query(internal.org.getOrgMemberHandleAndRoleInternalQuery, { userId })).toEqual({
    orgHandle: lowOrg.orgHandle,
    orgRole: "member",
  })
})

test("leave rejects missing/invalid authentication and non-members, then removes an actually empty organization", async () => {
  const { t, userId, lowOrg, highOrg, token, otherToken } = await membershipTestCreate()
  const memberId = await t.run((ctx) => membershipInsert(ctx, userId, highOrg))
  for (const invalidToken of ["", "not-a-token"])
    expect(await t.mutation(leaveMutation, { token: invalidToken, orgHandle: highOrg.orgHandle })).toMatchObject({
      success: false,
    })
  expect(await t.mutation(leaveMutation, { token: otherToken, orgHandle: highOrg.orgHandle })).toMatchObject({
    success: false,
    errorMessage: "Member not found",
  })
  expect(await t.mutation(leaveMutation, { token, orgHandle: lowOrg.orgHandle })).toMatchObject({
    success: false,
    errorMessage: "Member not found",
  })
  expect(await t.mutation(leaveMutation, { token, orgHandle: "missing" })).toMatchObject({
    success: false,
    errorMessage: "Organization not found",
  })
  expect(await t.run((ctx) => ctx.db.get("orgMembers", memberId))).not.toBeNull()
  expect((await t.mutation(leaveMutation, { token, orgHandle: highOrg.orgHandle })).success).toBe(true)
  expect(await t.run((ctx) => ctx.db.get("orgs", highOrg._id))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("orgs", lowOrg._id))).not.toBeNull()
  expect(await t.query(internal.org.getOrgMemberHandleAndRoleInternalQuery, { userId })).toEqual({})
})
