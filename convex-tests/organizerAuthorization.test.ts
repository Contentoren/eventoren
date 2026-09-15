/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import type { Doc } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { organizerAuthorizeFn } from "../src/organizer/convex/organizerAuthorizeFn.ts"

const modules = import.meta.glob("../convex/**/*.ts")

async function organizerUserInsert(
  t: ReturnType<typeof convexTest>,
  role: Doc<"users">["role"],
  organizerInvitedAt?: string,
) {
  const now = new Date().toISOString()
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: `${role} organizer authorization test user`,
      role,
      ...(organizerInvitedAt ? { organizerInvitedAt } : {}),
      createdAt: now,
      updatedAt: now,
    }),
  )
}

test("allows organizers from the exact invitation timestamp and rejects earlier events", async () => {
  const t = convexTest(schema, modules)
  const invitation = "2026-09-15T12:00:00.000Z"
  const organizerId = await organizerUserInsert(t, "organizer", invitation)

  const before = await t.run(async (ctx) => organizerAuthorizeFn(ctx, organizerId, "2026-09-15T11:59:59.999Z"))
  const exact = await t.run(async (ctx) => organizerAuthorizeFn(ctx, organizerId, invitation))
  const after = await t.run(async (ctx) => organizerAuthorizeFn(ctx, organizerId, "2026-09-15T12:00:00.001Z"))

  expect(before.success).toBe(false)
  expect(exact.success).toBe(true)
  expect(after.success).toBe(true)
})

test("allows admins and dev users for events on every date", async () => {
  const t = convexTest(schema, modules)
  const adminId = await organizerUserInsert(t, "admin")
  const devId = await organizerUserInsert(t, "dev")
  const dates = ["1970-01-01T00:00:00.000Z", "2099-12-31T23:59:59.999Z"]

  for (const userId of [adminId, devId]) {
    for (const startsAt of dates) {
      const result = await t.run(async (ctx) => organizerAuthorizeFn(ctx, userId, startsAt))
      expect(result.success).toBe(true)
    }
  }
})

test("rejects customers and applies role revocation from current user data", async () => {
  const t = convexTest(schema, modules)
  const invitation = "2026-09-15T12:00:00.000Z"
  const customerId = await organizerUserInsert(t, "customer", invitation)
  const organizerId = await organizerUserInsert(t, "organizer", invitation)

  const customer = await t.run(async (ctx) => organizerAuthorizeFn(ctx, customerId, invitation))
  const organizer = await t.run(async (ctx) => organizerAuthorizeFn(ctx, organizerId, invitation))
  expect(customer.success).toBe(false)
  expect(organizer.success).toBe(true)

  await t.run(async (ctx) => ctx.db.patch("users", organizerId, { role: "customer" }))
  const revoked = await t.run(async (ctx) => organizerAuthorizeFn(ctx, organizerId, invitation))
  expect(revoked.success).toBe(false)
})
