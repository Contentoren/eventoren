/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import type { Doc, Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "migration-scanner-ownership-test-secret"
process.env.AUTH_SECRET = authSecret
const now = "2026-10-20T00:00:00.000Z"

type EventInsert = Omit<Doc<"catalogEvents">, "_id" | "_creationTime">

function eventInsert(eventKey: string): EventInsert {
  return {
    eventKey,
    title: `Event ${eventKey}`,
    subtitle: "",
    description: "",
    category: "musik",
    startsAt: "2026-11-01T18:00:00.000Z",
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
    catalogVersion: 1,
    createdAt: now,
    updatedAt: now,
  }
}

async function userInsert(
  t: ReturnType<typeof convexTest>,
  role: Doc<"users">["role"],
): Promise<Id<"users">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: `scanner ownership ${role} ${Math.random().toString(36).slice(2)}`,
      role,
      createdAt: now,
      updatedAt: now,
    }),
  )
}

async function orgInsert(t: ReturnType<typeof convexTest>, handle: string): Promise<Id<"orgs">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("orgs", { orgHandle: handle, name: `Org ${handle}`, createdAt: now, updatedAt: now }),
  )
}

async function memberInsert(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  orgId: Id<"orgs">,
  handle: string,
): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert("orgMembers", {
      userId,
      orgId,
      orgHandle: handle,
      role: "member",
      invitedBy: userId,
      createdAt: now,
      updatedAt: now,
    })
  })
}

async function ticketSeed(
  t: ReturnType<typeof convexTest>,
  eventKey: string,
  ticketCode: string,
  keySuffix = "one",
): Promise<void> {
  await t.run(async (ctx) => {
    const orderId = await ctx.db.insert("ticketOrders", {
      checkoutKey: `checkout-${eventKey}-${keySuffix}`,
      customerEmail: "buyer@example.test",
      customerGivenName: "Ada",
      customerFamilyName: "Lovelace",
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
      paymentReference: `payment-${eventKey}-${keySuffix}`,
      stripeMode: "test",
      status: "paid",
      paymentStatus: "paid",
      paidAt: now,
      reservationExpiresAt: Date.now(),
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("ticketIssued", {
      orderId,
      sequence: 1,
      code: ticketCode,
      eventKey,
      eventTitle: `Event ${eventKey}`,
      eventStartsAt: "2026-11-01T18:00:00.000Z",
      eventDoorsAt: "2026-11-01T17:00:00.000Z",
      venue: "Hall",
      city: "Berlin",
      address: "Street 1",
      tierKey: "standard",
      tierName: "Standard",
      priceCents: 2500,
      feeCents: 300,
      participantName: "Grace Hopper",
      issuedAt: now,
    })
  })
}

async function legacyLinkInsert(
  t: ReturnType<typeof convexTest>,
  code: string,
  eventKeys: string[],
  options?: { parentId?: Id<"scannerLinks">; expiresAt?: number },
): Promise<Id<"scannerLinks">> {
  return await t.run(async (ctx) => {
    const owner = await ctx.db.query("users").first()
    if (!owner) throw new Error("fixture user missing")
    // Legacy link: no eventOrgIds snapshot, as created before scope binding.
    return await ctx.db.insert("scannerLinks", {
      code,
      name: `Legacy ${code.slice(0, 8)}`,
      role: options?.parentId ? "helper" : "organizer",
      eventKeys,
      ...(options?.parentId ? { parentId: options.parentId } : { createdByUserId: owner._id }),
      expiresAt: options?.expiresAt ?? Date.now() + 86_400_000,
      createdAt: Date.now(),
    })
  })
}

async function linkSnapshot(
  t: ReturnType<typeof convexTest>,
  linkId: Id<"scannerLinks">,
): Promise<Record<string, string | null> | null> {
  const snapshot = await t.run(async (ctx) => (await ctx.db.get("scannerLinks", linkId))?.eventOrgIds)
  // Absent snapshots read back as undefined in the database and cross the
  // test-run boundary as null; normalize so assertions are exact.
  return (snapshot ?? null) as Record<string, string | null> | null
}

async function auditNotes(t: ReturnType<typeof convexTest>): Promise<string[]> {
  return await t.run(async (ctx) =>
    (await ctx.db.query("organizerDashboardAudit").collect()).map((entry) => entry.note ?? ""),
  )
}

test("event-only target without config and owner writes nothing", async () => {
  const t = convexTest(schema, modules)
  const adminId = await userInsert(t, "admin")
  const orgId = await orgInsert(t, "bare-org")
  await t.run(async (ctx) => ctx.db.insert("catalogEvents", eventInsert("bare-event")))
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)
  const auditsBefore = (await auditNotes(t)).length

  const applied = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    { token, orgInits: [], eventAssignments: [{ eventKey: "bare-event", orgId }], roleAssignments: [] },
  )
  expect(applied.success).toBe(false)

  const event = await t.run(async (ctx) =>
    ctx.db.query("catalogEvents").withIndex("eventKey", (q) => q.eq("eventKey", "bare-event")).unique(),
  )
  expect(event?.orgId).toBeUndefined()
  expect((await auditNotes(t)).length).toBe(auditsBefore)
})

test("init plus owner grant plus event assignment succeed in one chunk", async () => {
  const t = convexTest(schema, modules)
  const adminId = await userInsert(t, "admin")
  const memberId = await userInsert(t, "customer")
  const orgId = await orgInsert(t, "chunk-org")
  await memberInsert(t, memberId, orgId, "chunk-org")
  await t.run(async (ctx) => ctx.db.insert("catalogEvents", eventInsert("chunk-event")))
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const applied = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [{ orgId, kind: "verein" }],
      eventAssignments: [{ eventKey: "chunk-event", orgId }],
      roleAssignments: [{ userId: memberId, orgId, role: "inhaber" }],
    },
  )
  expect(applied.success).toBe(true)
  if (!applied.success) return
  expect(applied.data).toEqual({ orgsInitialized: 1, eventsAssigned: 1, rolesAssigned: 1, scannerLinksApproved: 0 })
})

test("stale Bearer [REDACTED] is denied after migration and explicit parent plus child reapproval restores it", async () => {
  const t = convexTest(schema, modules)
  const adminId = await userInsert(t, "admin")
  const memberId = await userInsert(t, "customer")
  const orgId = await orgInsert(t, "reapprove-org")
  await memberInsert(t, memberId, orgId, "reapprove-org")
  await t.run(async (ctx) => ctx.db.insert("catalogEvents", eventInsert("reapprove-event")))
  await ticketSeed(t, "reapprove-event", "TKT-REAPPROVE-A", "a")
  await ticketSeed(t, "reapprove-event", "TKT-REAPPROVE-B", "b")
  const parentCode = "aa".repeat(32)
  const helperCode = "bb".repeat(32)
  const pairExpiresAt = Date.now() + 86_400_000
  const parentId = await legacyLinkInsert(t, parentCode, ["reapprove-event"], { expiresAt: pairExpiresAt })
  const helperId = await legacyLinkInsert(t, helperCode, ["reapprove-event"], { parentId, expiresAt: pairExpiresAt })
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const assigned = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [{ orgId, kind: "verein" }],
      eventAssignments: [{ eventKey: "reapprove-event", orgId }],
      roleAssignments: [{ userId: memberId, orgId, role: "inhaber" }],
    },
  )
  expect(assigned.success).toBe(true)

  const staleParent = await t.mutation(api.scannerLinks.scannerLinkTicketCheckInMutation, {
    code: parentCode,
    eventKey: "reapprove-event",
    ticketCode: "TKT-REAPPROVE-A",
  })
  expect(staleParent.success).toBe(false)

  const staleHelper = await t.mutation(api.scannerLinks.scannerLinkTicketCheckInMutation, {
    code: helperCode,
    eventKey: "reapprove-event",
    ticketCode: "TKT-REAPPROVE-A",
  })
  expect(staleHelper.success).toBe(false)

  const staleList = await t.query(api.scannerLinks.scannerLinkEventListQuery, { code: parentCode })
  expect(staleList.success).toBe(true)
  if (!staleList.success) return
  expect(staleList.data.map((event) => event.eventKey)).not.toContain("reapprove-event")

  const auditsBeforeApproval = (await auditNotes(t)).length
  const approved = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [],
      eventAssignments: [],
      roleAssignments: [],
      scannerLinkApprovals: [
        { linkId: parentId, eventKey: "reapprove-event", orgId },
        { linkId: helperId, eventKey: "reapprove-event", orgId },
      ],
    },
  )
  expect(approved.success).toBe(true)
  if (!approved.success) return
  expect(approved.data).toEqual({ orgsInitialized: 0, eventsAssigned: 0, rolesAssigned: 0, scannerLinksApproved: 2 })
  expect(await linkSnapshot(t, parentId)).toEqual({ "reapprove-event": orgId })
  expect(await linkSnapshot(t, helperId)).toEqual({ "reapprove-event": orgId })
  expect((await auditNotes(t)).length).toBe(auditsBeforeApproval + 2)

  const restoredParent = await t.mutation(api.scannerLinks.scannerLinkTicketCheckInMutation, {
    code: parentCode,
    eventKey: "reapprove-event",
    ticketCode: "TKT-REAPPROVE-A",
  })
  expect(restoredParent.success).toBe(true)

  const restoredHelper = await t.mutation(api.scannerLinks.scannerLinkTicketCheckInMutation, {
    code: helperCode,
    eventKey: "reapprove-event",
    ticketCode: "TKT-REAPPROVE-B",
  })
  expect(restoredHelper.success).toBe(true)

  const repeat = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [],
      eventAssignments: [],
      roleAssignments: [],
      scannerLinkApprovals: [
        { linkId: parentId, eventKey: "reapprove-event", orgId },
        { linkId: helperId, eventKey: "reapprove-event", orgId },
      ],
    },
  )
  expect(repeat.success).toBe(true)
  if (!repeat.success) return
  expect(repeat.data).toEqual({ orgsInitialized: 0, eventsAssigned: 0, rolesAssigned: 0, scannerLinksApproved: 0 })
  expect((await auditNotes(t)).length).toBe(auditsBeforeApproval + 2)
})

test("helper approval without parent approval writes nothing", async () => {
  const t = convexTest(schema, modules)
  const adminId = await userInsert(t, "admin")
  const memberId = await userInsert(t, "customer")
  const orgId = await orgInsert(t, "child-org")
  await memberInsert(t, memberId, orgId, "child-org")
  await t.run(async (ctx) => ctx.db.insert("catalogEvents", eventInsert("child-event")))
  const parentCode = "cc".repeat(32)
  const helperCode = "dd".repeat(32)
  const pairExpiresAt = Date.now() + 86_400_000
  const parentId = await legacyLinkInsert(t, parentCode, ["child-event"], { expiresAt: pairExpiresAt })
  const helperId = await legacyLinkInsert(t, helperCode, ["child-event"], { parentId, expiresAt: pairExpiresAt })
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const assigned = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [{ orgId, kind: "verein" }],
      eventAssignments: [{ eventKey: "child-event", orgId }],
      roleAssignments: [{ userId: memberId, orgId, role: "inhaber" }],
    },
  )
  expect(assigned.success).toBe(true)
  const auditsBefore = (await auditNotes(t)).length

  const approved = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [],
      eventAssignments: [],
      roleAssignments: [],
      scannerLinkApprovals: [{ linkId: helperId, eventKey: "child-event", orgId }],
    },
  )
  expect(approved.success).toBe(false)
  expect(await linkSnapshot(t, helperId)).toBeNull()
  expect(await linkSnapshot(t, parentId)).toBeNull()
  expect((await auditNotes(t)).length).toBe(auditsBefore)
})

test("approval for a foreign organization and unknown link are rejected", async () => {
  const t = convexTest(schema, modules)
  const adminId = await userInsert(t, "admin")
  const memberId = await userInsert(t, "customer")
  const orgId = await orgInsert(t, "home-org")
  const foreignOrg = await orgInsert(t, "foreign-org")
  await memberInsert(t, memberId, orgId, "home-org")
  await t.run(async (ctx) => ctx.db.insert("catalogEvents", eventInsert("home-event")))
  const code = "ee".repeat(32)
  const linkId = await legacyLinkInsert(t, code, ["home-event"])
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const assigned = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [{ orgId, kind: "verein" }],
      eventAssignments: [{ eventKey: "home-event", orgId }],
      roleAssignments: [{ userId: memberId, orgId, role: "inhaber" }],
    },
  )
  expect(assigned.success).toBe(true)
  const auditsBefore = (await auditNotes(t)).length

  const foreign = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [],
      eventAssignments: [],
      roleAssignments: [],
      scannerLinkApprovals: [{ linkId, eventKey: "home-event", orgId: foreignOrg }],
    },
  )
  expect(foreign.success).toBe(false)
  expect(await linkSnapshot(t, linkId)).toBeNull()

  const missingLinkId = await t.run(async (ctx) => {
    const owner = await ctx.db.query("users").first()
    if (!owner) throw new Error("fixture user missing")
    const tempId = await ctx.db.insert("scannerLinks", {
      code: "00".repeat(32),
      name: "Temporary",
      role: "organizer",
      eventKeys: ["home-event"],
      createdByUserId: owner._id,
      expiresAt: Date.now() + 86_400_000,
      createdAt: Date.now(),
    })
    await ctx.db.delete(tempId)
    return tempId
  })
  const unknown = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [],
      eventAssignments: [],
      roleAssignments: [],
      scannerLinkApprovals: [{ linkId: missingLinkId, eventKey: "home-event", orgId }],
    },
  )
  expect(unknown.success).toBe(false)
  expect((await auditNotes(t)).length).toBe(auditsBefore)
})

test("new admin links for owned events work without migration approval", async () => {
  const t = convexTest(schema, modules)
  const adminId = await userInsert(t, "admin")
  const memberId = await userInsert(t, "customer")
  const orgId = await orgInsert(t, "fresh-org")
  await memberInsert(t, memberId, orgId, "fresh-org")
  await t.run(async (ctx) => ctx.db.insert("catalogEvents", eventInsert("fresh-event")))
  await ticketSeed(t, "fresh-event", "TKT-FRESH")
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const assigned = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [{ orgId, kind: "verein" }],
      eventAssignments: [{ eventKey: "fresh-event", orgId }],
      roleAssignments: [{ userId: memberId, orgId, role: "inhaber" }],
    },
  )
  expect(assigned.success).toBe(true)

  const created = await t.mutation(api.scannerLinks.scannerLinkAdminCreateMutation, {
    token,
    name: "Fresh door",
    eventKeys: ["fresh-event"],
    expiresAt: Date.now() + 86_400_000,
  })
  expect(created.success).toBe(true)
  if (!created.success) return
  const stored = await t.run(async (ctx) => ctx.db.get("scannerLinks", created.data.id))
  expect(stored?.eventOrgIds).toEqual({ "fresh-event": orgId })

  const checkIn = await t.mutation(api.scannerLinks.scannerLinkTicketCheckInMutation, {
    code: created.data.code,
    eventKey: "fresh-event",
    ticketCode: "TKT-FRESH",
  })
  expect(checkIn.success).toBe(true)
})

test("unowned legacy links keep working and audits never carry capability codes", async () => {
  const t = convexTest(schema, modules)
  const adminId = await userInsert(t, "admin")
  const memberId = await userInsert(t, "customer")
  const orgId = await orgInsert(t, "audit-org")
  await memberInsert(t, memberId, orgId, "audit-org")
  await t.run(async (ctx) => ctx.db.insert("catalogEvents", eventInsert("audit-event")))
  await ticketSeed(t, "audit-event", "TKT-AUDIT")
  const code = "ff".repeat(32)
  const linkId = await legacyLinkInsert(t, code, ["audit-event"])
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const before = await t.mutation(api.scannerLinks.scannerLinkTicketCheckInMutation, {
    code,
    eventKey: "audit-event",
    ticketCode: "TKT-AUDIT",
  })
  expect(before.success).toBe(true)

  const applied = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    {
      token,
      orgInits: [{ orgId, kind: "verein" }],
      eventAssignments: [{ eventKey: "audit-event", orgId }],
      roleAssignments: [{ userId: memberId, orgId, role: "inhaber" }],
      scannerLinkApprovals: [{ linkId, eventKey: "audit-event", orgId }],
    },
  )
  expect(applied.success).toBe(true)
  if (!applied.success) return
  expect(applied.data).toEqual({ orgsInitialized: 1, eventsAssigned: 1, rolesAssigned: 1, scannerLinksApproved: 1 })

  const notes = await auditNotes(t)
  expect(notes).toContain(`scanner-link:${linkId}:audit-event`)
  expect(notes.join("\n")).not.toContain(code)
})

test("more than 25 total operations are rejected before any write", async () => {
  const t = convexTest(schema, modules)
  const adminId = await userInsert(t, "admin")
  const orgId = await orgInsert(t, "bound-org")
  await t.run(async (ctx) => ctx.db.insert("catalogEvents", eventInsert("bound-event")))
  const linkId = await legacyLinkInsert(t, "ab".repeat(32), ["bound-event"])
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)
  const auditsBefore = (await auditNotes(t)).length

  // The count guard runs before any validation, so repeating one pair still
  // exceeds the bound without needing 26 distinct links.
  const approvals = Array.from({ length: 26 }, () => ({ linkId, eventKey: "bound-event", orgId }))
  const applied = await t.mutation(
    api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation,
    { token, orgInits: [], eventAssignments: [], roleAssignments: [], scannerLinkApprovals: approvals },
  )
  expect(applied.success).toBe(false)
  expect(await linkSnapshot(t, linkId)).toBeNull()
  expect((await auditNotes(t)).length).toBe(auditsBefore)
})
