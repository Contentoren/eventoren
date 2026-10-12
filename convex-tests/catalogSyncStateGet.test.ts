/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "catalog-convex-test-secret"
process.env.AUTH_SECRET = authSecret

afterEach(() => {
  vi.useRealTimers()
})

test("admin sync state read proves pending versus synced versions", async () => {
  const t = convexTest(schema, modules)
  const now = new Date().toISOString()
  const adminId = await t.run(async (ctx) =>
    ctx.db.insert("users", { name: "admin user", role: "admin", createdAt: now, updatedAt: now }),
  )
  await t.run(async (ctx) => {
    await ctx.db.insert("catalogSyncStates", {
      key: "catalog",
      version: 7,
      status: "pending",
      attempts: 0,
      lastChangedByUserId: adminId,
      updatedAt: now,
    })
  })
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)
  const pending = await t.query(api.catalog.catalogSyncStateGetQuery, { token })
  expect(pending.success).toBe(true)
  if (!pending.success) return
  expect(pending.data).toEqual({ version: 7, status: "pending", syncedVersion: null })

  await t.run(async (ctx) => {
    const state = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()
    if (state) await ctx.db.patch("catalogSyncStates", state._id, { status: "synced", syncedVersion: 7 })
  })
  const synced = await t.query(api.catalog.catalogSyncStateGetQuery, { token })
  expect(synced.success).toBe(true)
  if (!synced.success) return
  expect(synced.data).toEqual({ version: 7, status: "synced", syncedVersion: 7 })
})
