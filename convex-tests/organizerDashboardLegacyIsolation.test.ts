import { organizerContractDocuments } from "#src/organizer/dashboard/contracts/organizerContractDocuments.ts"
/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import type { Doc, Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "organizer-dashboard-legacy-isolation-test-secret"
process.env.AUTH_SECRET = authSecret

const outsiderInvite = "2026-09-01T12:00:00.000Z"
const ownerInvite = "2026-09-15T12:00:00.000Z"
const eventStartsAt = "2026-10-01T18:00:00.000Z"
const now = "2026-09-20T00:00:00.000Z"

type EventInsert = Omit<Doc<"catalogEvents">, "_id" | "_creationTime">
type OrderInsert = Omit<Doc<"ticketOrders">, "_id" | "_creationTime">
type TicketInsert = Omit<Doc<"ticketIssued">, "_id" | "_creationTime">

function eventInsert(eventKey: string, orgId?: Id<"orgs">): EventInsert {
  return {
    eventKey,
    title: eventKey,
    subtitle: "Legacy isolation test event",
    description: "Legacy isolation test event description",
    category: "konzerte",
    startsAt: eventStartsAt,
    endsAt: "2026-10-01T22:00:00.000Z",
    doorsAt: "2026-10-01T17:30:00.000Z",
    venue: "Test hall",
    city: "Berlin",
    address: "Test street 1",
    organizer: "Eventoren",
    imageUrl: `/images/${eventKey}.webp`,
    imageAlt: `${eventKey} image`,
    tags: [],
    status: "published",
    ...(orgId !== undefined ? { orgId } : {}),
    catalogVersion: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  }
}

function paidOrderInsert(eventKey: string, checkoutKey: string): OrderInsert {
  return {
    checkoutKey,
    customerEmail: "buyer@example.com",
    customerGivenName: "Ada",
    customerFamilyName: "Lovelace",
    contactSnapshotJson: JSON.stringify({ email: "buyer@example.com", givenName: "Ada", familyName: "Lovelace" }),
    eventKey,
    eventTitle: eventKey,
    eventSubtitle: "Legacy isolation test event",
    eventDescription: "Legacy isolation test event description",
    eventStartsAt,
    eventEndsAt: "2026-10-01T22:00:00.000Z",
    eventDoorsAt: "2026-10-01T17:30:00.000Z",
    venue: "Test hall",
    city: "Berlin",
    address: "Test street 1",
    organizer: "Eventoren",
    imageUrl: `/images/${eventKey}.webp`,
    imageAlt: `${eventKey} image`,
    catalogVersion: 1,
    subtotalCents: 2_500,
    feeCents: 300,
    totalCents: 2_800,
    checkoutContextJson: "{}",
    paymentReference: `${checkoutKey}-payment`,
    stripeMode: "test",
    status: "paid",
    paymentStatus: "paid",
    reservationExpiresAt: Date.now(),
    createdAt: now,
    updatedAt: now,
    paidAt: now,
  }
}

function ticketInsert(orderId: Id<"ticketOrders">, eventKey: string, code: string): TicketInsert {
  return {
    orderId,
    sequence: 1,
    code,
    eventKey,
    eventTitle: eventKey,
    eventStartsAt,
    eventDoorsAt: "2026-10-01T17:30:00.000Z",
    venue: "Test hall",
    city: "Berlin",
    address: "Test street 1",
    tierKey: "standard",
    tierName: "Standard",
    priceCents: 2_500,
    feeCents: 300,
    participantName: "Grace Hopper",
    issuedAt: now,
  }
}

async function userInsert(
  t: ReturnType<typeof convexTest>,
  name: string,
  role: Doc<"users">["role"],
  organizerInvitedAt?: string,
): Promise<Id<"users">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name,
      role,
      ...(organizerInvitedAt !== undefined ? { organizerInvitedAt } : {}),
      createdAt: now,
      updatedAt: now,
    }),
  )
}

async function memberInsert(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  orgId: Id<"orgs">,
  orgHandle: string,
  organizerRole: "inhaber" | "admin" | "eventmanager" | "finanzen" | "einlass",
): Promise<void> {
  await t.run(async (ctx) =>
    ctx.db.insert("orgMembers", {
      userId,
      orgId,
      orgHandle,
      role: "member",
      organizerRole,
      invitedBy: userId,
      createdAt: now,
      updatedAt: now,
    }),
  )
}

async function orgCreate(
  t: ReturnType<typeof convexTest>,
  token: string,
  name: string,
  slug: string,
): Promise<Id<"orgs">> {
  const created = await t.mutation(api.organizerDashboard.organizerDashboardOrganizationCreateMutation, {
    token,
    name,
    slug,
    kind: "verein",
    termsRevision: organizerContractDocuments.terms.revision,
    dpaRevision: organizerContractDocuments.dpa.revision,
    termsAccepted: true,
    dpaAccepted: true,
  })
  if (!created.success) throw new Error(created.errorMessage)
  return created.data.orgId
}

async function seed() {
  const t = convexTest(schema, modules)
  const ownerId = await userInsert(t, "Owner Operator", "organizer", ownerInvite)
  const outsiderId = await userInsert(t, "Unrelated Organizer", "organizer", outsiderInvite)
  const financeId = await userInsert(t, "Finance Member", "organizer", ownerInvite)
  const customerMemberId = await userInsert(t, "Customer Member", "customer")
  const adminId = await userInsert(t, "Legacy Admin", "admin")
  const blockedOwnerId = await userInsert(t, "Blocked Owner", "organizer", ownerInvite)

  const ownerToken = await testAuthSessionTokenCreate(t, ownerId, authSecret)
  const outsiderToken = await testAuthSessionTokenCreate(t, outsiderId, authSecret)
  const financeToken = await testAuthSessionTokenCreate(t, financeId, authSecret)
  const customerMemberToken = await testAuthSessionTokenCreate(t, customerMemberId, authSecret)
  const adminToken = await testAuthSessionTokenCreate(t, adminId, authSecret)
  const blockedOwnerToken = await testAuthSessionTokenCreate(t, blockedOwnerId, authSecret)

  const orgId = await orgCreate(t, ownerToken, "Isolation Org", "legacy-isolation-org")
  await memberInsert(t, financeId, orgId, "legacy-isolation-org", "finanzen")
  await memberInsert(t, customerMemberId, orgId, "legacy-isolation-org", "inhaber")

  const blockedOrgId = await orgCreate(t, blockedOwnerToken, "Blocked Org", "legacy-isolation-blocked")
  await t.run(async (ctx) => {
    const blocked = await ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("orgId", (q) => q.eq("orgId", blockedOrgId))
      .unique()
    if (!blocked) throw new Error("Blocked test organization was not found")
    await ctx.db.patch(blocked._id, { status: "gesperrt" })
  })

  const ids = await t.run(async (ctx) => {
    await ctx.db.insert("catalogEvents", eventInsert("owned-event", orgId))
    await ctx.db.insert("catalogEvents", eventInsert("unowned-event"))
    await ctx.db.insert("catalogEvents", eventInsert("blocked-event", blockedOrgId))
    const ownedOrderId = await ctx.db.insert(
      "ticketOrders",
      paidOrderInsert("owned-event", "owned-order"),
    )
    const unownedOrderId = await ctx.db.insert(
      "ticketOrders",
      paidOrderInsert("unowned-event", "unowned-order"),
    )
    const ownedTicketId = await ctx.db.insert("ticketIssued", {
      ...ticketInsert(ownedOrderId, "owned-event", "TKT-OWNED"),
    })
    const unownedTicketId = await ctx.db.insert("ticketIssued", {
      ...ticketInsert(unownedOrderId, "unowned-event", "TKT-UNOWNED"),
    })
    return { ownedTicketId, unownedTicketId }
  })

  return {
    t,
    ids,
    orgId,
    blockedOrgId,
    tokens: { ownerToken, outsiderToken, financeToken, customerMemberToken, adminToken, blockedOwnerToken },
  }
}

function eventKeys(page: { eventKey: string }[]): string[] {
  return page.map((event) => event.eventKey)
}

test("owner sees owned events while an earlier-invited global organizer stays isolated", async () => {
  const { t, tokens } = await seed()

  const ownerList = await t.query(api.organizer.organizerEventListQuery, {
    token: tokens.ownerToken,
    paginationOpts: { numItems: 50, cursor: null },
  })
  expect(ownerList.success).toBe(true)
  if (!ownerList.success) return
  expect(eventKeys(ownerList.data.page)).toContain("owned-event")

  const ownerGet = await t.query(api.organizer.organizerEventGetQuery, {
    eventKey: "owned-event",
    token: tokens.ownerToken,
  })
  expect(ownerGet.success).toBe(true)

  const outsiderList = await t.query(api.organizer.organizerEventListQuery, {
    token: tokens.outsiderToken,
    paginationOpts: { numItems: 50, cursor: null },
  })
  expect(outsiderList.success).toBe(true)
  if (!outsiderList.success) return
  expect(eventKeys(outsiderList.data.page)).not.toContain("owned-event")
  expect(eventKeys(outsiderList.data.page)).toContain("unowned-event")

  const outsiderGet = await t.query(api.organizer.organizerEventGetQuery, {
    eventKey: "owned-event",
    token: tokens.outsiderToken,
  })
  expect(outsiderGet.success).toBe(false)

  const outsiderUnownedGet = await t.query(api.organizer.organizerEventGetQuery, {
    eventKey: "unowned-event",
    token: tokens.outsiderToken,
  })
  expect(outsiderUnownedGet.success).toBe(true)
})

test("global admin keeps legacy access to owned and blocked events", async () => {
  const { t, tokens } = await seed()

  for (const eventKey of ["owned-event", "unowned-event", "blocked-event"]) {
    const got = await t.query(api.organizer.organizerEventGetQuery, {
      eventKey,
      token: tokens.adminToken,
    })
    expect(got.success).toBe(true)
  }

  const list = await t.query(api.organizer.organizerEventListQuery, {
    token: tokens.adminToken,
    paginationOpts: { numItems: 50, cursor: null },
  })
  expect(list.success).toBe(true)
  if (!list.success) return
  expect(eventKeys(list.data.page)).toEqual(
    expect.arrayContaining(["owned-event", "unowned-event", "blocked-event"]),
  )
})

test("owned check-in requires org membership with einlass permission", async () => {
  const { t, tokens } = await seed()

  const ownerCheckIn = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: "owned-event",
    ticketCode: "TKT-OWNED",
    token: tokens.ownerToken,
  })
  expect(ownerCheckIn.success).toBe(true)

  const outsiderCheckIn = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: "owned-event",
    ticketCode: "TKT-OWNED",
    token: tokens.outsiderToken,
  })
  expect(outsiderCheckIn.success).toBe(false)
  if (!outsiderCheckIn.success) expect(outsiderCheckIn.code).toBe("organizer.check-in.unauthorized")

  const financeCheckIn = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: "owned-event",
    ticketCode: "TKT-OWNED",
    token: tokens.financeToken,
  })
  expect(financeCheckIn.success).toBe(false)
  if (!financeCheckIn.success) expect(financeCheckIn.code).toBe("organizer.check-in.unauthorized")

  const financeRead = await t.query(api.organizer.organizerEventTicketListQuery, {
    eventKey: "owned-event",
    token: tokens.financeToken,
    paginationOpts: { numItems: 50, cursor: null },
  })
  expect(financeRead.success).toBe(true)

  const outsiderLegacyCheckIn = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: "unowned-event",
    ticketCode: "TKT-UNOWNED",
    token: tokens.outsiderToken,
  })
  expect(outsiderLegacyCheckIn.success).toBe(true)
})

test("owned check-in reset requires einlass permission", async () => {
  const { t, tokens } = await seed()

  const checkedIn = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: "owned-event",
    ticketCode: "TKT-OWNED",
    token: tokens.ownerToken,
  })
  expect(checkedIn.success).toBe(true)

  const financeReset = await t.mutation(api.organizer.organizerTicketCheckInResetMutation, {
    eventKey: "owned-event",
    ticketCode: "TKT-OWNED",
    token: tokens.financeToken,
  })
  expect(financeReset.success).toBe(false)
  if (!financeReset.success) expect(financeReset.code).toBe("organizer.check-in.unauthorized")

  const ownerReset = await t.mutation(api.organizer.organizerTicketCheckInResetMutation, {
    eventKey: "owned-event",
    ticketCode: "TKT-OWNED",
    token: tokens.ownerToken,
  })
  expect(ownerReset.success).toBe(true)
})

test("blocked organization denies legacy access to its events", async () => {
  const { t, tokens } = await seed()

  const blockedGet = await t.query(api.organizer.organizerEventGetQuery, {
    eventKey: "blocked-event",
    token: tokens.blockedOwnerToken,
  })
  expect(blockedGet.success).toBe(false)

  const blockedList = await t.query(api.organizer.organizerEventListQuery, {
    token: tokens.blockedOwnerToken,
    paginationOpts: { numItems: 50, cursor: null },
  })
  expect(blockedList.success).toBe(true)
  if (!blockedList.success) return
  expect(eventKeys(blockedList.data.page)).not.toContain("blocked-event")
})

test("global customer with org membership is denied legacy access to owned events", async () => {
  const { t, tokens } = await seed()

  const customerGet = await t.query(api.organizer.organizerEventGetQuery, {
    eventKey: "owned-event",
    token: tokens.customerMemberToken,
  })
  expect(customerGet.success).toBe(false)

  const customerList = await t.query(api.organizer.organizerEventListQuery, {
    token: tokens.customerMemberToken,
    paginationOpts: { numItems: 50, cursor: null },
  })
  expect(customerList.success).toBe(false)
})

test("scanner bearer links still check in owned-event tickets within their scope", async () => {
  const { t, orgId } = await seed()

  const code = "ab".repeat(32)
  await t.run(async (ctx) => {
    const owner = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("name"), "Owner Operator"))
      .unique()
    if (!owner) throw new Error("Owner was not found")
    await ctx.db.insert("scannerLinks", {
      code,
      name: "Owned door link",
      role: "organizer",
      eventKeys: ["owned-event"],
      // Explicit ownership binding: owned events require a snapshot that
      // matches the canonical owner. Legacy links without a snapshot stop
      // working once their event becomes owned (see scanner ownership tests).
      eventOrgIds: { "owned-event": orgId },
      createdByUserId: owner._id,
      expiresAt: Date.now() + 86_400_000,
      createdAt: Date.now(),
    })
  })

  const permitted = await t.mutation(api.scannerLinks.scannerLinkTicketCheckInMutation, {
    code,
    eventKey: "owned-event",
    ticketCode: "TKT-OWNED",
  })
  expect(permitted.success).toBe(true)

  const outOfScope = await t.mutation(api.scannerLinks.scannerLinkTicketCheckInMutation, {
    code,
    eventKey: "unowned-event",
    ticketCode: "TKT-UNOWNED",
  })
  expect(outOfScope.success).toBe(false)
})

test("legacy scanner links without a snapshot still check in still-unowned events", async () => {
  const { t } = await seed()

  const code = "cd".repeat(32)
  await t.run(async (ctx) => {
    const owner = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("name"), "Owner Operator"))
      .unique()
    if (!owner) throw new Error("Owner was not found")
    await ctx.db.insert("scannerLinks", {
      code,
      name: "Legacy unowned door link",
      role: "organizer",
      eventKeys: ["unowned-event"],
      createdByUserId: owner._id,
      expiresAt: Date.now() + 86_400_000,
      createdAt: Date.now(),
    })
  })

  const permitted = await t.mutation(api.scannerLinks.scannerLinkTicketCheckInMutation, {
    code,
    eventKey: "unowned-event",
    ticketCode: "TKT-UNOWNED",
  })
  expect(permitted.success).toBe(true)
})
