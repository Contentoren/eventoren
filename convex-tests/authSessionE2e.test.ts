/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const secret = "auth-session-e2e-test-secret"
process.env.AUTH_SECRET = secret

const runId = "mtest-12345678-1234-1234-1234-123456789abc"
const foreignRunId = "mtest-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

type Fixture = ReturnType<typeof convexTest>

async function userTokenFor(t: Fixture, role: "admin" | "user" = "user") {
  const now = new Date().toISOString()
  const userId = await t.run((ctx) => ctx.db.insert("users", { name: role, role, createdAt: now, updatedAt: now }))
  const token = await testAuthSessionTokenCreate(t, userId, secret)
  return { token, userId }
}

test("self mark is immutable and idempotent for the same run", async () => {
  const t = convexTest(schema, modules)
  const { token } = await userTokenFor(t)
  const marked = await t.mutation(api.auth.authSessionE2eMarkMutation, { token, runId })
  expect(marked).toMatchObject({ success: true, data: { runId } })
  if (!marked.success) return
  expect(marked.data).not.toHaveProperty("token")
  const repeated = await t.mutation(api.auth.authSessionE2eMarkMutation, { token, runId })
  expect(repeated).toMatchObject({ success: true, data: { sessionId: marked.data.sessionId, runId } })
})

test("self mark rejects foreign run after marking and invalid patterns", async () => {
  const t = convexTest(schema, modules)
  const { token } = await userTokenFor(t)
  expect((await t.mutation(api.auth.authSessionE2eMarkMutation, { token, runId })).success).toBe(true)
  expect((await t.mutation(api.auth.authSessionE2eMarkMutation, { token, runId: foreignRunId })).success).toBe(false)
  expect((await t.mutation(api.auth.authSessionE2eMarkMutation, { token: "invalid", runId })).success).toBe(false)
  expect((await t.mutation(api.auth.authSessionE2eMarkMutation, { token, runId: "not-a-run" })).success).toBe(false)
})

test("historical marked sessions hard-vanish while unmarked shared sessions remain", async () => {
  const t = convexTest(schema, modules)
  const admin = await userTokenFor(t, "admin")
  const markedUser = await userTokenFor(t)
  const unmarkedUser = await userTokenFor(t)
  const marked = await t.mutation(api.auth.authSessionE2eMarkMutation, { token: markedUser.token, runId })
  expect(marked.success).toBe(true)
  if (!marked.success) return
  const markedSessionId = marked.data.sessionId as never
  const unmarkedSessionId = await t.run(async (ctx) => {
    const row = await ctx.db
      .query("authSessions")
      .withIndex("token", (q) => q.eq("token", unmarkedUser.token))
      .unique()
    return row?._id as never
  })
  const discovery = await t.query(api.auth.authSessionE2eDiscoveryQuery, { token: admin.token })
  expect(discovery).toMatchObject({ success: true })
  if (!discovery.success) return
  expect(discovery.data.sessions.map((entry) => entry.sessionId)).toContain(markedSessionId)
  expect(discovery.data.sessions.map((entry) => entry.sessionId)).not.toContain(unmarkedSessionId)
  expect(JSON.stringify(discovery)).not.toContain(markedUser.token)
  const cleaned = await t.mutation(api.auth.authSessionE2eCleanupMutation, {
    token: admin.token,
    sessionIds: [markedSessionId],
  })
  expect(cleaned).toMatchObject({ success: true, data: { deletedCount: 1, callerDeleted: false } })
  expect(await t.run((ctx) => ctx.db.get("authSessions", markedSessionId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("authSessions", unmarkedSessionId))).not.toBeNull()
  expect(
    (await t.mutation(api.auth.authSessionE2eCleanupMutation, { token: admin.token, sessionIds: [unmarkedSessionId] }))
      .success,
  ).toBe(false)
})

test("caller session is excluded until the final self phase with zero marked others", async () => {
  const t = convexTest(schema, modules)
  const admin = await userTokenFor(t, "admin")
  const other = await userTokenFor(t)
  const adminMarked = await t.mutation(api.auth.authSessionE2eMarkMutation, { token: admin.token, runId })
  const otherMarked = await t.mutation(api.auth.authSessionE2eMarkMutation, { token: other.token, runId: foreignRunId })
  expect(adminMarked.success).toBe(true)
  expect(otherMarked.success).toBe(true)
  if (!adminMarked.success || !otherMarked.success) return
  const adminSessionId = adminMarked.data.sessionId as never
  const otherSessionId = otherMarked.data.sessionId as never
  expect(
    (
      await t.mutation(api.auth.authSessionE2eCleanupMutation, {
        token: admin.token,
        sessionIds: [adminSessionId, otherSessionId],
      })
    ).success,
  ).toBe(false)
  expect(
    (
      await t.mutation(api.auth.authSessionE2eCleanupMutation, {
        token: admin.token,
        sessionIds: [adminSessionId, otherSessionId],
        includeCallerSession: true,
      })
    ).success,
  ).toBe(false)
  expect(
    await t.mutation(api.auth.authSessionE2eCleanupMutation, { token: admin.token, sessionIds: [otherSessionId] }),
  ).toMatchObject({ success: true, data: { deletedCount: 1, callerDeleted: false } })
  const final = await t.mutation(api.auth.authSessionE2eCleanupMutation, {
    token: admin.token,
    sessionIds: [adminSessionId],
    includeCallerSession: true,
  })
  expect(final).toMatchObject({ success: true, data: { deletedCount: 1, callerDeleted: true } })
})

test("discovery is marked-only without tokens and requires admin", async () => {
  const t = convexTest(schema, modules)
  const admin = await userTokenFor(t, "admin")
  const user = await userTokenFor(t)
  const marked = await t.mutation(api.auth.authSessionE2eMarkMutation, { token: user.token, runId })
  expect(marked.success).toBe(true)
  const discovery = await t.query(api.auth.authSessionE2eDiscoveryQuery, { token: admin.token })
  expect(discovery).toMatchObject({ success: true })
  if (!discovery.success) return
  expect(discovery.data.sessions.length).toBe(1)
  expect(discovery.data.sessions[0]).toMatchObject({ runId })
  expect(discovery.data.sessions[0]).not.toHaveProperty("token")
  expect((await t.query(api.auth.authSessionE2eDiscoveryQuery, { token: user.token })).success).toBe(false)
})

test("genuine unmarked volume does not truncate marked discovery or block final self cleanup", async () => {
  const t = convexTest(schema, modules)
  const admin = await userTokenFor(t, "admin")
  const other = await userTokenFor(t)
  const adminMarked = await t.mutation(api.auth.authSessionE2eMarkMutation, { token: admin.token, runId })
  const otherMarked = await t.mutation(api.auth.authSessionE2eMarkMutation, { token: other.token, runId: foreignRunId })
  expect(adminMarked.success).toBe(true)
  expect(otherMarked.success).toBe(true)
  if (!adminMarked.success || !otherMarked.success) return
  const adminSessionId = adminMarked.data.sessionId as never
  const otherSessionId = otherMarked.data.sessionId as never
  await t.run(async (ctx) => {
    const now = new Date().toISOString()
    for (let index = 0; index < 1200; index++) {
      await ctx.db.insert("authSessions", {
        userId: admin.userId,
        loginMethod: "dev",
        token: `genuine-unmarked-${index}`,
        expiresAt: "2099-01-01T00:00:00.000Z",
        createdAt: now,
        updatedAt: now,
      })
    }
  })
  const drained: { sessionId: string }[] = []
  let cursor: string | undefined
  let pages = 0
  for (;;) {
    pages += 1
    const page = await t.query(api.auth.authSessionE2eDiscoveryQuery, { token: admin.token, cursor })
    expect(page.success).toBe(true)
    if (!page.success) return
    for (const entry of page.data.sessions) drained.push(entry)
    if (page.data.isDone === true) break
    cursor = page.data.continueCursor ?? undefined
    expect(pages).toBeLessThan(100)
    if (pages > 10) break
  }
  expect(drained.map((entry) => entry.sessionId)).toContain(adminSessionId as string)
  expect(drained.map((entry) => entry.sessionId)).toContain(otherSessionId as string)
  expect(drained).toHaveLength(2)
  expect(pages).toBeLessThan(100)
  const cleanedOther = await t.mutation(api.auth.authSessionE2eCleanupMutation, {
    token: admin.token,
    sessionIds: [otherSessionId],
  })
  expect(cleanedOther).toMatchObject({ success: true, data: { deletedCount: 1, callerDeleted: false } })
  if (!cleanedOther.success) return
  expect(cleanedOther.data.remainingMarkedOthers).toBe(0)
  const final = await t.mutation(api.auth.authSessionE2eCleanupMutation, {
    token: admin.token,
    sessionIds: [adminSessionId],
    includeCallerSession: true,
  })
  expect(final).toMatchObject({ success: true, data: { deletedCount: 1, callerDeleted: true } })
  if (!final.success) return
  expect(final.data.remainingMarkedOthers).toBe(0)
  const remaining = await t.run((ctx) => ctx.db.query("authSessions").take(1300))
  expect(remaining.filter((session) => session.e2eRunId === undefined)).toHaveLength(1200)
  expect(remaining.filter((session) => session.e2eRunId !== undefined)).toHaveLength(0)
})

test("more than one hundred marked sessions drain in batches with caller last", async () => {
  const t = convexTest(schema, modules)
  const admin = await userTokenFor(t, "admin")
  const callerMarked = await t.mutation(api.auth.authSessionE2eMarkMutation, { token: admin.token, runId })
  expect(callerMarked.success).toBe(true)
  if (!callerMarked.success) return
  const callerSessionId = callerMarked.data.sessionId as never
  const markedIds = await t.run(async (ctx) => {
    const now = new Date().toISOString()
    const ids = []
    for (let index = 0; index < 120; index++) {
      ids.push(
        await ctx.db.insert("authSessions", {
          userId: admin.userId,
          loginMethod: "dev",
          token: `marked-batch-${index}`,
          expiresAt: "2099-01-01T00:00:00.000Z",
          e2eRunId: foreignRunId,
          e2eMarkedAt: now,
          createdAt: now,
          updatedAt: now,
        }),
      )
    }
    return ids
  })
  expect(
    (
      await t.mutation(api.auth.authSessionE2eCleanupMutation, {
        token: admin.token,
        sessionIds: markedIds.slice(0, 51) as never,
      })
    ).success,
  ).toBe(false)
  expect(
    (await t.mutation(api.auth.authSessionE2eCleanupMutation, { token: admin.token, sessionIds: [] })).success,
  ).toBe(false)
  const drained: { sessionId: string }[] = []
  let cursor: string | undefined
  for (;;) {
    const page = await t.query(api.auth.authSessionE2eDiscoveryQuery, { token: admin.token, cursor })
    expect(page.success).toBe(true)
    if (!page.success) return
    for (const entry of page.data.sessions) drained.push(entry)
    if (page.data.isDone === true) break
    cursor = page.data.continueCursor ?? undefined
    if (!cursor) break
  }
  expect(drained).toHaveLength(121)
  for (let index = 0; index < markedIds.length; index += 50) {
    const batch = markedIds.slice(index, index + 50) as never
    const result = await t.mutation(api.auth.authSessionE2eCleanupMutation, { token: admin.token, sessionIds: batch })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.deletedCallerSelf ?? result.data.callerDeleted).toBe(false)
    expect(result.data.remainingMarkedOthers).toBe(index + 50 >= markedIds.length ? 0 : 1)
  }
  const final = await t.mutation(api.auth.authSessionE2eCleanupMutation, {
    token: admin.token,
    sessionIds: [callerSessionId],
    includeCallerSession: true,
  })
  expect(final).toMatchObject({ success: true, data: { deletedCount: 1, callerDeleted: true } })
  if (!final.success) return
  expect(final.data.remainingMarkedOthers).toBe(0)
})
