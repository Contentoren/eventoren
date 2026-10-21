import { organizerContractDocuments } from "#src/organizer/dashboard/contracts/organizerContractDocuments.ts"
/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import * as v from "valibot"
import { api } from "../convex/_generated/api.js"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { organizerDashboardAdminConfigureSchema } from "../src/organizer/dashboard/admin/organizerDashboardAdminConfigureSchema.ts"
import { organizerDashboardOrganizationFeeSchema } from "../src/organizer/dashboard/model/organizerDashboardOrganizationFeeSchema.ts"
import { organizerDashboardOrganizationKindSchema } from "../src/organizer/dashboard/model/organizerDashboardOrganizationKindSchema.ts"
import { organizerDashboardOrganizationTaxSchema } from "../src/organizer/dashboard/model/organizerDashboardOrganizationTaxSchema.ts"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "eventoren-auth-convex-test-secret"
process.env.AUTH_SECRET = authSecret
const now = "2026-10-20T00:00:00.000Z"
const validIban = "DE89370400440532013000"

async function adminUserInsert(
  t: ReturnType<typeof convexTest>,
  role: "customer" | "admin" = "customer",
): Promise<Id<"users">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: `dashboard admin test user ${role}`,
      role,
      createdAt: now,
      updatedAt: now,
    }),
  )
}

async function adminOrgInsert(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  slug: string,
  options?: {
    organizerRole?: "inhaber" | "admin"
    status?: "pruefung" | "aktiv" | "gesperrt"
    withBank?: boolean
    configured?: boolean
  },
): Promise<{ orgId: Id<"orgs"> }> {
  const orgId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("orgs", {
      orgHandle: slug,
      name: `Org ${slug}`,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("orgMembers", {
      userId,
      orgId: id,
      orgHandle: slug,
      role: "member",
      organizerRole: options?.organizerRole ?? "inhaber",
      invitedBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("organizerDashboardOrganizations", {
      orgId: id,
      status: options?.status ?? "pruefung",
      profile: { name: `Org ${slug}`, slug, kind: "schule" },
      ...(options?.withBank ? { bank: { iban: validIban, holder: "Holder" } } : {}),
      tax: { status: "regel", defaultRateBps: 1900 },
      fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
      contracts: { termsAcceptedAt: now, dpaAcceptedAt: now },
      configurationConfirmed: options?.configured ?? false,
      createdAt: now,
      updatedAt: now,
    })
    return id
  })
  return { orgId }
}

test("canonical kind accepts schule and canonical tax/fee shapes validate", () => {
  expect(v.safeParse(organizerDashboardOrganizationKindSchema, "schule").success).toBe(true)
  expect(v.safeParse(organizerDashboardOrganizationKindSchema, "oeffentlich").success).toBe(false)
  expect(v.safeParse(organizerDashboardOrganizationKindSchema, "sonstige").success).toBe(false)
  expect(
    v.safeParse(organizerDashboardOrganizationTaxSchema, {
      status: "regel",
      defaultRateBps: 1900,
    }).success,
  ).toBe(true)
  expect(
    v.safeParse(organizerDashboardOrganizationTaxSchema, {
      status: "klein",
      defaultRateBps: 700,
    }).success,
  ).toBe(true)
  for (const status of ["regel", "klein"] as const) {
    for (const defaultRateBps of [700, 1900] as const)
      expect(v.safeParse(organizerDashboardOrganizationTaxSchema, { status, defaultRateBps }).success).toBe(true)
  }
  expect(v.safeParse(organizerDashboardOrganizationTaxSchema, { status: "regel", defaultRateBps: 900 }).success).toBe(
    false,
  )
  expect(v.safeParse(organizerDashboardOrganizationTaxSchema, { status: "offen", rate: 0 }).success).toBe(false)
  expect(
    v.safeParse(organizerDashboardOrganizationFeeSchema, {
      percentBps: 250,
      fixedCents: 99,
      payer: "veranstalter",
    }).success,
  ).toBe(true)
  expect(
    v.safeParse(organizerDashboardOrganizationFeeSchema, {
      percentBps: 10001,
      fixedCents: 0,
      payer: "kaeufer",
    }).success,
  ).toBe(false)
  expect(
    v.safeParse(organizerDashboardOrganizationFeeSchema, {
      percentBps: 12.5,
      fixedCents: 0,
      payer: "kaeufer",
    }).success,
  ).toBe(false)
  expect(
    v.safeParse(organizerDashboardOrganizationFeeSchema, {
      percentBps: 0,
      fixedCents: -1,
      payer: "kaeufer",
    }).success,
  ).toBe(false)
  expect(
    v.safeParse(organizerDashboardOrganizationFeeSchema, {
      percent: 5,
      approved: true,
    }).success,
  ).toBe(false)
})

test("denies admin APIs for org admins without a global admin role", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await adminUserInsert(t)
  const orgAdminId = await adminUserInsert(t)
  const { orgId } = await adminOrgInsert(t, ownerId, "org-admin-org")
  await t.run(async (ctx) =>
    ctx.db.insert("orgMembers", {
      userId: orgAdminId,
      orgId,
      orgHandle: "org-admin-org",
      role: "member",
      organizerRole: "admin",
      invitedBy: ownerId,
      createdAt: now,
      updatedAt: now,
    }),
  )
  const token = await testAuthSessionTokenCreate(t, orgAdminId, authSecret)

  const listed = await t.query(api.organizerDashboardAdmin.organizerDashboardAdminListQuery, {
    token,
    paginationOpts: { numItems: 10, cursor: null },
  })
  expect(listed.success).toBe(false)

  const detail = await t.query(api.organizerDashboardAdmin.organizerDashboardAdminDetailQuery, {
    token,
    orgId,
  })
  expect(detail.success).toBe(false)

  const configured = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token,
    orgId,
    tax: { status: "regel", defaultRateBps: 1900 },
    fee: { percentBps: 100, fixedCents: 0, payer: "kaeufer" },
  })
  expect(configured.success).toBe(false)

  const approved = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminApproveMutation, {
    token,
    orgId,
  })
  expect(approved.success).toBe(false)

  const blocked = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminBlockMutation, {
    token,
    orgId,
    reason: "Missbrauch",
  })
  expect(blocked.success).toBe(false)
})

test("lists organizations paginated with status filter and without bank data", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await adminUserInsert(t)
  const adminId = await adminUserInsert(t, "admin")
  await adminOrgInsert(t, ownerId, "wartend-org", { withBank: true })
  await adminOrgInsert(t, ownerId, "live-org", {
    status: "aktiv",
    withBank: true,
    configured: true,
  })
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const filtered = await t.query(api.organizerDashboardAdmin.organizerDashboardAdminListQuery, {
    token,
    paginationOpts: { numItems: 10, cursor: null },
    status: "pruefung",
  })
  expect(filtered.success).toBe(true)
  if (!filtered.success) return
  expect(filtered.data.page).toHaveLength(1)
  expect(filtered.data.page[0]).toMatchObject({ slug: "wartend-org", status: "pruefung" })
  expect(JSON.stringify(filtered.data.page)).not.toContain(validIban)

  const unfiltered = await t.query(api.organizerDashboardAdmin.organizerDashboardAdminListQuery, {
    token,
    paginationOpts: { numItems: 10, cursor: null },
  })
  expect(unfiltered.success).toBe(true)
  if (!unfiltered.success) return
  expect(unfiltered.data.page).toHaveLength(2)
  expect(unfiltered.data.isDone).toBe(true)

  const oversized = await t.query(api.organizerDashboardAdmin.organizerDashboardAdminListQuery, {
    token,
    paginationOpts: { numItems: 51, cursor: null },
  })
  expect(oversized.success).toBe(false)

  const badStatus = await t.query(api.organizerDashboardAdmin.organizerDashboardAdminListQuery, {
    token,
    paginationOpts: { numItems: 10, cursor: null },
    status: "unbekannt",
  })
  expect(badStatus.success).toBe(false)
})

test("shows full bank in admin detail and rejects invalid tax/fee configuration", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await adminUserInsert(t)
  const adminId = await adminUserInsert(t, "admin")
  const { orgId } = await adminOrgInsert(t, ownerId, "detail-org", { withBank: true })
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const detail = await t.query(api.organizerDashboardAdmin.organizerDashboardAdminDetailQuery, {
    token,
    orgId,
  })
  expect(detail.success).toBe(true)
  if (!detail.success) return
  expect(detail.data.bank).toMatchObject({ iban: validIban, holder: "Holder" })
  expect(detail.data.configurationConfirmed).toBe(false)

  const invalidRate = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token,
    orgId,
    tax: { status: "regel", defaultRateBps: 900 },
    fee: { percentBps: 100, fixedCents: 0, payer: "kaeufer" },
  })
  expect(invalidRate.success).toBe(false)

  const reducedRate = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token,
    orgId,
    tax: { status: "regel", defaultRateBps: 700 },
    fee: { percentBps: 100, fixedCents: 0, payer: "kaeufer" },
  })
  expect(reducedRate.success).toBe(true)

  const outOfBounds = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token,
    orgId,
    tax: { status: "klein", defaultRateBps: 700 },
    fee: { percentBps: 10001, fixedCents: 0, payer: "kaeufer" },
  })
  expect(outOfBounds.success).toBe(false)

  const badPayer = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token,
    orgId,
    tax: { status: "klein", defaultRateBps: 700 },
    fee: { percentBps: 100, fixedCents: 0, payer: "plattform" },
  })
  expect(badPayer.success).toBe(false)

  const spoofedConfigure = v.safeParse(organizerDashboardAdminConfigureSchema, {
    orgId: "org123",
    tax: { status: "klein", defaultRateBps: 700 },
    fee: { percentBps: 100, fixedCents: 0, payer: "kaeufer" },
    status: "aktiv",
  })
  expect(spoofedConfigure.success).toBe(false)
})

test("approves only with bank, contracts, and confirmed config, then context shows aktiv", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await adminUserInsert(t)
  const adminId = await adminUserInsert(t, "admin")
  const ownerToken = await testAuthSessionTokenCreate(t, ownerId, authSecret)
  const adminToken = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const created = await t.mutation(api.organizerDashboard.organizerDashboardOrganizationCreateMutation, {
    token: ownerToken,
    name: "Freigabe Org",
    slug: "freigabe-org",
    kind: "schule",
    termsRevision: organizerContractDocuments.terms.revision,
    dpaRevision: organizerContractDocuments.dpa.revision,
    termsAccepted: true,
    dpaAccepted: true,
  })
  expect(created.success).toBe(true)
  if (!created.success) return
  const orgId = created.data.orgId

  const earlyApprove = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminApproveMutation, {
    token: adminToken,
    orgId,
  })
  expect(earlyApprove.success).toBe(false)

  const configured = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token: adminToken,
    orgId,
    tax: { status: "klein", defaultRateBps: 700 },
    fee: { percentBps: 250, fixedCents: 99, payer: "veranstalter" },
  })
  expect(configured.success).toBe(true)

  const withoutBank = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminApproveMutation, {
    token: adminToken,
    orgId,
  })
  expect(withoutBank.success).toBe(false)

  const bankAdded = await t.mutation(api.organizerDashboard.organizerDashboardOrganizationUpdateMutation, {
    token: ownerToken,
    orgId,
    iban: validIban,
    bankHolder: "Freigabe Org",
  })
  expect(bankAdded.success).toBe(true)

  const approved = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminApproveMutation, {
    token: adminToken,
    orgId,
  })
  expect(approved.success).toBe(true)

  const stored = await t.run(async (ctx) =>
    ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("orgId", (q) => q.eq("orgId", orgId))
      .unique(),
  )
  expect(stored?.status).toBe("aktiv")
  expect(stored?.configurationConfirmed).toBe(true)
  expect(typeof stored?.configuredAt).toBe("string")
  expect(stored?.tax).toMatchObject({ status: "klein", defaultRateBps: 700 })
  expect(stored?.fee).toMatchObject({ percentBps: 250, fixedCents: 99, payer: "veranstalter" })

  const context = await t.query(api.organizerDashboard.organizerDashboardContextQuery, {
    token: ownerToken,
    orgId,
  })
  expect(context.success).toBe(true)
  if (!context.success) return
  expect(context.data.activeOrganization?.status).toBe("aktiv")
})

test("blocks only with a reason, denies blocked orgs live, and unblocks explicitly", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await adminUserInsert(t)
  const adminId = await adminUserInsert(t, "admin")
  const { orgId } = await adminOrgInsert(t, ownerId, "sperr-org", {
    status: "aktiv",
    withBank: true,
    configured: true,
  })
  const ownerToken = await testAuthSessionTokenCreate(t, ownerId, authSecret)
  const adminToken = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const emptyReason = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminBlockMutation, {
    token: adminToken,
    orgId,
    reason: "   ",
  })
  expect(emptyReason.success).toBe(false)

  const blocked = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminBlockMutation, {
    token: adminToken,
    orgId,
    reason: "Verdacht auf Missbrauch",
  })
  expect(blocked.success).toBe(true)

  const stored = await t.run(async (ctx) =>
    ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("orgId", (q) => q.eq("orgId", orgId))
      .unique(),
  )
  expect(stored?.status).toBe("gesperrt")
  expect(stored?.blockReason).toBe("Verdacht auf Missbrauch")

  const denied = await t.query(api.organizerDashboard.organizerDashboardContextQuery, {
    token: ownerToken,
    orgId,
  })
  expect(denied.success).toBe(false)

  const backToBlocked = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminUnblockMutation, {
    token: adminToken,
    orgId,
    status: "gesperrt",
  })
  expect(backToBlocked.success).toBe(false)

  const unblocked = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminUnblockMutation, {
    token: adminToken,
    orgId,
    status: "pruefung",
  })
  expect(unblocked.success).toBe(true)

  const restored = await t.run(async (ctx) =>
    ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("orgId", (q) => q.eq("orgId", orgId))
      .unique(),
  )
  expect(restored?.status).toBe("pruefung")
  expect(restored?.blockReason).toBeUndefined()
})

test("refuses unblock to aktiv without activation readiness", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await adminUserInsert(t)
  const adminId = await adminUserInsert(t, "admin")
  const { orgId } = await adminOrgInsert(t, ownerId, "bereit-org")
  const adminToken = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const blocked = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminBlockMutation, {
    token: adminToken,
    orgId,
    reason: "Pruefung",
  })
  expect(blocked.success).toBe(true)

  const directAktiv = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminUnblockMutation, {
    token: adminToken,
    orgId,
    status: "aktiv",
  })
  expect(directAktiv.success).toBe(false)

  const missingStatus = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminUnblockMutation, {
    token: adminToken,
    orgId,
    status: "unbekannt",
  })
  expect(missingStatus.success).toBe(false)
})

test("audits admin operations without bank secrets", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await adminUserInsert(t)
  const adminId = await adminUserInsert(t, "admin")
  const { orgId } = await adminOrgInsert(t, ownerId, "audit-org", { withBank: true })
  const adminToken = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const configured = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token: adminToken,
    orgId,
    tax: { status: "regel", defaultRateBps: 1900 },
    fee: { percentBps: 100, fixedCents: 0, payer: "kaeufer" },
  })
  expect(configured.success).toBe(true)

  const blocked = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminBlockMutation, {
    token: adminToken,
    orgId,
    reason: "Auditgrund",
  })
  expect(blocked.success).toBe(true)

  const entries = await t.run(async (ctx) =>
    ctx.db
      .query("organizerDashboardAudit")
      .withIndex("orgIdAt", (q) => q.eq("orgId", orgId))
      .take(10),
  )
  expect(entries).toHaveLength(2)
  expect(entries[0]).toMatchObject({
    orgId,
    actorUserId: adminId,
    area: "configuration",
    action: "configured",
  })
  expect(entries[1]).toMatchObject({
    orgId,
    actorUserId: adminId,
    area: "status",
    action: "blocked",
  })
  expect(typeof entries[0]?.at).toBe("string")
  expect(JSON.stringify(entries)).not.toContain(validIban)
})
