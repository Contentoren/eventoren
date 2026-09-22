/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "admin-order-listing-test-secret"
process.env.AUTH_SECRET = authSecret

test("lists orders from different customers newest first for admin and dev roles", async () => {
  const t = convexTest(schema, modules)
  const adminId = await userInsert(t, "admin")
  const devId = await userInsert(t, "dev")
  const firstOwnerId = await userInsert(t, "user")
  const secondOwnerId = await userInsert(t, "user")
  await orderInsert(t, firstOwnerId, "first@example.test", "2026-09-20T10:00:00.000Z")
  await orderInsert(t, secondOwnerId, "second@example.test", "2026-09-21T10:00:00.000Z")

  for (const userId of [adminId, devId]) {
    const result = await t.query(api.ticketing.ticketOrderListAdminPaginatedQuery, {
      token: await createToken(userId, authSecret),
      paginationOpts: { cursor: null, numItems: 50 },
    })

    expect(result.success).toBe(true)
    if (!result.success) continue
    expect(result.data.page.map((order: { customerEmail: string }) => order.customerEmail)).toEqual([
      "second@example.test",
      "first@example.test",
    ])
  }
})

test("rejects the all-orders query for an ordinary user", async () => {
  const t = convexTest(schema, modules)
  const userId = await userInsert(t, "user")
  await orderInsert(t, userId, "private@example.test", "2026-09-21T10:00:00.000Z")

  const result = await t.query(api.ticketing.ticketOrderListAdminPaginatedQuery, {
    token: await createToken(userId, authSecret),
    paginationOpts: { cursor: null, numItems: 50 },
  })

  expect(result.success).toBe(false)
})

async function userInsert(t: ReturnType<typeof convexTest>, role: "admin" | "dev" | "user") {
  const now = new Date().toISOString()
  return await t.run(async (ctx) => ctx.db.insert("users", { name: role, role, createdAt: now, updatedAt: now }))
}

async function orderInsert(
  t: ReturnType<typeof convexTest>,
  ownerUserId: Id<"users">,
  customerEmail: string,
  createdAt: string,
) {
  await t.run(async (ctx) =>
    ctx.db.insert("ticketOrders", {
      checkoutKey: `checkout-${customerEmail}`,
      ownerUserId,
      customerEmail,
      contactSnapshotJson: "{}",
      eventKey: "event",
      eventTitle: "Testveranstaltung",
      eventSubtitle: "",
      eventDescription: "",
      eventStartsAt: "2026-10-01T18:00:00.000Z",
      eventEndsAt: "2026-10-01T20:00:00.000Z",
      eventDoorsAt: "2026-10-01T17:00:00.000Z",
      venue: "Halle",
      city: "Köln",
      address: "Straße 1",
      organizer: "Eventoren",
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      subtotalCents: 1000,
      feeCents: 100,
      totalCents: 1100,
      checkoutContextJson: "{}",
      paymentReference: `payment-${customerEmail}`,
      stripeMode: "test",
      status: "paid",
      paymentStatus: "paid",
      reservationExpiresAt: Date.parse(createdAt) + 900_000,
      createdAt,
      updatedAt: createdAt,
    }),
  )
}
