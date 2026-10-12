/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { api } from "../convex/_generated/api.js"
import type { Doc } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"
import type { EventFilter } from "../src/events/EventFilter.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "catalog-convex-test-secret"
process.env.AUTH_SECRET = authSecret

afterEach(() => {
  vi.useRealTimers()
})

async function createUser(t: ReturnType<typeof convexTest>, role: "user" | "admin") {
  const now = new Date().toISOString()
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: `${role} user`,
      role,
      createdAt: now,
      updatedAt: now,
    }),
  )
}

async function tokenFor(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return await testAuthSessionTokenCreate(t, userId, authSecret)
}

function eventArgs(token: string, status?: "draft" | "published" | "archived") {
  return {
    eventKey: "catalog-event",
    title: "Katalogveranstaltung",
    subtitle: "Eine veröffentlichte Veranstaltung",
    description: "Eine Katalog-Testveranstaltung",
    category: "konzerte" as const,
    startsAt: "2026-10-01T18:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    venue: "Test hall",
    city: "Berlin",
    address: "Teststraße 1",
    organizer: "Eventoren",
    imageUrl: "/images/test.webp",
    imageAlt: "Testveranstaltung",
    tags: ["test"],
    ...(status ? { status } : {}),
    token,
  }
}

type CatalogEventInsert = Omit<Doc<"catalogEvents">, "_id" | "_creationTime">
type CatalogTierInsert = Omit<Doc<"catalogTicketTiers">, "_id" | "_creationTime" | "eventId">

function catalogEventInsert(overrides: Partial<CatalogEventInsert> = {}): CatalogEventInsert {
  return {
    eventKey: "catalog-event",
    title: "Katalogveranstaltung",
    subtitle: "Eine veröffentlichte Veranstaltung",
    description: "Eine Katalog-Testveranstaltung",
    category: "konzerte",
    startsAt: "2026-10-01T18:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    venue: "Test hall",
    city: "Berlin",
    address: "Teststraße 1",
    organizer: "Eventoren",
    imageUrl: "/images/test.webp",
    imageAlt: "Testveranstaltung",
    tags: ["test"],
    status: "published",
    catalogVersion: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  }
}

function catalogTierInsert(eventId: Doc<"catalogEvents">["_id"], overrides: Partial<CatalogTierInsert> = {}) {
  return {
    eventId,
    tierKey: "standard",
    name: "Standard",
    description: "Freie Platzwahl",
    startsAt: "2026-10-01T18:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    priceCents: 2500,
    feeCents: 250,
    capacity: 10,
    reserved: 0,
    sold: 0,
    sortOrder: 0,
    catalogVersion: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  }
}

async function catalogPublishedPageGet(
  t: ReturnType<typeof convexTest>,
  filter: EventFilter,
  numItems: number,
  cursor: string | null = null,
) {
  const result = await t.query(api.catalog.catalogEventListPublishedPageQuery, {
    filter,
    paginationOpts: { numItems, cursor },
  })
  if (!result.success) throw new Error(result.errorMessage)
  return result.data
}

test("rejects catalog writes without an admin role", async () => {
  const t = convexTest(schema, modules)
  const userId = await createUser(t, "user")
  const token = await tokenFor(t, userId)

  const missingToken = await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(""))
  const regularUser = await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token))

  expect(missingToken.success).toBe(false)
  expect(regularUser.success).toBe(false)
})

test("persists an admin-created category without an event and restores a hidden category", async () => {
  const t = convexTest(schema, modules)
  const adminToken = await tokenFor(t, await createUser(t, "admin"))
  const userToken = await tokenFor(t, await createUser(t, "user"))

  expect(
    (await t.mutation(api.catalog.catalogCategoryCreateMutation, { category: "Test", token: userToken })).success,
  ).toBe(false)
  expect(
    (await t.mutation(api.catalog.catalogCategoryCreateMutation, { category: " Test ", token: adminToken })).success,
  ).toBe(true)
  expect((await t.query(api.catalog.catalogCategoryListQuery, { token: adminToken })).data).toEqual(["Test"])

  await t.mutation(api.catalog.catalogCategoryHideMutation, { category: "Test", token: adminToken })
  expect((await t.query(api.catalog.catalogCategoryHiddenListQuery, { token: adminToken })).data).toEqual(["Test"])
  await t.mutation(api.catalog.catalogCategoryCreateMutation, { category: "Test", token: adminToken })

  expect((await t.query(api.catalog.catalogCategoryListQuery, { token: adminToken })).data).toEqual(["Test"])
  expect((await t.query(api.catalog.catalogCategoryHiddenListQuery, { token: adminToken })).data).toEqual([])
})

test("deleting an event hides it without removing its order or ticket tier", async () => {
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const userId = await createUser(t, "user")
  const token = await tokenFor(t, adminId)
  const userToken = await tokenFor(t, userId)
  const eventId = await t.run(async (ctx) => ctx.db.insert("catalogEvents", catalogEventInsert()))
  const tierId = await t.run(async (ctx) =>
    ctx.db.insert("catalogTicketTiers", catalogTierInsert(eventId, { sold: 1 })),
  )
  const orderId = await t.run(async (ctx) =>
    ctx.db.insert("ticketOrders", {
      checkoutKey: "deleted-event-order",
      customerEmail: "buyer@example.com",
      contactSnapshotJson: "{}",
      eventKey: "catalog-event",
      eventTitle: "Katalogveranstaltung",
      eventSubtitle: "",
      eventDescription: "",
      eventStartsAt: "2026-10-01T18:00:00.000Z",
      eventEndsAt: "",
      eventDoorsAt: "",
      venue: "Test hall",
      city: "Berlin",
      address: "",
      organizer: "Eventoren",
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      subtotalCents: 2500,
      feeCents: 250,
      totalCents: 2750,
      checkoutContextJson: "{}",
      paymentReference: "deleted-event-payment",
      stripeMode: "test",
      status: "paid",
      paymentStatus: "paid",
      reservationExpiresAt: 0,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    }),
  )
  const denied = await t.mutation(api.catalog.catalogEventDeleteMutation, {
    eventKey: "catalog-event",
    token: userToken,
  })
  expect(denied.success).toBe(false)

  const deleted = await t.mutation(api.catalog.catalogEventDeleteMutation, { eventKey: "catalog-event", token })
  expect(deleted.success).toBe(true)
  const adminPage = await t.query(api.catalog.catalogEventListAdminPageQuery, {
    token,
    paginationOpts: { numItems: 10, cursor: null },
  })
  expect(adminPage.success && adminPage.data.page).toEqual([])
  expect(await t.query(api.catalog.catalogEventGetPublishedQuery, { eventKey: "catalog-event" })).toBeNull()
  const retained = await t.run(async (ctx) => ({
    event: await ctx.db.get("catalogEvents", eventId),
    tier: await ctx.db.get("catalogTicketTiers", tierId),
    order: await ctx.db.get("ticketOrders", orderId),
  }))
  expect(retained.event).toMatchObject({ status: "archived", deletedAt: expect.any(String) })
  expect(retained.tier?.sold).toBe(1)
  expect(retained.order?.eventTitle).toBe("Katalogveranstaltung")
  expect((await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token, "draft"))).success).toBe(false)
})

test("admin writes are versioned and published reads match EventItem", async () => {
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const token = await tokenFor(t, adminId)

  const event = await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token, "draft"))
  expect(event.success).toBe(true)
  if (!event.success) return

  const tier = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    eventKey: "catalog-event",
    tierKey: "standard",
    name: "Standard",
    description: "Freie Platzwahl",
    startsAt: "2026-10-01T18:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    priceCents: 2500,
    feeCents: 250,
    capacity: 10,
    token,
  })
  expect(tier.success).toBe(true)
  if (!tier.success) return

  const published = await t.mutation(api.catalog.catalogEventPublishMutation, {
    eventKey: "catalog-event",
    token,
  })
  expect(published.success).toBe(true)
  if (!published.success) return

  const items = await t.query(api.catalog.catalogEventListPublishedQuery, {})
  const item = await t.query(api.catalog.catalogEventGetPublishedQuery, { eventKey: "catalog-event" })
  expect(items).toHaveLength(1)
  expect(item).toMatchObject({
    id: "catalog-event",
    title: "Katalogveranstaltung",
    subtitle: "Eine veröffentlichte Veranstaltung",
    description: "Eine Katalog-Testveranstaltung",
    imageAlt: "Testveranstaltung",
    soldOut: false,
    tiers: [
      {
        id: "standard",
        name: "Standard",
        description: "Freie Platzwahl",
        startsAt: "2026-10-01T18:00:00.000Z",
        doorsAt: "2026-10-01T17:00:00.000Z",
        endsAt: "2026-10-01T22:00:00.000Z",
        priceCents: 2500,
        feeCents: 250,
        capacity: 10,
        available: 10,
      },
    ],
  })
  expect(published.data.catalogVersion).toBeGreaterThan(event.data.catalogVersion)

  const syncState = await t.run(async (ctx) => ctx.db.query("catalogSyncStates").collect())
  expect(syncState).toMatchObject([{ version: published.data.catalogVersion, status: "pending", attempts: 0 }])
})

test("published events without active tiers stay out of public catalog lists", async () => {
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const token = await tokenFor(t, adminId)

  const event = await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token, "published"))
  expect(event.success).toBe(true)
  if (!event.success) return

  const published = await t.mutation(api.catalog.catalogEventPublishMutation, {
    eventKey: "catalog-event",
    token,
  })
  expect(published.success).toBe(true)

  expect(await t.query(api.catalog.catalogEventListPublishedQuery, {})).toEqual([])
  const page = await catalogPublishedPageGet(t, { query: "", location: "", category: "alle", timeWindow: "alle" }, 10)
  expect(page.page).toEqual([])

  await t.run(async (ctx) => {
    const [storedEvent] = await ctx.db.query("catalogEvents").collect()
    if (!storedEvent) throw new Error("Expected published event")
    await ctx.db.insert("catalogTicketTiers", catalogTierInsert(storedEvent._id))
  })

  expect(await t.query(api.catalog.catalogEventListPublishedQuery, {})).toHaveLength(1)
})

test("event and tier configuration changes advance one event revision while no-op edits preserve sequencing", async () => {
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const token = await tokenFor(t, adminId)
  const first = await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token, "draft"))
  expect(first).toMatchObject({ success: true, data: { eventRevision: 1 } })
  if (!first.success) return

  const unchangedEvent = await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token, "draft"))
  expect(unchangedEvent).toMatchObject({
    success: true,
    data: { catalogVersion: first.data.catalogVersion, eventRevision: 1 },
  })
  const changedEvent = await t.mutation(api.catalog.catalogEventUpsertMutation, {
    ...eventArgs(token, "draft"),
    description: "Description-only change",
  })
  expect(changedEvent).toMatchObject({ success: true, data: { eventRevision: 2 } })
  if (!changedEvent.success) return

  const tierArgs = {
    eventKey: "catalog-event",
    tierKey: "standard",
    name: "Standard",
    description: "Freie Platzwahl",
    startsAt: "2026-10-01T18:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    additionalDoorsAt: [{ startsAt: "2026-10-01T16:00:00.000Z", endsAt: "2026-10-01T17:00:00.000Z" }],
    endsAt: "2026-10-01T22:00:00.000Z",
    priceCents: 2500,
    feeCents: 250,
    capacity: 10,
    token,
  }
  const tier = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, tierArgs)
  expect(tier).toMatchObject({ success: true, data: { eventRevision: 3 } })
  if (!tier.success) return
  const unchangedTier = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, tierArgs)
  expect(unchangedTier).toMatchObject({
    success: true,
    data: { catalogVersion: tier.data.catalogVersion, eventRevision: 3 },
  })
  const changedTier = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    ...tierArgs,
    description: "Descriptive tier edit",
  })
  expect(changedTier).toMatchObject({ success: true, data: { eventRevision: 4 } })
  const sync = await t.run(async (ctx) => ctx.db.query("catalogSyncStates").collect())
  expect(sync[0]?.version).toBe(changedTier.success ? changedTier.data.catalogVersion : -1)
  expect(sync[0]?.version).toBe(tier.data.catalogVersion + 1)
})

test("event inclusions and exclusions preserve omitted values and explicitly saved empty arrays", async () => {
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const token = await tokenFor(t, adminId)

  const initial = await t.mutation(api.catalog.catalogEventUpsertMutation, {
    ...eventArgs(token, "draft"),
    inclusions: ["Eintrittskarte"],
    exclusions: ["Anreise"],
  })
  expect(initial.success).toBe(true)

  const legacyUpdate = await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token, "draft"))
  expect(legacyUpdate.success).toBe(true)
  const preserved = await t.run(async (ctx) =>
    ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", "catalog-event"))
      .unique(),
  )
  expect(preserved).toMatchObject({ inclusions: ["Eintrittskarte"], exclusions: ["Anreise"] })

  const cleared = await t.mutation(api.catalog.catalogEventUpsertMutation, {
    ...eventArgs(token, "draft"),
    inclusions: [],
    exclusions: [],
  })
  expect(cleared.success).toBe(true)
  const adminPage = await t.query(api.catalog.catalogEventListAdminPageQuery, {
    token,
    paginationOpts: { numItems: 10, cursor: null },
  })
  expect(adminPage.success && adminPage.data.page[0]).toMatchObject({ inclusions: [], exclusions: [] })
})

test("tier upsert preserves omitted additional admissions and clears them only when explicitly empty", async () => {
  const t = convexTest(schema, modules)
  const token = await tokenFor(t, await createUser(t, "admin"))
  await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token, "draft"))

  const tierArgs = {
    eventKey: "catalog-event",
    tierKey: "standard",
    name: "Standard",
    description: "Freie Platzwahl",
    startsAt: "2026-10-01T18:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    priceCents: 2500,
    feeCents: 250,
    capacity: 10,
    token,
  }
  const additionalAdmissions = [{ startsAt: "2026-10-01T16:00:00.000Z", endsAt: "2026-10-01T17:00:00.000Z" }]
  const created = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    ...tierArgs,
    additionalDoorsAt: additionalAdmissions,
  })
  expect(created.success).toBe(true)

  const omittedUpdate = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    ...tierArgs,
    description: "Updated description",
  })
  expect(omittedUpdate.success).toBe(true)
  const preserved = await t.run(async (ctx) => ctx.db.query("catalogTicketTiers").first())
  expect(preserved?.additionalDoorsAt).toEqual(additionalAdmissions)

  const cleared = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    ...tierArgs,
    description: "Updated description",
    additionalDoorsAt: [],
  })
  expect(cleared.success).toBe(true)
  const clearedTier = await t.run(async (ctx) => ctx.db.query("catalogTicketTiers").first())
  expect(clearedTier?.additionalDoorsAt).toEqual([])

  const legacy = await t.run(async (ctx) => {
    const event = await ctx.db.query("catalogEvents").first()
    if (!event) return null
    return await ctx.db.insert(
      "catalogTicketTiers",
      catalogTierInsert(event._id, {
        tierKey: "legacy",
        additionalDoorsAt: ["2026-10-01T16:00:00.000Z"],
      }),
    )
  })
  expect(legacy).not.toBeNull()

  const legacyUpdate = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    ...tierArgs,
    tierKey: "legacy",
    description: "Legacy update",
  })
  expect(legacyUpdate.success).toBe(true)
  const preservedLegacy = await t.run(async (ctx) => {
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", "catalog-event"))
      .unique()
    if (!event) return null
    return await ctx.db
      .query("catalogTicketTiers")
      .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id).eq("tierKey", "legacy"))
      .unique()
  })
  expect(preservedLegacy?.additionalDoorsAt).toEqual(["2026-10-01T16:00:00.000Z"])
})

test("tier upsert requires start and end times and defaults empty doors time to start", async () => {
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const token = await tokenFor(t, adminId)
  await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token, "draft"))

  const missingStart = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    eventKey: "catalog-event",
    tierKey: "invalid-start",
    name: "Invalid start",
    description: "",
    startsAt: " ",
    doorsAt: "",
    endsAt: "2026-10-01T22:00:00.000Z",
    priceCents: 2500,
    feeCents: 250,
    capacity: 10,
    token,
  })
  const missingEnd = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    eventKey: "catalog-event",
    tierKey: "invalid-end",
    name: "Invalid end",
    description: "",
    startsAt: "2026-10-01T18:00:00.000Z",
    doorsAt: "",
    endsAt: "",
    priceCents: 2500,
    feeCents: 250,
    capacity: 10,
    token,
  })
  const upserted = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    eventKey: "catalog-event",
    tierKey: "standard",
    name: "Standard",
    description: "",
    startsAt: "2026-10-01T18:00:00.000Z",
    doorsAt: "",
    endsAt: "2026-10-01T22:00:00.000Z",
    priceCents: 2500,
    feeCents: 250,
    capacity: 10,
    token,
  })

  expect(missingStart).toMatchObject({ success: false, errorMessage: "Start time is required" })
  expect(missingEnd).toMatchObject({ success: false, errorMessage: "End time is required" })
  expect(upserted.success).toBe(true)
  await t.mutation(api.catalog.catalogEventPublishMutation, { eventKey: "catalog-event", token })
  const projected = await t.query(api.catalog.catalogEventGetPublishedQuery, { eventKey: "catalog-event" })
  expect(projected?.tiers[0]).toMatchObject({
    startsAt: "2026-10-01T18:00:00.000Z",
    doorsAt: "2026-10-01T18:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
  })
})

test("tier upsert rejects malformed ISO start, admission, and end times", async () => {
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const token = await tokenFor(t, adminId)
  await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token, "draft"))

  const validTimes = {
    startsAt: "2026-10-01T18:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
  }
  const baseArgs = {
    eventKey: "catalog-event",
    name: "Standard",
    description: "",
    priceCents: 2500,
    feeCents: 250,
    capacity: 10,
    token,
  }
  const invalidStart = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    ...baseArgs,
    tierKey: "invalid-start",
    ...validTimes,
    startsAt: "tomorrow evening",
  })
  const invalidDoors = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    ...baseArgs,
    tierKey: "invalid-doors",
    ...validTimes,
    doorsAt: "2026-02-30T17:00:00.000Z",
  })
  const invalidEnd = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    ...baseArgs,
    tierKey: "invalid-end",
    ...validTimes,
    endsAt: "not-a-date",
  })
  const missingAdmissionEnd = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    ...baseArgs,
    tierKey: "missing-admission-end",
    ...validTimes,
    additionalDoorsAt: [{ startsAt: "2026-10-01T16:00:00.000Z", endsAt: "" }],
  })
  const reversedAdmission = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    ...baseArgs,
    tierKey: "reversed-admission",
    ...validTimes,
    additionalDoorsAt: [{ startsAt: "2026-10-01T18:00:00.000Z", endsAt: "2026-10-01T17:00:00.000Z" }],
  })
  const validAdmission = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    ...baseArgs,
    tierKey: "valid-admission",
    ...validTimes,
    additionalDoorsAt: [{ startsAt: "2026-10-01T16:00:00.000Z", endsAt: "2026-10-01T17:00:00.000Z" }],
  })

  expect(invalidStart).toMatchObject({ success: false, errorMessage: "Start time must be a valid ISO date and time" })
  expect(invalidDoors).toMatchObject({
    success: false,
    errorMessage: "Admission time must be a valid ISO date and time",
  })
  expect(invalidEnd).toMatchObject({ success: false, errorMessage: "End time must be a valid ISO date and time" })
  expect(missingAdmissionEnd).toMatchObject({ success: false })
  expect(reversedAdmission).toMatchObject({ success: false })
  expect(validAdmission.success).toBe(true)
})

test("legacy additional admission timestamps remain readable without an invented end time", async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    const eventId = await ctx.db.insert("catalogEvents", catalogEventInsert())
    await ctx.db.insert(
      "catalogTicketTiers",
      catalogTierInsert(eventId, { additionalDoorsAt: ["2026-10-01T16:00:00.000Z"] }),
    )
  })

  const projected = await t.query(api.catalog.catalogEventGetPublishedQuery, { eventKey: "catalog-event" })
  expect(projected?.tiers[0]?.additionalDoorsAt).toEqual([{ startsAt: "2026-10-01T16:00:00.000Z", endsAt: "" }])
})

test("admins delete unused tiers and hide sold tiers while retaining historical inventory", async () => {
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const token = await tokenFor(t, adminId)
  const eventId = await t.run(async (ctx) => ctx.db.insert("catalogEvents", catalogEventInsert()))
  await t.run(async (ctx) => {
    await ctx.db.insert("catalogTicketTiers", catalogTierInsert(eventId, { tierKey: "unused" }))
    await ctx.db.insert("catalogTicketTiers", catalogTierInsert(eventId, { tierKey: "sold", sold: 1 }))
  })

  const deleted = await t.mutation(api.catalog.catalogTicketTierDeleteMutation, {
    eventKey: "catalog-event",
    tierKey: "unused",
    token,
  })
  const archived = await t.mutation(api.catalog.catalogTicketTierDeleteMutation, {
    eventKey: "catalog-event",
    tierKey: "sold",
    token,
  })
  const tiers = await t.run(async (ctx) => ctx.db.query("catalogTicketTiers").collect())
  const published = await t.query(api.catalog.catalogEventGetPublishedQuery, { eventKey: "catalog-event" })
  const admin = await t.query(api.catalog.catalogEventListAdminPageQuery, {
    token,
    paginationOpts: { numItems: 10, cursor: null },
  })

  expect(deleted.success).toBe(true)
  expect(archived.success).toBe(true)
  expect(tiers.map((tier) => tier.tierKey)).toEqual(["sold"])
  expect(tiers[0]?.sold).toBe(1)
  expect(tiers[0]?.archivedAt).toBeDefined()
  expect(published?.tiers).toEqual([])
  expect(admin.success && admin.data.page[0]?.tiers).toEqual([])
  const reuse = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    eventKey: "catalog-event",
    tierKey: "sold",
    name: "Reused",
    description: "",
    startsAt: "2026-10-01T18:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    priceCents: 2500,
    feeCents: 0,
    capacity: 10,
    token,
  })
  expect(reuse.success).toBe(false)
})

test("ticket products with active reservations cannot be deleted", async () => {
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const token = await tokenFor(t, adminId)
  const eventId = await t.run(async (ctx) => ctx.db.insert("catalogEvents", catalogEventInsert()))
  await t.run(async (ctx) => ctx.db.insert("catalogTicketTiers", catalogTierInsert(eventId, { reserved: 1 })))

  const result = await t.mutation(api.catalog.catalogTicketTierDeleteMutation, {
    eventKey: "catalog-event",
    tierKey: "standard",
    token,
  })

  expect(result.success).toBe(false)
  expect(await t.run(async (ctx) => ctx.db.query("catalogTicketTiers").first())).toMatchObject({ reserved: 1 })
})

test("published events use the latest Billing-synced catalog version for checkout", async () => {
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  await t.run(async (ctx) => {
    const now = new Date().toISOString()
    const eventId = await ctx.db.insert("catalogEvents", catalogEventInsert({ catalogVersion: 13 }))
    await ctx.db.insert("catalogTicketTiers", catalogTierInsert(eventId, { catalogVersion: 13 }))
    await ctx.db.insert("catalogSyncStates", {
      key: "catalog",
      version: 16,
      status: "synced",
      syncedVersion: 16,
      syncedDigest: "a".repeat(64),
      attempts: 0,
      lastChangedByUserId: adminId,
      updatedAt: now,
    })
  })

  const listed = await t.query(api.catalog.catalogEventListPublishedQuery, {})
  const detail = await t.query(api.catalog.catalogEventGetPublishedQuery, { eventKey: "catalog-event" })
  const page = await catalogPublishedPageGet(t, { query: "", location: "", category: "alle", timeWindow: "alle" }, 10)

  expect(listed[0]?.catalogVersion).toBe(16)
  expect(detail?.catalogVersion).toBe(16)
  expect(page.page[0]?.catalogVersion).toBe(16)
})

test("legacy published list fails explicitly rather than truncating catalogs beyond its event limit", async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    for (let index = 0; index < 51; index += 1) {
      await ctx.db.insert("catalogEvents", catalogEventInsert({ eventKey: `event-${index}` }))
    }
  })

  await expect(t.query(api.catalog.catalogEventListPublishedQuery, {})).rejects.toThrow(
    "Published catalog exceeds the legacy list limit of 50; use cursor pagination",
  )
})

test("legacy published list fails explicitly rather than truncating excessive event tiers", async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    const eventId = await ctx.db.insert("catalogEvents", catalogEventInsert())
    for (let index = 0; index < 51; index += 1) {
      await ctx.db.insert("catalogTicketTiers", catalogTierInsert(eventId, { tierKey: `tier-${index}` }))
    }
  })

  await expect(t.query(api.catalog.catalogEventListPublishedQuery, {})).rejects.toThrow(
    "Published event catalog-event exceeds the legacy list limit of 50 active tiers",
  )
})

test("published page is public and excludes draft and archived events", async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    for (const status of ["published", "draft", "archived"] as const) {
      const eventId = await ctx.db.insert("catalogEvents", catalogEventInsert({ eventKey: `event-${status}`, status }))
      await ctx.db.insert("catalogTicketTiers", catalogTierInsert(eventId))
    }
  })

  const page = await catalogPublishedPageGet(t, { query: "", location: "", category: "alle", timeWindow: "alle" }, 10)

  expect(page.page.map((event) => event.id)).toEqual(["event-published"])
  expect(page.isDone).toBe(true)
  expect(page.page[0]?.tiers).toHaveLength(1)
})

test("published page preserves eventFilterApply filter semantics", async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-09-15T12:00:00.000Z"))
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    const events = [
      catalogEventInsert({
        eventKey: "today",
        title: "Unique title",
        subtitle: "Unique subtitle",
        venue: "Unique venue",
        city: "Unique city",
        address: "Unique address",
        tags: ["unique-tag"],
        startsAt: "2026-09-15T18:00:00.000Z",
      }),
      catalogEventInsert({
        eventKey: "weekend",
        category: "sport",
        city: "Hamburg",
        startsAt: "2026-09-19T18:00:00.000Z",
      }),
      catalogEventInsert({
        eventKey: "month",
        category: "kultur",
        startsAt: "2026-09-25T18:00:00.000Z",
      }),
      catalogEventInsert({
        eventKey: "past-this-month",
        startsAt: "2026-09-01T18:00:00.000Z",
      }),
      catalogEventInsert({
        eventKey: "address-only",
        address: "Needle address",
        startsAt: "2026-10-01T18:00:00.000Z",
      }),
    ]
    for (const [index, event] of events.entries()) {
      const eventId = await ctx.db.insert("catalogEvents", { ...event, catalogVersion: index + 1 })
      await ctx.db.insert("catalogTicketTiers", catalogTierInsert(eventId, { catalogVersion: index + 1 }))
    }
  })

  async function page(filter: {
    query: string
    location: string
    category: "alle" | "konzerte" | "festivals" | "kultur" | "sport" | "reisen"
    timeWindow: "alle" | "heute" | "wochenende" | "monat"
  }) {
    const result = await catalogPublishedPageGet(t, filter, 10)
    return result.page.map((event) => event.id)
  }

  expect(await page({ query: "  UNIQUE TITLE ", location: "", category: "alle", timeWindow: "alle" })).toEqual([
    "today",
  ])
  expect(await page({ query: "", location: " unique address ", category: "alle", timeWindow: "alle" })).toEqual([
    "today",
  ])
  expect(await page({ query: "needle", location: "", category: "alle", timeWindow: "alle" })).toEqual([])
  expect(await page({ query: "", location: "", category: "sport", timeWindow: "alle" })).toEqual(["weekend"])
  expect(await page({ query: "", location: "", category: "alle", timeWindow: "heute" })).toEqual(["today"])
  expect(await page({ query: "", location: "", category: "alle", timeWindow: "wochenende" })).toEqual(["weekend"])
  expect(await page({ query: "", location: "", category: "alle", timeWindow: "monat" })).toEqual([
    "today",
    "weekend",
    "month",
  ])
  expect(
    await page({ query: "unique-tag", location: "unique city", category: "konzerte", timeWindow: "heute" }),
  ).toEqual(["today"])
})

test("published page cursors cover dense and sparse filtered catalogs without duplicates", async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    for (let index = 0; index < 5; index += 1) {
      const eventId = await ctx.db.insert(
        "catalogEvents",
        catalogEventInsert({
          eventKey: `event-${index}`,
          title: index === 4 ? "Needle event" : `Event ${index}`,
          startsAt: `2026-10-0${index + 1}T18:00:00.000Z`,
        }),
      )
      await ctx.db.insert("catalogTicketTiers", catalogTierInsert(eventId))
    }
  })

  const allIds: string[] = []
  let cursor: string | null = null
  let densePageCount = 0
  let denseEmptyPageCount = 0
  do {
    const page = await catalogPublishedPageGet(
      t,
      { query: "", location: "", category: "alle", timeWindow: "alle" },
      2,
      cursor,
    )
    densePageCount += 1
    if (page.page.length === 0) denseEmptyPageCount += 1
    allIds.push(...page.page.map((event) => event.id))
    cursor = page.isDone ? null : page.continueCursor
  } while (cursor !== null)

  expect(densePageCount).toBe(3)
  expect(denseEmptyPageCount).toBe(0)
  expect(allIds).toEqual(["event-0", "event-1", "event-2", "event-3", "event-4"])
  expect(new Set(allIds).size).toBe(allIds.length)

  const sparsePages: string[][] = []
  cursor = null
  do {
    const page = await catalogPublishedPageGet(
      t,
      { query: "needle", location: "", category: "alle", timeWindow: "alle" },
      1,
      cursor,
    )
    sparsePages.push(page.page.map((event) => event.id))
    cursor = page.isDone ? null : page.continueCursor
  } while (cursor !== null)

  expect(sparsePages).toEqual([[], [], [], [], ["event-4"], []])
})

test("published page rejects a cursor after the filter changes", async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    for (let index = 0; index < 2; index += 1) {
      await ctx.db.insert(
        "catalogEvents",
        catalogEventInsert({
          eventKey: `event-${index}`,
          city: index === 0 ? "Berlin" : "Hamburg",
          startsAt: `2026-10-0${index + 1}T18:00:00.000Z`,
        }),
      )
    }
  })

  const firstPage = await catalogPublishedPageGet(
    t,
    { query: "", location: "", category: "alle", timeWindow: "alle" },
    1,
  )
  const staleCursorResult = await t.query(api.catalog.catalogEventListPublishedPageQuery, {
    filter: { query: "", location: "Hamburg", category: "alle", timeWindow: "alle" },
    paginationOpts: { numItems: 1, cursor: firstPage.continueCursor },
  })

  expect(staleCursorResult).toMatchObject({
    success: false,
    errorMessage: "Published catalog page cursor does not match the requested filter",
  })
})

test("published page rejects page sizes outside its bounded read tier", async () => {
  const t = convexTest(schema, modules)

  const result = await t.query(api.catalog.catalogEventListPublishedPageQuery, {
    filter: { query: "", location: "", category: "alle", timeWindow: "alle" },
    paginationOpts: { numItems: 51, cursor: null },
  })
  expect(result).toMatchObject({ success: false, errorMessage: "numItems must be an integer from 1 to 50" })
})

test("published page keeps oversized events visible without misrepresenting a tier prefix as complete", async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    const eventId = await ctx.db.insert("catalogEvents", catalogEventInsert())
    for (let index = 0; index < 51; index += 1) {
      await ctx.db.insert(
        "catalogTicketTiers",
        catalogTierInsert(eventId, { tierKey: `tier-${index}`, priceCents: index === 50 ? 100 : 2500 }),
      )
    }
    const nextEventId = await ctx.db.insert(
      "catalogEvents",
      catalogEventInsert({ eventKey: "next-event", startsAt: "2026-10-02T18:00:00.000Z" }),
    )
    await ctx.db.insert("catalogTicketTiers", catalogTierInsert(nextEventId))
  })

  const page = await catalogPublishedPageGet(t, { query: "", location: "", category: "alle", timeWindow: "alle" }, 10)
  expect(page.page).toMatchObject([
    { id: "catalog-event", tiersComplete: false, soldOut: false, tiers: [] },
    { id: "next-event", tiers: [{ id: "standard" }] },
  ])
})

test("published tier cursor pages return every active tier after 50 without exposing drafts or archived tiers", async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    const eventId = await ctx.db.insert("catalogEvents", catalogEventInsert())
    const draftId = await ctx.db.insert("catalogEvents", catalogEventInsert({ eventKey: "draft", status: "draft" }))
    await ctx.db.insert("catalogTicketTiers", catalogTierInsert(draftId))
    for (let index = 0; index < 121; index += 1) {
      await ctx.db.insert(
        "catalogTicketTiers",
        catalogTierInsert(eventId, {
          tierKey: `tier-${String(index).padStart(3, "0")}`,
          sortOrder: 120 - index,
        }),
      )
    }
    await ctx.db.insert(
      "catalogTicketTiers",
      catalogTierInsert(eventId, { tierKey: "archived", archivedAt: "2026-09-02" }),
    )
  })

  const summary = await t.query(api.catalog.catalogEventGetPublishedSummaryQuery, { eventKey: "catalog-event" })
  expect(summary).toMatchObject({ id: "catalog-event", tiers: [], tiersComplete: false })
  expect(await t.query(api.catalog.catalogEventGetPublishedSummaryQuery, { eventKey: "draft" })).toBeNull()
  const ids: string[] = []
  let cursor: string | null = null
  const sizes: number[] = []
  do {
    const result = await t.query(api.catalog.catalogEventTierListPublishedPageQuery, {
      eventKey: "catalog-event",
      paginationOpts: { numItems: 50, cursor },
    })
    if (!result.success || !result.data) throw new Error("Expected a published tier page")
    sizes.push(result.data.page.length)
    ids.push(...result.data.page.map((tier) => tier.id))
    cursor = result.data.isDone ? null : result.data.continueCursor
  } while (cursor !== null)
  expect(sizes).toEqual([50, 50, 21])
  expect(ids.toSorted()).toEqual(Array.from({ length: 121 }, (_, index) => `tier-${String(index).padStart(3, "0")}`))
  expect(new Set(ids).size).toBe(121)
  expect(
    await t.query(api.catalog.catalogEventTierListPublishedPageQuery, {
      eventKey: "draft",
      paginationOpts: { numItems: 50, cursor: null },
    }),
  ).toMatchObject({ success: true, data: null })
  await expect(t.query(api.catalog.catalogEventGetPublishedQuery, { eventKey: "catalog-event" })).rejects.toThrow(
    "Published event catalog-event exceeds the legacy detail limit of 50 active tiers; use tier pages",
  )
})

test("published tier page rejects requests exceeding its read limit", async () => {
  const t = convexTest(schema, modules)
  const result = await t.query(api.catalog.catalogEventTierListPublishedPageQuery, {
    eventKey: "catalog-event",
    paginationOpts: { numItems: 51, cursor: null },
  })

  expect(result).toMatchObject({ success: false, errorMessage: "numItems must be an integer from 1 to 50" })
})

test("tier capacity cannot undercut reserved and sold inventory", async () => {
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const token = await tokenFor(t, adminId)

  await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token, "draft"))
  await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    eventKey: "catalog-event",
    tierKey: "standard",
    name: "Standard",
    description: "Freie Platzwahl",
    startsAt: "2026-10-01T18:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    priceCents: 2500,
    feeCents: 250,
    capacity: 10,
    token,
  })

  const tierIds = await t.run(async (ctx) => {
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", "catalog-event"))
      .unique()
    if (!event) return null
    const tier = await ctx.db
      .query("catalogTicketTiers")
      .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id).eq("tierKey", "standard"))
      .unique()
    if (!tier) return null
    return tier._id
  })
  expect(tierIds).not.toBeNull()
  if (!tierIds) return
  await t.run(async (ctx) => ctx.db.patch("catalogTicketTiers", tierIds, { reserved: 2, sold: 1 }))

  const rejected = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    eventKey: "catalog-event",
    tierKey: "standard",
    name: "Standard",
    description: "Freie Platzwahl",
    startsAt: "2026-10-01T18:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    priceCents: 2500,
    feeCents: 250,
    capacity: 2,
    token,
  })
  const accepted = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    eventKey: "catalog-event",
    tierKey: "standard",
    name: "Standard",
    description: "Freie Platzwahl",
    startsAt: "2026-10-01T18:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    priceCents: 2500,
    feeCents: 250,
    capacity: 4,
    token,
  })

  expect(rejected.success).toBe(false)
  expect(accepted.success).toBe(true)
})

const invalidDateOrderCases = [
  { name: "reversed 19:00/18:00", startsAt: "2026-10-01T19:00:00Z", endsAt: "2026-10-01T18:00:00Z" },
  { name: "equal", startsAt: "2026-10-01T19:00:00Z", endsAt: "2026-10-01T19:00:00Z" },
  { name: "reversed offset instants", startsAt: "2026-10-01T18:00:00Z", endsAt: "2026-10-01T19:00:00+02:00" },
  { name: "equal offset instants", startsAt: "2026-10-01T19:00:00+02:00", endsAt: "2026-10-01T17:00:00Z" },
  { name: "invalid start", startsAt: "invalid", endsAt: "2026-10-01T19:00:00Z" },
  { name: "invalid end", startsAt: "2026-10-01T19:00:00Z", endsAt: "invalid" },
]

async function catalogWriteStateGet(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => ({
    events: await ctx.db.query("catalogEvents").collect(),
    tiers: await ctx.db.query("catalogTicketTiers").collect(),
    syncStates: await ctx.db.query("catalogSyncStates").collect(),
    snapshots: await ctx.db.query("catalogSyncSnapshots").collect(),
    scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
  }))
}

test.each(invalidDateOrderCases)(
  "event and tier upserts reject $name without inserts, updates, revisions or sync writes",
  async ({ startsAt, endsAt }) => {
    vi.useFakeTimers()
    const t = convexTest(schema, modules)
    const token = await tokenFor(t, await createUser(t, "admin"))
    expect((await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token, "draft"))).success).toBe(true)
    const tierArgs = {
      eventKey: "catalog-event",
      tierKey: "standard",
      name: "Standard",
      description: "",
      startsAt: "2026-10-01T18:00:00Z",
      endsAt: "2026-10-01T22:00:00Z",
      doorsAt: "",
      priceCents: 100,
      feeCents: 0,
      capacity: 10,
      token,
    }
    expect((await t.mutation(api.catalog.catalogTicketTierUpsertMutation, tierArgs)).success).toBe(true)
    const before = await catalogWriteStateGet(t)
    for (const tierKey of ["standard", "new-tier"]) {
      const result = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
        ...tierArgs,
        tierKey,
        startsAt,
        endsAt,
      })
      expect(result).toMatchObject({ success: false, op: "catalogTicketTierUpsertMutation" })
      if (startsAt !== "invalid" && endsAt !== "invalid")
        expect(result).toMatchObject({ errorMessage: "End time must be after start time" })
      expect(await catalogWriteStateGet(t)).toEqual(before)
    }
    for (const eventKey of ["catalog-event", "new-event"]) {
      const result = await t.mutation(api.catalog.catalogEventUpsertMutation, {
        ...eventArgs(token, "draft"),
        eventKey,
        startsAt,
        endsAt,
      })
      expect(result).toMatchObject({ success: false, op: "catalogEventUpsertMutation" })
      if (startsAt !== "invalid" && endsAt !== "invalid")
        expect(result).toMatchObject({ errorMessage: "End time must be after start time" })
      expect(await catalogWriteStateGet(t)).toEqual(before)
    }
  },
)

test.each([
  { name: "valid offset instants", startsAt: "2026-10-01T19:00:00+02:00", endsAt: "2026-10-01T18:00:00Z" },
  { name: "valid overnight", startsAt: "2026-10-01T22:00:00Z", endsAt: "2026-10-02T01:00:00Z" },
])("event and tier upserts accept $name with independent product and doors times", async ({ startsAt, endsAt }) => {
  const t = convexTest(schema, modules)
  const token = await tokenFor(t, await createUser(t, "admin"))
  expect(
    (
      await t.mutation(api.catalog.catalogEventUpsertMutation, {
        ...eventArgs(token, "draft"),
        startsAt: "2026-10-03T18:00:00Z",
        endsAt: "2026-10-03T22:00:00Z",
      })
    ).success,
  ).toBe(true)
  const doorsAt = "2027-10-01T18:00:00Z"
  const tier = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    eventKey: "catalog-event",
    tierKey: "standard",
    name: "Standard",
    description: "",
    startsAt,
    endsAt,
    doorsAt,
    priceCents: 100,
    feeCents: 0,
    capacity: 10,
    token,
  })
  expect(tier).toMatchObject({ success: true, data: { eventRevision: 2 } })
  const event = await t.mutation(api.catalog.catalogEventUpsertMutation, {
    ...eventArgs(token, "draft"),
    startsAt,
    endsAt,
    doorsAt,
  })
  expect(event).toMatchObject({ success: true, data: { eventRevision: 3 } })
  const stored = await catalogWriteStateGet(t)
  expect(stored.events[0]).toMatchObject({ startsAt, endsAt, doorsAt })
  expect(stored.tiers[0]).toMatchObject({ startsAt, endsAt, doorsAt })
})

test.each([
  { name: "empty", startsAt: "", endsAt: "", doorsAt: "" },
  { name: "whitespace-only", startsAt: " ", endsAt: " ", doorsAt: " " },
  { name: "start-only", startsAt: "2026-10-01T19:00:00Z", endsAt: "", doorsAt: "" },
  { name: "end-only", startsAt: "", endsAt: "2026-10-01T19:00:00Z", doorsAt: "" },
  { name: "doors-only", startsAt: "", endsAt: "", doorsAt: "2026-10-01T19:00:00Z" },
])("event upsert preserves $name date drafts", async ({ startsAt, endsAt, doorsAt }) => {
  const t = convexTest(schema, modules)
  const token = await tokenFor(t, await createUser(t, "admin"))
  const result = await t.mutation(api.catalog.catalogEventUpsertMutation, {
    ...eventArgs(token, "draft"),
    startsAt,
    endsAt,
    doorsAt,
  })
  expect(result.success).toBe(true)
  expect(await t.run(async (ctx) => ctx.db.query("catalogEvents").first())).toMatchObject({ startsAt, endsAt, doorsAt })
})

test("invalid optional event doors time rejects an empty draft without writes or sync changes", async () => {
  const t = convexTest(schema, modules)
  const token = await tokenFor(t, await createUser(t, "admin"))
  const before = await catalogWriteStateGet(t)
  const result = await t.mutation(api.catalog.catalogEventUpsertMutation, {
    ...eventArgs(token, "draft"),
    startsAt: "",
    endsAt: "",
    doorsAt: "invalid",
  })
  expect(result).toMatchObject({
    success: false,
    op: "catalogEventUpsertMutation",
    errorMessage: "Admission time must be a valid date and time",
  })
  expect(await catalogWriteStateGet(t)).toEqual(before)
})
