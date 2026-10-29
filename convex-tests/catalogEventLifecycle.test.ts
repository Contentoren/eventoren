/// <reference types="vite/client" />
import { makeFunctionReference } from "convex/server"
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const secret = "catalog-lifecycle-test-secret"
process.env.AUTH_SECRET = secret
const now = "2026-09-01T00:00:00.000Z"
const archive = makeFunctionReference<
  "mutation",
  { token: string; eventKey: string },
  {
    success: boolean
    data?: { eventKey: string; catalogVersion: number; eventRevision: number }
    errorMessage?: string
  }
>("catalog:eventArchive")
const duplicate = makeFunctionReference<
  "mutation",
  { token: string; eventKey: string },
  {
    success: boolean
    data?: { eventKey: string; catalogVersion: number; eventRevision: number }
    errorMessage?: string
  }
>("catalog:eventDuplicate")

async function setup() {
  const t = convexTest(schema, modules)
  async function tokenFor(role: "admin" | "user") {
    const userId = await t.run((ctx) => ctx.db.insert("users", { name: role, role, createdAt: now, updatedAt: now }))
    const token = await createToken(userId, secret)
    await t.run((ctx) =>
      ctx.db.insert("authSessions", {
        userId,
        loginMethod: "dev",
        token,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        createdAt: now,
        updatedAt: now,
      }),
    )
    return { userId, token }
  }
  const admin = await tokenFor("admin")
  const user = await tokenFor("user")
  const ids = await t.run(async (ctx) => {
    const eventId = await ctx.db.insert("catalogEvents", {
      eventKey: "source",
      title: "Source",
      subtitle: "Subtitle",
      description: "Description",
      category: "konzerte",
      startsAt: "2027-10-01T18:00:00.000Z",
      endsAt: "2027-10-01T22:00:00.000Z",
      doorsAt: "2027-10-01T17:00:00.000Z",
      venue: "Hall",
      city: "Berlin",
      address: "Street",
      organizer: "Organizer",
      imageUrl: "/image.webp",
      imageAlt: "Stage",
      tags: ["music"],
      status: "published",
      eventRevision: 3,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
    const tierId = await ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey: "standard",
      name: "Standard",
      description: "Seats",
      priceCents: 2500,
      feeCents: 250,
      capacity: 20,
      reserved: 2,
      sold: 3,
      maxPerOrder: 4,
      activationCodeRequired: true,
      sortOrder: 0,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey: "retired",
      name: "Retired",
      description: "",
      priceCents: 1000,
      feeCents: 0,
      capacity: 10,
      reserved: 0,
      sold: 1,
      sortOrder: 1,
      archivedAt: now,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
    const orderId = await ctx.db.insert("ticketOrders", {
      checkoutKey: "checkout",
      ownerUserId: admin.userId,
      customerEmail: "a@example.com",
      customerGivenName: "A",
      customerFamilyName: "B",
      customerPhone: "",
      contactSnapshotJson: "{}",
      eventKey: "source",
      eventTitle: "Source",
      eventSubtitle: "",
      eventDescription: "",
      eventStartsAt: now,
      eventEndsAt: now,
      eventDoorsAt: now,
      venue: "Hall",
      city: "Berlin",
      address: "Street",
      organizer: "Organizer",
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      subtotalCents: 2500,
      feeCents: 250,
      totalCents: 2750,
      checkoutContextJson: "{}",
      paymentReference: "payment",
      stripeMode: "test",
      status: "paid",
      paymentStatus: "paid",
      reservationExpiresAt: Date.now() + 60000,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("ticketIssued", {
      orderId,
      sequence: 1,
      ownerUserId: admin.userId,
      code: "ticket",
      eventKey: "source",
      eventTitle: "Source",
      eventStartsAt: now,
      eventDoorsAt: now,
      venue: "Hall",
      city: "Berlin",
      address: "Street",
      tierKey: "standard",
      tierName: "Standard",
      priceCents: 2500,
      feeCents: 250,
      issuedAt: now,
    })
    await ctx.db.insert("ticketPaymentAttempts", {
      orderId,
      paymentReference: "payment",
      stripeMode: "test",
      status: "paid",
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("ticketActivationCodes", {
      eventId,
      tierId,
      eventKey: "source",
      tierKey: "standard",
      code: "code",
      number: 1,
      status: "available",
      createdAt: now,
      updatedAt: now,
    })
    return { eventId, tierId, orderId }
  })
  return { t, admin, user, ...ids }
}

async function history(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => ({
    tiers: await ctx.db.query("catalogTicketTiers").collect(),
    orders: await ctx.db.query("ticketOrders").collect(),
    tickets: await ctx.db.query("ticketIssued").collect(),
    payments: await ctx.db.query("ticketPaymentAttempts").collect(),
    codes: await ctx.db.query("ticketActivationCodes").collect(),
  }))
}

test("archive requires an admin and preserves sales and payment history while changing lifecycle only", async () => {
  const s = await setup()
  const before = await s.t.run((ctx) => ctx.db.get("catalogEvents", s.eventId))
  const records = await history(s.t)
  for (const token of ["", s.user.token])
    expect((await s.t.mutation(archive, { token, eventKey: "source" })).success).toBe(false)
  expect(await s.t.run((ctx) => ctx.db.get("catalogEvents", s.eventId))).toEqual(before)
  const result = await s.t.mutation(archive, { token: s.admin.token, eventKey: "source" })
  expect(result.success).toBe(true)
  const after = await s.t.run((ctx) => ctx.db.get("catalogEvents", s.eventId))
  expect(after).toEqual({
    ...before,
    status: "archived",
    eventRevision: 4,
    catalogVersion: result.data?.catalogVersion,
    updatedAt: after?.updatedAt,
  })
  expect(after?.deletedAt).toBeUndefined()
  expect(await history(s.t)).toEqual(records)
  expect((await s.t.run((ctx) => ctx.db.query("catalogSyncStates").first()))?.version).toBe(result.data?.catalogVersion)
})

test("normal and archive-only lists separate current and legacy archives, retaining history reads", async () => {
  const s = await setup()
  await s.t.run(async (ctx) => {
    const source = await ctx.db.get("catalogEvents", s.eventId)
    if (!source) throw new Error("source missing")
    const { _id, _creationTime, ...event } = source
    await ctx.db.insert("catalogEvents", { ...event, eventKey: "legacy", status: "archived", deletedAt: now })
    await ctx.db.insert("catalogEvents", { ...event, eventKey: "active", status: "draft" })
  })
  expect((await s.t.mutation(archive, { token: s.admin.token, eventKey: "source" })).success).toBe(true)
  const list = (archiveOnly: boolean) =>
    s.t.query(api.catalog.catalogEventListAdminPageQuery, {
      token: s.admin.token,
      archiveOnly,
      paginationOpts: { numItems: 50, cursor: null },
    })
  const normal = await list(false)
  const archived = await list(true)
  expect(normal.success && normal.data.page.map((e) => e.id)).toEqual(["active"])
  expect(archived.success && archived.data.page.map((e) => e.id).sort()).toEqual(["legacy", "source"])
  for (const eventKey of ["legacy", "source"]) {
    const detail = await s.t.query(api.catalog.catalogEventListAdminPageQuery, {
      token: s.admin.token,
      eventKey,
      paginationOpts: { numItems: 1, cursor: null },
    })
    expect(detail.success && detail.data.page.map((e) => e.id)).toEqual([eventKey])
    expect(
      (
        await s.t.query(api.catalog.catalogEventListAdminPageQuery, {
          token: s.user.token,
          eventKey,
          paginationOpts: { numItems: 1, cursor: null },
        })
      ).success,
    ).toBe(false)
    const overview = await s.t.query(api.catalog.eventOverviewPage, {
      token: s.admin.token,
      eventKey,
      paginationOpts: { numItems: 10, cursor: null },
    })
    expect(overview.success).toBe(true)
    const orders = await s.t.query(api.ticketing.ticketOrderListAdminPaginatedQuery, {
      token: s.admin.token,
      eventKey,
      paginationOpts: { numItems: 10, cursor: null },
    })
    expect(orders.success).toBe(true)
  }
})

test("legacy archived sources duplicate as drafts without modifying the source", async () => {
  const s = await setup()
  await s.t.run((ctx) => ctx.db.patch("catalogEvents", s.eventId, { status: "archived", deletedAt: now }))
  const before = await s.t.run((ctx) => ctx.db.get("catalogEvents", s.eventId))
  const result = await s.t.mutation(duplicate, { token: s.admin.token, eventKey: "source" })
  expect(result.success).toBe(true)
  if (!result.data) throw new Error(result.errorMessage)
  const copy = await s.t.run((ctx) =>
    ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", result.data!.eventKey))
      .unique(),
  )
  expect(copy).toMatchObject({ status: "draft", title: "Source" })
  expect(copy?.deletedAt).toBeUndefined()
  expect(await s.t.run((ctx) => ctx.db.get("catalogEvents", s.eventId))).toEqual(before)
})

test("duplicate copies editable configuration to fresh draft and tiers without inventory or history", async () => {
  const s = await setup()
  const before = await s.t.run((ctx) => ctx.db.get("catalogEvents", s.eventId))
  const records = await history(s.t)
  for (const token of ["", s.user.token])
    expect((await s.t.mutation(duplicate, { token, eventKey: "source" })).success).toBe(false)
  const result = await s.t.mutation(duplicate, { token: s.admin.token, eventKey: "source" })
  expect(result.success).toBe(true)
  if (!result.data) throw new Error(result.errorMessage)
  expect(result.data.eventKey).not.toBe("source")
  const copy = await s.t.run((ctx) =>
    ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", result.data!.eventKey))
      .unique(),
  )
  expect(copy).toMatchObject({
    title: "Source",
    subtitle: "Subtitle",
    description: "Description",
    venue: "Hall",
    tags: ["music"],
    status: "draft",
    eventRevision: 1,
  })
  expect(copy?._id).not.toBe(s.eventId)
  expect(copy?.deletedAt).toBeUndefined()
  const after = await history(s.t)
  const copiedTiers = after.tiers.filter((tier) => tier.eventId === copy?._id)
  expect(copiedTiers).toHaveLength(1)
  expect(copiedTiers[0]).toMatchObject({
    name: "Standard",
    description: "Seats",
    priceCents: 2500,
    feeCents: 250,
    capacity: 20,
    maxPerOrder: 4,
    activationCodeRequired: true,
    sold: 0,
    reserved: 0,
  })
  expect(copiedTiers[0]?.tierKey).not.toBe("standard")
  expect(copiedTiers[0]?._id).not.toBe(s.tierId)
  expect(after.tiers.filter((tier) => tier.eventId === s.eventId)).toEqual(records.tiers)
  expect({ ...after, tiers: records.tiers }).toEqual(records)
  expect(await s.t.run((ctx) => ctx.db.get("catalogEvents", s.eventId))).toEqual(before)
})

test("duplicate rejects more than 100 active tiers before any event or sync writes", async () => {
  const s = await setup()
  await s.t.run(async (ctx) => {
    const tier = await ctx.db.get("catalogTicketTiers", s.tierId)
    if (!tier) throw new Error("tier missing")
    const { _id, _creationTime, ...data } = tier
    for (let i = 0; i < 100; i++) await ctx.db.insert("catalogTicketTiers", { ...data, tierKey: `extra-${i}` })
  })
  const before = await s.t.run(async (ctx) => ({
    events: await ctx.db.query("catalogEvents").collect(),
    tiers: await ctx.db.query("catalogTicketTiers").collect(),
    sync: await ctx.db.query("catalogSyncStates").collect(),
    snapshots: await ctx.db.query("catalogSyncSnapshots").collect(),
  }))
  expect((await s.t.mutation(duplicate, { token: s.admin.token, eventKey: "source" })).success).toBe(false)
  expect(
    await s.t.run(async (ctx) => ({
      events: await ctx.db.query("catalogEvents").collect(),
      tiers: await ctx.db.query("catalogTicketTiers").collect(),
      sync: await ctx.db.query("catalogSyncStates").collect(),
      snapshots: await ctx.db.query("catalogSyncSnapshots").collect(),
    })),
  ).toEqual(before)
})
