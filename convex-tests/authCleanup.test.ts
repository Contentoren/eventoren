/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { otpFindFn } from "../src/auth/convex/otp/otpFindFn.ts"
import { otpConsumeFn } from "../src/auth/convex/otp/otpConsumeFn.ts"
import { createTokenResult } from "../src/auth/server/jwt_token/createTokenResult.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const now = "2026-10-02T00:00:00.000Z"

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test("OTP exact lookup preserves creation order and excludes consumed codes, other purposes and emails", async () => {
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "OTP", role: "customer", createdAt: now, updatedAt: now })
    const base = {
      userId,
      name: "",
      email: "otp@example.test",
      code: "123456",
      purpose: "emailChange" as const,
      createdAt: now,
    }
    await ctx.db.insert("authOtps", { ...base, consumedAt: now })
    await ctx.db.insert("authOtps", { ...base, purpose: "passwordChange" })
    await ctx.db.insert("authOtps", { ...base, email: "other@example.test" })
    const oldest = await ctx.db.insert("authOtps", base)
    const newest = await ctx.db.insert("authOtps", base)
    return { oldest, newest }
  })
  const args = { email: "otp@example.test", code: "123456", purpose: "emailChange" as const }
  const first = await t.run((ctx) => otpFindFn(ctx, args))
  expect(first.success && first.data._id).toBe(ids.oldest)
  await t.run((ctx) => otpConsumeFn(ctx, { otpId: ids.oldest }))
  const second = await t.run((ctx) => otpFindFn(ctx, args))
  expect(second.success && second.data._id).toBe(ids.newest)
  await t.run((ctx) => otpConsumeFn(ctx, { otpId: ids.newest }))
  expect((await t.run((ctx) => otpFindFn(ctx, args))).success).toBe(false)
})

test("hard deletion drains every dependency page and retains another tenant's records and access", async () => {
  vi.useFakeTimers()
  vi.stubEnv("AUTH_SECRET", "eventoren-auth-cleanup-test-secret")
  const t = convexTest(schema, modules)
  const users = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Removed",
      role: "organizer",
      zitadelUserId: "removed",
      createdAt: now,
      updatedAt: now,
    })
    const otherId = await ctx.db.insert("users", {
      name: "Retained",
      role: "organizer",
      createdAt: now,
      updatedAt: now,
    })
    const orgId = await ctx.db.insert("orgs", { orgHandle: "removed-org", createdAt: now, updatedAt: now })
    const otherOrgId = await ctx.db.insert("orgs", { orgHandle: "retained-org", createdAt: now, updatedAt: now })
    const tokenResult = await createTokenResult(userId, "removed-org", "member")
    const otherTokenResult = await createTokenResult(otherId, "retained-org", "member")
    if (!tokenResult.success || !otherTokenResult.success) throw new Error("test token failed")
    for (let i = 0; i < 225; i += 1) {
      for (const owner of [userId, otherId]) {
        await ctx.db.insert("authSessions", {
          userId: owner,
          loginMethod: "zitadel",
          token: i === 0 ? (owner === userId ? tokenResult.data : otherTokenResult.data) : `${owner}-${i}`,
          expiresAt: "2099-01-01T00:00:00.000Z",
          createdAt: now,
          updatedAt: now,
        })
        await ctx.db.insert("authOtps", {
          userId: owner,
          name: "",
          email: `${owner}@example.test`,
          code: `${i}`,
          purpose: "emailChange",
          consumedAt: i % 2 ? now : undefined,
          createdAt: now,
        })
        await ctx.db.insert("authEmailLoginCodes", {
          userId: owner,
          email: `${owner}@example.test`,
          code: `${i}`,
          createdAt: now,
        })
        await ctx.db.insert("authAccounts", {
          userId: owner,
          provider: `provider-${i}`,
          providerAccountId: `${owner}-${i}`,
          createdAt: now,
          updatedAt: now,
        })
        await ctx.db.insert("orgMembers", {
          userId: owner,
          orgId: owner === userId ? orgId : otherOrgId,
          orgHandle: owner === userId ? "removed-org" : "retained-org",
          role: "member",
          invitedBy: owner,
          createdAt: now,
          updatedAt: now,
        })
        await ctx.db.insert("orgInvitations", {
          orgHandle: owner === userId ? "removed-org" : "retained-org",
          invitationCode: `${owner}-${i}`,
          invitedName: "Guest",
          invitedEmail: "guest@example.test",
          l: "de",
          role: "guest",
          invitedBy: owner,
          emailSendAmount: 0,
          createdAt: now,
          updatedAt: now,
        })
        await ctx.db.insert("files", {
          userId: owner,
          fileId: `${owner}-${i}`,
          displayName: "file",
          fileSize: 1,
          contentType: "text/plain",
          url: "https://example.test/file",
          createdAt: now,
          updatedAt: now,
        })
      }
    }
    return { userId, otherId, token: tokenResult.data, otherToken: otherTokenResult.data }
  })
  expect((await t.query(api.auth.authCurrentUserGetQuery, { token: users.token })).success).toBe(true)
  expect((await t.mutation(internal.auth.userDeleteHardInternalMutation, { userId: users.userId })).success).toBe(true)
  expect((await t.query(api.auth.authCurrentUserGetQuery, { token: users.token })).success).toBe(false)
  const other = await t.query(api.auth.authCurrentUserGetQuery, { token: users.otherToken })
  expect(other).toMatchObject({ success: true, data: { orgHandle: "retained-org", orgRole: "member" } })
  expect(
    (
      await t.mutation(internal.auth.otpSaveInternalMutation, {
        userId: users.userId,
        email: "new@example.test",
        purpose: "emailChange",
      })
    ).success,
  ).toBe(false)
  expect(
    await t.mutation(internal.auth.authSessionInsertInternalMutation, {
      userId: users.userId,
      loginMethod: "email",
      token: "late-session",
    }),
  ).toMatchObject({ success: false })
  expect(
    (
      await t.mutation(internal.auth.userEmailChange2ConfirmInternalMutation, {
        userId: users.userId,
        newEmail: `${users.userId}@example.test`,
        confirmationCode: "224",
      })
    ).success,
  ).toBe(false)
  // Repeated requests do not start a competing cascade; completion is idempotent.
  await t.mutation(internal.auth.userDeleteHardInternalMutation, { userId: users.userId })
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  await t.mutation(internal.auth.userDeleteHardInternalMutation, { userId: users.userId })
  await t.run(async (ctx) => {
    expect(await ctx.db.get("users", users.userId)).toBeNull()
    expect(await ctx.db.get("users", users.otherId)).not.toBeNull()
    for (const table of [
      "authSessions",
      "authOtps",
      "authEmailLoginCodes",
      "authAccounts",
      "orgMembers",
      "files",
    ] as const) {
      const records = await ctx.db.query(table).collect()
      expect(records).toHaveLength(225)
      expect(records.every((record) => record.userId === users.otherId)).toBe(true)
    }
    const invitations = await ctx.db.query("orgInvitations").collect()
    expect(invitations).toHaveLength(450)
    expect(invitations.filter((invitation) => invitation.invitedBy === "")).toHaveLength(225)
    expect(invitations.filter((invitation) => invitation.invitedBy === users.otherId)).toHaveLength(225)
    expect(await ctx.db.query("authDeletionIdentities").collect()).toHaveLength(0)
  })
})

test("soft deletion drains all session pages without deleting the user or non-session dependencies", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, modules)
  const userId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", { name: "Soft", role: "customer", createdAt: now, updatedAt: now })
    for (let i = 0; i < 225; i += 1)
      await ctx.db.insert("authSessions", {
        userId: id,
        loginMethod: "email",
        token: `${i}`,
        expiresAt: now,
        createdAt: now,
        updatedAt: now,
      })
    await ctx.db.insert("authOtps", {
      userId: id,
      name: "",
      email: "soft@example.test",
      code: "123456",
      purpose: "emailChange",
      createdAt: now,
    })
    return id
  })
  await t.mutation(internal.auth.userDeleteSoftInternalMutation, { userId })
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  await t.run(async (ctx) => {
    expect(await ctx.db.get("users", userId)).toMatchObject({ deletedAt: expect.any(String) })
    expect(await ctx.db.query("authSessions").collect()).toHaveLength(0)
    expect(await ctx.db.query("authOtps").collect()).toHaveLength(1)
  })
})

test("hard-deletion final fence revisits a dependency added after its earlier phase", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, modules)
  const userId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", {
      name: "Final fence",
      role: "customer",
      deletedAt: now,
      hardDeletionStartedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    const orgId = await ctx.db.insert("orgs", { orgHandle: "late-org", createdAt: now, updatedAt: now })
    await ctx.db.insert("orgMembers", {
      userId: id,
      orgId,
      orgHandle: "late-org",
      role: "member",
      invitedBy: id,
      createdAt: now,
      updatedAt: now,
    })
    return id
  })
  await t.mutation(internal.auth.userDeletionContinueInternalMutation, {
    userId,
    hard: true,
    phase: "accounts",
    cursor: null,
  })
  expect(await t.run((ctx) => ctx.db.get("users", userId))).not.toBeNull()
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  expect(await t.run((ctx) => ctx.db.get("users", userId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.query("orgMembers").collect())).toHaveLength(0)
})

test("paged account removal reserves an email-less legacy identity until cleanup finishes", async () => {
  vi.useFakeTimers()
  vi.stubEnv("AUTH_SECRET", "eventoren-auth-cleanup-test-secret")
  const t = convexTest(schema, modules)
  const userId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", {
      name: "Legacy",
      role: "customer",
      deletedAt: now,
      hardDeletionStartedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    for (let i = 0; i < 125; i += 1)
      await ctx.db.insert("authAccounts", {
        userId: id,
        provider: "github",
        providerAccountId: `legacy-${i}`,
        createdAt: now,
        updatedAt: now,
      })
    return id
  })
  await t.mutation(internal.auth.userDeletionContinueInternalMutation, {
    userId,
    hard: true,
    phase: "accounts",
    cursor: null,
  })
  const provider = { provider: "github" as const, providerId: "legacy-0", username: "legacy" }
  expect((await t.mutation(internal.auth.signInUsingSocialAuth3InternalMutation, provider)).success).toBe(false)
  expect((await t.mutation(internal.auth.createUserFromAuthProviderInternalMutation, provider)).success).toBe(false)
  expect(await t.run((ctx) => ctx.db.query("users").collect())).toHaveLength(1)
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  expect(await t.run((ctx) => ctx.db.query("authDeletionIdentities").collect())).toHaveLength(0)
  expect((await t.mutation(internal.auth.signInUsingSocialAuth3InternalMutation, provider)).success).toBe(true)
})

test("Zitadel synchronization continues beyond empty candidate pages and applies later revocations", async () => {
  vi.useFakeTimers()
  vi.stubEnv("ZITADEL_ISSUER", "https://auth.example.test")
  vi.stubEnv("ZITADEL_MANAGEMENT_BASE_URL", "https://auth.example.test")
  vi.stubEnv("ZITADEL_MANAGEMENT_TOKEN", "test-management-token")
  vi.stubEnv("ZITADEL_ORGANIZATION_ID", "organization-id")
  vi.stubEnv("ZITADEL_PROJECT_ID", "project-id")
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ result: [] })),
  )
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    for (let i = 0; i < 100; i += 1)
      await ctx.db.insert("users", {
        name: "Deleted",
        role: "organizer",
        roleSource: "zitadel",
        zitadelUserId: `deleted-${i}`,
        deletedAt: now,
        createdAt: now,
        updatedAt: now,
      })
    const active = []
    for (let i = 0; i < 125; i += 1)
      active.push(
        await ctx.db.insert("users", {
          name: "Revoked",
          role: "organizer",
          roleSource: "zitadel",
          zitadelUserId: `active-${i}`,
          createdAt: now,
          updatedAt: now,
        }),
      )
    const legacy = await ctx.db.insert("users", {
      name: "Legacy",
      role: "admin",
      zitadelUserId: "legacy",
      createdAt: now,
      updatedAt: now,
    })
    const noIdentity = await ctx.db.insert("users", {
      name: "No identity",
      role: "organizer",
      roleSource: "zitadel",
      createdAt: now,
      updatedAt: now,
    })
    return { active, legacy, noIdentity }
  })
  const page = await t.query(internal.auth.authZitadelSyncCandidatesInternalQuery, {
    paginationOpts: { numItems: 100, cursor: null },
  })
  expect(page.page).toHaveLength(0)
  expect(page.isDone).toBe(false)
  expect(await t.action(internal.auth.authZitadelRolesSynchronizeScheduledAction, {})).toMatchObject({
    success: true,
    data: { synchronized: 0 },
  })
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  await t.run(async (ctx) => {
    for (const id of ids.active)
      expect(await ctx.db.get("users", id)).toMatchObject({ role: "customer", zitadelRoles: [] })
    expect(await ctx.db.get("users", ids.legacy)).toMatchObject({ role: "admin" })
    expect(await ctx.db.get("users", ids.noIdentity)).toMatchObject({ role: "organizer" })
    const deleted = await ctx.db
      .query("users")
      .withIndex("zitadelUserId", (q) => q.eq("zitadelUserId", "deleted-0"))
      .first()
    expect(deleted?.role).toBe("organizer")
  })
})
