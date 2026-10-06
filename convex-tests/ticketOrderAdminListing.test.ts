/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "admin-order-listing-test-secret"
process.env.AUTH_SECRET = authSecret

test("lists orders from different customers newest first for an admin", async () => {
  const t = convexTest(schema, modules)
  const adminId = await userInsert(t, "admin")
  const firstOwnerId = await userInsert(t, "user")
  const secondOwnerId = await userInsert(t, "user")
  await orderInsert(t, firstOwnerId, "first@example.test", "2026-09-20T10:00:00.000Z")
  await orderInsert(t, secondOwnerId, "second@example.test", "2026-09-21T10:00:00.000Z")

  const result = await t.query(api.ticketing.ticketOrderListAdminPaginatedQuery, {
    token: await testAuthSessionTokenCreate(t, adminId, authSecret),
    paginationOpts: { cursor: null, numItems: 50 },
  })

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.page.map((order: { customerEmail: string }) => order.customerEmail)).toEqual([
    "second@example.test",
    "first@example.test",
  ])
  expect(result.data.page[0].eventKey).toBe("event")
  expect(result.data.page[0]).toMatchObject({
    customerGivenName: "Erika",
    customerFamilyName: "Musterfrau",
    customerAddress: "Musterstraße 12, 50667 Köln",
    customerPhone: "+49 221 123456",
    bookingNumber: 812,
    bookingReference: "EVT-812",
  })
})

test("rejects the all-orders query for an ordinary user", async () => {
  const t = convexTest(schema, modules)
  const userId = await userInsert(t, "user")
  await orderInsert(t, userId, "private@example.test", "2026-09-21T10:00:00.000Z")

  const result = await t.query(api.ticketing.ticketOrderListAdminPaginatedQuery, {
    token: await testAuthSessionTokenCreate(t, userId, authSecret),
    search: "private@example.test",
    paginationOpts: { cursor: null, numItems: 50 },
  })

  expect(result.success).toBe(false)
})

test("filters orders by event across paginated results", async () => {
  const t = convexTest(schema, modules)
  const adminId = await userInsert(t, "admin")
  const ownerId = await userInsert(t, "user")
  await orderInsert(t, ownerId, "first@example.test", "2026-09-20T10:00:00.000Z", "selected")
  await orderInsert(t, ownerId, "other@example.test", "2026-09-21T10:00:00.000Z", "other")
  await orderInsert(t, ownerId, "last@example.test", "2026-09-22T10:00:00.000Z", "selected")
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)
  const first = await t.query(api.ticketing.ticketOrderListAdminPaginatedQuery, {
    token,
    eventKey: "selected",
    paginationOpts: { cursor: null, numItems: 1 },
  })
  expect(first.success).toBe(true)
  if (!first.success) return
  expect(first.data.page.map((order: { customerEmail: string }) => order.customerEmail)).toEqual(["last@example.test"])
  const second = await t.query(api.ticketing.ticketOrderListAdminPaginatedQuery, {
    token,
    eventKey: "selected",
    paginationOpts: { cursor: first.data.continueCursor, numItems: 1 },
  })
  expect(second.success).toBe(true)
  if (!second.success) return
  expect(second.data.page.map((order: { customerEmail: string }) => order.customerEmail)).toEqual([
    "first@example.test",
  ])
})

test("searches past the first page for a booking number, customer email and name within an event", async () => {
  const t = convexTest(schema, modules)
  const adminId = await userInsert(t, "admin")
  const ownerId = await userInsert(t, "user")
  const targetId = await orderInsert(t, ownerId, "target@example.test", "2026-09-20T10:00:00.000Z", "selected")
  await t.run(async (ctx) => ctx.db.patch(targetId, { bookingNumber: 1, bookingReference: "TEST-00001" }))
  for (let day = 21; day <= 25; day++)
    await orderInsert(t, ownerId, `other${day}@example.test`, `2026-09-${day}T10:00:00.000Z`, "selected")
  await orderInsert(t, ownerId, "target@example.test", "2026-09-26T10:00:00.000Z", "other")
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)
  for (const search of ["00001", "TEST-00001", "TARGET@EXAMPLE", "target@example.test"]) {
    let cursor: string | null = null
    let found = false
    for (let page = 0; page < 4; page++) {
      const result = await t.query(api.ticketing.ticketOrderListAdminPaginatedQuery, {
        token,
        eventKey: "selected",
        search,
        paginationOpts: { cursor, numItems: 2 },
      })
      expect(result.success).toBe(true)
      if (!result.success) break
      if (result.data.page.length) {
        expect(result.data.page.map((order: { id: string }) => order.id)).toEqual([targetId])
        expect(result.data.page[0].bookingReference).toBe("TEST-00001")
        found = true
      }
      if (result.data.isDone) break
      cursor = result.data.continueCursor
    }
    expect(found, `search: ${search}`).toBe(true)
  }
  const name = await t.query(api.ticketing.ticketOrderListAdminPaginatedQuery, {
    token,
    eventKey: "selected",
    search: "erika musterfrau",
    paginationOpts: { cursor: null, numItems: 2 },
  })
  expect(name.success).toBe(true)
  if (!name.success) return
  expect(name.data.page).toHaveLength(2)
  const next = await t.query(api.ticketing.ticketOrderListAdminPaginatedQuery, {
    token,
    eventKey: "selected",
    search: "erika musterfrau",
    paginationOpts: { cursor: name.data.continueCursor, numItems: 2 },
  })
  expect(next.success).toBe(true)
  if (next.success) expect(next.data.page).toHaveLength(2)
})

test("finds an order older than 500 newer orders by reference, email and name on the first search page", async () => {
  const t = convexTest(schema, modules)
  const adminId = await userInsert(t, "admin")
  const ownerId = await userInsert(t, "user")
  const targetId = await orderInsert(t, ownerId, "rare@example.test", "2026-09-01T10:00:00.000Z", "selected")
  await t.run(async (ctx) =>
    ctx.db.patch(targetId, {
      bookingNumber: 1,
      bookingReference: "TEST-00001",
      customerGivenName: "Rare",
      customerFamilyName: "Finder",
      contactSnapshotJson: JSON.stringify({
        email: "rare@example.test",
        givenName: "Rare",
        familyName: "Finder",
        searchTerms: " rare@example.test Rare Finder",
      }),
    }),
  )
  for (let i = 0; i < 510; i++)
    await orderInsert(
      t,
      ownerId,
      `noise${i}@example.test`,
      new Date(Date.parse("2026-09-02") + i * 1000).toISOString(),
      "selected",
    )
  await orderInsert(t, ownerId, "rare@example.test", "2026-09-30T10:00:00.000Z", "other")

  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)
  for (const search of ["00001", "TEST-00001", "RARE@EXAMPLE", "rare@example.test", "RARE FINDER"]) {
    const result = await t.query(api.ticketing.ticketOrderListAdminPaginatedQuery, {
      token,
      eventKey: "selected",
      search,
      paginationOpts: { cursor: null, numItems: 2 },
    })
    expect(result.success, search).toBe(true)
    if (!result.success) continue
    expect(
      result.data.page.map((order: { id: string }) => order.id),
      search,
    ).toEqual([targetId])
    expect(result.data.isDone, search).toBe(true)
  }
  const acrossEvents = await t.query(api.ticketing.ticketOrderListAdminPaginatedQuery, {
    token,
    search: "TEST-00001",
    paginationOpts: { cursor: null, numItems: 2 },
  })
  expect(acrossEvents.success).toBe(true)
  if (acrossEvents.success) expect(acrossEvents.data.page.map((order: { id: string }) => order.id)).toEqual([targetId])
})

test("allows admins to read local order detail and rejects ordinary users", async () => {
  const t = convexTest(schema, modules)
  const adminId = await userInsert(t, "admin")
  const userId = await userInsert(t, "user")
  const orderId = await orderInsert(t, userId, "private@example.test", "2026-09-21T10:00:00.000Z")

  const allowed = await t.query(api.ticketing.ticketOrderGetAdminQuery, {
    token: await testAuthSessionTokenCreate(t, adminId, authSecret),
    orderId,
  })
  expect(allowed.success).toBe(true)
  if (allowed.success)
    expect(allowed.data).toMatchObject({
      customerEmail: "private@example.test",
      customerGivenName: "Erika",
      customerFamilyName: "Musterfrau",
      customerAddress: "Musterstraße 12, 50667 Köln",
      customerPhone: "+49 221 123456",
      bookingNumber: 812,
      bookingReference: "EVT-812",
    })

  const rejected = await t.query(api.ticketing.ticketOrderGetAdminQuery, {
    token: await testAuthSessionTokenCreate(t, userId, authSecret),
    orderId,
  })
  expect(rejected.success).toBe(false)
})

async function userInsert(t: ReturnType<typeof convexTest>, role: "admin" | "user") {
  const now = new Date().toISOString()
  return await t.run(async (ctx) => ctx.db.insert("users", { name: role, role, createdAt: now, updatedAt: now }))
}

async function orderInsert(
  t: ReturnType<typeof convexTest>,
  ownerUserId: Id<"users">,
  customerEmail: string,
  createdAt: string,
  eventKey = "event",
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("ticketOrders", {
      checkoutKey: `checkout-${customerEmail}`,
      ownerUserId,
      customerEmail,
      customerGivenName: "Erika",
      customerFamilyName: "Musterfrau",
      customerAddress: "Musterstraße 12, 50667 Köln",
      customerPhone: "+49 221 123456",
      // convex-test splits search fields on whitespace only; Convex also splits JSON punctuation.
      contactSnapshotJson: JSON.stringify({
        email: customerEmail,
        givenName: "Erika",
        familyName: "Musterfrau",
        searchTerms: ` ${customerEmail} Erika Musterfrau`,
      }),
      eventKey,
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
      bookingNumber: 812,
      bookingReference: "EVT-812",
      reservationExpiresAt: Date.parse(createdAt) + 900_000,
      createdAt,
      updatedAt: createdAt,
    }),
  )
}
