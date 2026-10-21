/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "eventoren-auth-convex-test-secret"
process.env.AUTH_SECRET = authSecret
const now = "2026-10-20T00:00:00.000Z"

async function migrationUserInsert(
  t: ReturnType<typeof convexTest>,
  role: "customer" | "organizer" | "admin" = "customer",
): Promise<Id<"users">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: `migration test user ${role} ${Math.random().toString(36).slice(2)}`,
      role,
      createdAt: now,
      updatedAt: now,
    }),
  )
}

async function migrationOrgInsert(
  t: ReturnType<typeof convexTest>,
  handle: string,
): Promise<Id<"orgs">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("orgs", {
      orgHandle: handle,
      name: `Org ${handle}`,
      createdAt: now,
      updatedAt: now,
    }),
  )
}

async function migrationMemberInsert(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  orgId: Id<"orgs">,
  handle: string,
  options?: { role?: "member" | "guest"; organizerRole?: "inhaber" | "einlass" },
): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert("orgMembers", {
      userId,
      orgId,
      orgHandle: handle,
      role: options?.role ?? "member",
      ...(options?.organizerRole ? { organizerRole: options.organizerRole } : {}),
      invitedBy: userId,
      createdAt: now,
      updatedAt: now,
    })
  })
}

async function migrationConfigInsert(
  t: ReturnType<typeof convexTest>,
  orgId: Id<"orgs">,
  handle: string,
  options?: { kind?: "verein" | "schule"; withContracts?: boolean },
): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert("organizerDashboardOrganizations", {
      orgId,
      status: "pruefung",
      profile: { name: `Org ${handle}`, slug: handle, kind: options?.kind ?? "verein" },
      tax: { status: "regel", defaultRateBps: 1900 },
      fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
      ...(options?.withContracts === true
        ? { contracts: { termsAcceptedAt: now, dpaAcceptedAt: now } }
        : { contracts: {} }),
      configurationConfirmed: false,
      createdAt: now,
      updatedAt: now,
    })
  })
}

async function migrationEventInsert(
  t: ReturnType<typeof convexTest>,
  eventKey: string,
  options?: { orgId?: Id<"orgs">; startsAt?: string; deleted?: boolean },
): Promise<Id<"catalogEvents">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("catalogEvents", {
      eventKey,
      title: `Event ${eventKey}`,
      subtitle: "",
      description: "",
      category: "musik",
      startsAt: options?.startsAt ?? "2026-11-01T18:00:00.000Z",
      endsAt: "2026-11-01T22:00:00.000Z",
      doorsAt: "2026-11-01T17:00:00.000Z",
      venue: "Hall",
      city: "Berlin",
      address: "Street 1",
      organizer: "Legacy Organizer Display Name",
      imageUrl: "",
      imageAlt: "",
      tags: [],
      status: "published",
      ...(options?.orgId ? { orgId: options.orgId } : {}),
      ...(options?.deleted === true ? { deletedAt: now } : {}),
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    }),
  )
}

async function migrationOrderInsert(
  t: ReturnType<typeof convexTest>,
  eventKey: string,
  createdAt: string,
  options?: { orgId?: Id<"orgs">; status?: "reserved" | "paid"; keySuffix?: string },
): Promise<Id<"ticketOrders">> {
  const suffix = options?.keySuffix ?? Math.random().toString(36).slice(2)
  const status = options?.status ?? "reserved"
  return await t.run(async (ctx) =>
    ctx.db.insert("ticketOrders", {
      checkoutKey: `checkout-${eventKey}-${suffix}`,
      customerEmail: "buyer@example.test",
      contactSnapshotJson: JSON.stringify({ email: "buyer@example.test" }),
      eventKey,
      eventTitle: `Event ${eventKey}`,
      eventSubtitle: "",
      eventDescription: "",
      eventStartsAt: "2026-11-01T18:00:00.000Z",
      eventEndsAt: "2026-11-01T22:00:00.000Z",
      eventDoorsAt: "2026-11-01T17:00:00.000Z",
      venue: "Hall",
      city: "Berlin",
      address: "Street 1",
      organizer: "Legacy Organizer Display Name",
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      subtotalCents: 2500,
      feeCents: 250,
      totalCents: 2750,
      checkoutContextJson: "{}",
      ...(options?.orgId ? { orgId: options.orgId } : {}),
      paymentReference: `payment-${eventKey}-${suffix}`,
      stripeMode: "test",
      status,
      paymentStatus: status === "paid" ? "paid" : "pending",
      ...(status === "paid" ? { paidAt: now } : {}),
      reservationExpiresAt: Date.now() + 900_000,
      createdAt,
      updatedAt: now,
    }),
  )
}

async function migrationAuditCount(t: ReturnType<typeof convexTest>): Promise<number> {
  return await t.run(async (ctx) => (await ctx.db.query("organizerDashboardAudit").collect()).length)
}

test("denies migration endpoints for untrusted global organizers", async () => {
  const t = convexTest(schema, modules)
  const organizerId = await migrationUserInsert(t, "organizer")
  const token = await testAuthSessionTokenCreate(t, organizerId, authSecret)

  const planned = await t.query(api.organizerDashboardMigration.organizerDashboardMigrationPlanQuery, {
    token,
    paginationOpts: { numItems: 10, cursor: null },
  })
  expect(planned.success).toBe(false)

  const applied = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    { token, orgInits: [], eventAssignments: [], roleAssignments: [] },
  )
  expect(applied.success).toBe(false)

  const backfilled = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationBackfillMutation,
    { token, eventKey: "legacy-event" },
  )
  expect(backfilled.success).toBe(false)
})

test("plans only unowned events with ids and keys and without buyer PII", async () => {
  const t = convexTest(schema, modules)
  const adminId = await migrationUserInsert(t, "admin")
  const orgId = await migrationOrgInsert(t, "plan-org")
  await migrationEventInsert(t, "unowned-a", { startsAt: "2026-11-01T18:00:00.000Z" })
  await migrationEventInsert(t, "unowned-b", { startsAt: "2026-11-02T18:00:00.000Z" })
  await migrationEventInsert(t, "owned-c", { startsAt: "2026-11-03T18:00:00.000Z", orgId })
  await migrationEventInsert(t, "deleted-d", { startsAt: "2026-11-04T18:00:00.000Z", deleted: true })
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const first = await t.query(api.organizerDashboardMigration.organizerDashboardMigrationPlanQuery, {
    token,
    paginationOpts: { numItems: 1, cursor: null },
  })
  expect(first.success).toBe(true)
  if (!first.success) return
  expect(first.data.page).toHaveLength(1)
  expect(first.data.page[0]).toEqual({
    eventId: expect.any(String),
    eventKey: "unowned-a",
    title: "Event unowned-a",
    startsAt: "2026-11-01T18:00:00.000Z",
    status: "published",
  })
  expect(JSON.stringify(first.data)).not.toContain("buyer@example.test")
  expect(JSON.stringify(first.data)).not.toContain("Legacy Organizer Display Name")
  expect(first.data.isDone).toBe(false)

  const second = await t.query(api.organizerDashboardMigration.organizerDashboardMigrationPlanQuery, {
    token,
    paginationOpts: { numItems: 10, cursor: first.data.continueCursor },
  })
  expect(second.success).toBe(true)
  if (!second.success) return
  expect(second.data.page.map((item) => item.eventKey)).toEqual(["unowned-b"])
  expect(second.data.isDone).toBe(true)
})

test("explicit manifest assigns org init event and role while preserving ids and snapshots", async () => {
  const t = convexTest(schema, modules)
  const adminId = await migrationUserInsert(t, "admin")
  const memberId = await migrationUserInsert(t, "customer")
  const orgId = await migrationOrgInsert(t, "legacy-org")
  await migrationMemberInsert(t, memberId, orgId, "legacy-org")
  const eventId = await migrationEventInsert(t, "legacy-event")
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const applied = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [{ orgId, kind: "verein" }],
      eventAssignments: [{ eventKey: "legacy-event", orgId }],
      roleAssignments: [{ userId: memberId, orgId, role: "inhaber" }],
    },
  )
  expect(applied.success).toBe(true)
  if (!applied.success) return
  expect(applied.data).toEqual({ orgsInitialized: 1, eventsAssigned: 1, rolesAssigned: 1, scannerLinksApproved: 0 })

  const config = await t.run(async (ctx) =>
    ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("orgId", (q) => q.eq("orgId", orgId))
      .unique(),
  )
  expect(config?.status).toBe("pruefung")
  expect(config?.profile).toEqual({ name: "Org legacy-org", slug: "legacy-org", kind: "verein" })
  expect(config?.configurationConfirmed).toBe(false)
  expect(config?.bank).toBeUndefined()
  expect(config?.contracts).toEqual({})

  const event = await t.run(async (ctx) => ctx.db.get("catalogEvents", eventId))
  expect(event?._id).toEqual(eventId)
  expect(event?.orgId).toEqual(orgId)
  expect(event?.title).toBe("Event legacy-event")
  expect(event?.organizer).toBe("Legacy Organizer Display Name")

  const membership = await t.run(async (ctx) =>
    ctx.db
      .query("orgMembers")
      .withIndex("userIdOrgId", (q) => q.eq("userId", memberId).eq("orgId", orgId))
      .unique(),
  )
  expect(membership?.role).toBe("member")
  expect(membership?.organizerRole).toBe("inhaber")
})

test("invalid second assignment writes nothing at all", async () => {
  const t = convexTest(schema, modules)
  const adminId = await migrationUserInsert(t, "admin")
  const orgId = await migrationOrgInsert(t, "untouched-org")
  await migrationEventInsert(t, "untouched-event")
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)
  const auditsBefore = await migrationAuditCount(t)

  const applied = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [{ orgId, kind: "verein" }],
      eventAssignments: [{ eventKey: "untouched-event", orgId }],
      roleAssignments: [{ userId: adminId, orgId, role: "unbekannt" }],
    },
  )
  expect(applied.success).toBe(false)

  const config = await t.run(async (ctx) =>
    ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("orgId", (q) => q.eq("orgId", orgId))
      .unique(),
  )
  expect(config).toBeNull()
  const event = await t.run(async (ctx) =>
    ctx.db.query("catalogEvents").withIndex("eventKey", (q) => q.eq("eventKey", "untouched-event")).unique(),
  )
  expect(event?.orgId).toBeUndefined()
  expect(await migrationAuditCount(t)).toBe(auditsBefore)
})

test("never promotes members automatically and rejects assignments without membership", async () => {
  const t = convexTest(schema, modules)
  const adminId = await migrationUserInsert(t, "admin")
  const strangerId = await migrationUserInsert(t, "customer")
  const plainId = await migrationUserInsert(t, "customer")
  const orgId = await migrationOrgInsert(t, "nopromote-org")
  await migrationMemberInsert(t, plainId, orgId, "nopromote-org")
  await migrationEventInsert(t, "nopromote-event")
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const strangers = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [],
      eventAssignments: [],
      roleAssignments: [{ userId: strangerId, orgId, role: "einlass" }],
    },
  )
  expect(strangers.success).toBe(false)

  const auditsBeforeEventsOnly = await migrationAuditCount(t)
  const eventsOnly = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [],
      eventAssignments: [{ eventKey: "nopromote-event", orgId }],
      roleAssignments: [],
    },
  )
  expect(eventsOnly.success).toBe(false)
  const untouched = await t.run(async (ctx) =>
    ctx.db.query("catalogEvents").withIndex("eventKey", (q) => q.eq("eventKey", "nopromote-event")).unique(),
  )
  expect(untouched?.orgId).toBeUndefined()
  expect(await migrationAuditCount(t)).toBe(auditsBeforeEventsOnly)
  const membership = await t.run(async (ctx) =>
    ctx.db
      .query("orgMembers")
      .withIndex("userIdOrgId", (q) => q.eq("userId", plainId).eq("orgId", orgId))
      .unique(),
  )
  expect(membership?.organizerRole).toBeUndefined()
})

test("repeated identical manifests change nothing and write no duplicate audits", async () => {
  const t = convexTest(schema, modules)
  const adminId = await migrationUserInsert(t, "admin")
  const memberId = await migrationUserInsert(t, "customer")
  const orgId = await migrationOrgInsert(t, "idempotent-org")
  await migrationMemberInsert(t, memberId, orgId, "idempotent-org")
  await migrationEventInsert(t, "idempotent-event")
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)
  const manifest = {
    token,
    orgInits: [{ orgId, kind: "schule" }],
    eventAssignments: [{ eventKey: "idempotent-event", orgId }],
    // Event targets must keep an effective owner: granting "admin" alone
    // leaves the org ownerless and is rejected, so grant "inhaber" here.
    roleAssignments: [{ userId: memberId, orgId, role: "inhaber" as const }],
  }

  const first = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    manifest,
  )
  expect(first.success).toBe(true)
  const auditsAfterFirst = await migrationAuditCount(t)
  expect(auditsAfterFirst).toBe(3)

  const second = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    manifest,
  )
  expect(second.success).toBe(true)
  if (!second.success) return
  expect(second.data).toEqual({ orgsInitialized: 0, eventsAssigned: 0, rolesAssigned: 0, scannerLinksApproved: 0 })
  expect(await migrationAuditCount(t)).toBe(auditsAfterFirst)
})

test("never transfers events owned by a different organization", async () => {
  const t = convexTest(schema, modules)
  const adminId = await migrationUserInsert(t, "admin")
  const orgA = await migrationOrgInsert(t, "owner-a")
  const orgB = await migrationOrgInsert(t, "owner-b")
  await migrationEventInsert(t, "owned-event", { orgId: orgA })
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const applied = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [],
      eventAssignments: [{ eventKey: "owned-event", orgId: orgB }],
      roleAssignments: [],
    },
  )
  expect(applied.success).toBe(false)
  const event = await t.run(async (ctx) =>
    ctx.db.query("catalogEvents").withIndex("eventKey", (q) => q.eq("eventKey", "owned-event")).unique(),
  )
  expect(event?.orgId).toEqual(orgA)
})

test("rejects ambiguous duplicate memberships and duplicate configs", async () => {
  const t = convexTest(schema, modules)
  const adminId = await migrationUserInsert(t, "admin")
  const memberId = await migrationUserInsert(t, "customer")
  const orgId = await migrationOrgInsert(t, "dupe-org")
  await migrationMemberInsert(t, memberId, orgId, "dupe-org")
  await migrationMemberInsert(t, memberId, orgId, "dupe-org")
  await migrationEventInsert(t, "dupe-event")
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const applied = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [],
      eventAssignments: [{ eventKey: "dupe-event", orgId }],
      roleAssignments: [{ userId: memberId, orgId, role: "einlass" }],
    },
  )
  expect(applied.success).toBe(false)
  const event = await t.run(async (ctx) =>
    ctx.db.query("catalogEvents").withIndex("eventKey", (q) => q.eq("eventKey", "dupe-event")).unique(),
  )
  expect(event?.orgId).toBeUndefined()
})

test("blocks downgrading the last remaining owner of owned events", async () => {
  const t = convexTest(schema, modules)
  const adminId = await migrationUserInsert(t, "admin")
  const ownerId = await migrationUserInsert(t, "customer")
  const secondId = await migrationUserInsert(t, "customer")
  const orgId = await migrationOrgInsert(t, "owned-org")
  await migrationMemberInsert(t, ownerId, orgId, "owned-org", { organizerRole: "inhaber" })
  await migrationConfigInsert(t, orgId, "owned-org", { withContracts: true })
  await migrationEventInsert(t, "owned-by-org", { orgId })
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const blocked = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [],
      eventAssignments: [],
      roleAssignments: [{ userId: ownerId, orgId, role: "einlass" }],
    },
  )
  expect(blocked.success).toBe(false)
  const stillOwner = await t.run(async (ctx) =>
    ctx.db
      .query("orgMembers")
      .withIndex("userIdOrgId", (q) => q.eq("userId", ownerId).eq("orgId", orgId))
      .unique(),
  )
  expect(stillOwner?.organizerRole).toBe("inhaber")

  await migrationMemberInsert(t, secondId, orgId, "owned-org", { organizerRole: "inhaber" })
  const allowed = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [],
      eventAssignments: [],
      roleAssignments: [{ userId: ownerId, orgId, role: "einlass" }],
    },
  )
  expect(allowed.success).toBe(true)
})

test("legacy configs without accepted contracts cannot be activated", async () => {
  const t = convexTest(schema, modules)
  const adminId = await migrationUserInsert(t, "admin")
  const memberId = await migrationUserInsert(t, "customer")
  const orgId = await migrationOrgInsert(t, "legacy-contract-org")
  await migrationMemberInsert(t, memberId, orgId, "legacy-contract-org")
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const applied = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [{ orgId, kind: "verein" }],
      eventAssignments: [],
      roleAssignments: [],
    },
  )
  expect(applied.success).toBe(true)

  const approved = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminApproveMutation, {
    token,
    orgId,
  })
  expect(approved.success).toBe(false)
})

test("backfills order org snapshots across pages and repeats as noop", async () => {
  const t = convexTest(schema, modules)
  const adminId = await migrationUserInsert(t, "admin")
  const orgId = await migrationOrgInsert(t, "backfill-org")
  await migrationEventInsert(t, "backfill-event", { orgId })
  await migrationOrderInsert(t, "backfill-event", "2026-11-01T10:00:00.000Z", {
    status: "paid",
    keySuffix: "one",
  })
  await migrationOrderInsert(t, "backfill-event", "2026-11-01T11:00:00.000Z", { keySuffix: "two" })
  await migrationOrderInsert(t, "backfill-event", "2026-11-01T12:00:00.000Z", { keySuffix: "three" })
  await migrationOrderInsert(t, "backfill-event", "2026-11-01T13:00:00.000Z", { keySuffix: "four" })
  await migrationOrderInsert(t, "backfill-event", "2026-11-01T14:00:00.000Z", { keySuffix: "five" })
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)

  let cursor: string | undefined
  let changed = 0
  let scanned = 0
  let pages = 0
  let isDone = false
  while (!isDone) {
    const result = await t.mutation(
      api.organizerDashboardMigration.organizerDashboardMigrationBackfillMutation,
      { token, eventKey: "backfill-event", ...(cursor ? { cursor } : {}), pageSize: 2 },
    )
    expect(result.success).toBe(true)
    if (!result.success) return
    pages += 1
    scanned += result.data.scanned
    changed += result.data.changed
    cursor = result.data.cursor
    isDone = result.data.isDone
  }
  expect(pages).toBe(3)
  expect(scanned).toBe(5)
  expect(changed).toBe(5)

  const orders = await t.run(async (ctx) =>
    ctx.db
      .query("ticketOrders")
      .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", "backfill-event"))
      .collect(),
  )
  expect(orders).toHaveLength(5)
  for (const order of orders) {
    expect(order.orgId).toEqual(orgId)
    expect(order.eventTitle).toBe("Event backfill-event")
    expect(order.totalCents).toBe(2750)
  }
  const paid = orders.find((order) => order.status === "paid")
  expect(paid?.paymentStatus).toBe("paid")
  expect(paid?.paidAt).toBe(now)

  const rerun = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationBackfillMutation,
    { token, eventKey: "backfill-event", pageSize: 2 },
  )
  expect(rerun.success).toBe(true)
  if (!rerun.success) return
  expect(rerun.data.changed).toBe(0)
  expect(rerun.data.scanned).toBe(2)
  expect(rerun.data.isDone).toBe(false)
})

test("backfill rejects conflicting organization snapshots before page writes", async () => {
  const t = convexTest(schema, modules)
  const adminId = await migrationUserInsert(t, "admin")
  const orgId = await migrationOrgInsert(t, "conflict-org")
  const otherOrg = await migrationOrgInsert(t, "conflict-other")
  await migrationEventInsert(t, "conflict-event", { orgId })
  await migrationOrderInsert(t, "conflict-event", "2026-11-01T10:00:00.000Z", { keySuffix: "plain" })
  await migrationOrderInsert(t, "conflict-event", "2026-11-01T11:00:00.000Z", {
    orgId: otherOrg,
    keySuffix: "taken",
  })
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const backfilled = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationBackfillMutation,
    { token, eventKey: "conflict-event", pageSize: 10 },
  )
  expect(backfilled.success).toBe(false)

  const plain = await t.run(async (ctx) =>
    ctx.db
      .query("ticketOrders")
      .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", "conflict-event"))
      .collect(),
  )
  expect(plain.find((order) => order.checkoutKey.endsWith("plain"))?.orgId).toBeUndefined()
})

test("backfill requires an owned event", async () => {
  const t = convexTest(schema, modules)
  const adminId = await migrationUserInsert(t, "admin")
  await migrationEventInsert(t, "unowned-backfill-event")
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const backfilled = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationBackfillMutation,
    { token, eventKey: "unowned-backfill-event" },
  )
  expect(backfilled.success).toBe(false)
})
