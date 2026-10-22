import { organizerContractDocuments } from "#src/organizer/dashboard/contracts/organizerContractDocuments.ts"
/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import * as v from "valibot"
import { api } from "../convex/_generated/api.js"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { organizerDashboardOrganizationCreateSchema } from "../src/organizer/dashboard/model/organizerDashboardOrganizationCreateSchema.ts"
import { organizerDashboardOrganizationUpdateSchema } from "../src/organizer/dashboard/model/organizerDashboardOrganizationUpdateSchema.ts"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "eventoren-auth-convex-test-secret"
process.env.AUTH_SECRET = authSecret
const now = "2026-10-20T00:00:00.000Z"
const validIban = "DE89370400440532013000"

async function foundationUserInsert(
  t: ReturnType<typeof convexTest>,
  role: "customer" | "admin" | "organizer" = "customer",
): Promise<Id<"users">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: `dashboard foundation test user ${role}`,
      role,
      createdAt: now,
      updatedAt: now,
    }),
  )
}

async function foundationOrgInsert(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  slug: string,
  options?: {
    organizerRole?: "inhaber" | "admin" | "eventmanager" | "finanzen" | "einlass"
    status?: "pruefung" | "aktiv" | "gesperrt"
    withBank?: boolean
  },
): Promise<{ orgId: Id<"orgs"> }> {
  const organizerRole = options?.organizerRole === undefined ? "inhaber" : options.organizerRole
  const status = options?.status ?? "aktiv"
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
      ...(organizerRole === undefined ? {} : { organizerRole }),
      invitedBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("organizerDashboardOrganizations", {
      orgId: id,
      status,
      profile: { name: `Org ${slug}`, slug, kind: "verein" },
      ...(options?.withBank ? { bank: { iban: validIban, holder: "Holder" } } : {}),
      tax: { status: "regel", defaultRateBps: 1900 },
      fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
      configurationConfirmed: false,
      contracts: { termsAcceptedAt: now, dpaAcceptedAt: now },
      createdAt: now,
      updatedAt: now,
    })
    return id
  })
  return { orgId }
}

test("lists two organizations and selects the active org with permissions and public profile only", async () => {
  const t = convexTest(schema, modules)
  const userId = await foundationUserInsert(t)
  const first = await foundationOrgInsert(t, userId, "erste-org", { withBank: true })
  await foundationOrgInsert(t, userId, "zweite-org")
  const token = await testAuthSessionTokenCreate(t, userId, authSecret)

  const context = await t.query(api.organizerDashboard.organizerDashboardContextQuery, {
    token,
    orgId: first.orgId,
  })
  expect(context.success).toBe(true)
  if (!context.success) return
  expect(context.data.organizations).toHaveLength(2)
  expect(context.data.organizations[0]).toMatchObject({
    slug: "erste-org",
    role: "inhaber",
    status: "aktiv",
  })
  expect(context.data.activeOrganization).toMatchObject({
    slug: "erste-org",
    role: "inhaber",
    status: "aktiv",
    profile: { name: "Org erste-org", slug: "erste-org" },
  })
  expect(context.data.activeOrganization?.permissions).toContain("events.bearbeiten")
  expect(context.data.activeOrganization?.permissions).toContain("bank.bearbeiten")
  expect(JSON.stringify(context.data.activeOrganization)).not.toContain(validIban)
})

test("denies revoked sessions and deleted users without leaking organizations", async () => {
  const t = convexTest(schema, modules)
  const userId = await foundationUserInsert(t)
  await foundationOrgInsert(t, userId, "revoke-org")
  const token = await testAuthSessionTokenCreate(t, userId, authSecret)

  await t.run(async (ctx) => {
    const session = await ctx.db
      .query("authSessions")
      .withIndex("token", (q) => q.eq("token", token))
      .unique()
    if (session) await ctx.db.delete(session._id)
  })
  const revoked = await t.query(api.organizerDashboard.organizerDashboardContextQuery, { token })
  expect(revoked.success).toBe(false)

  const freshToken = await testAuthSessionTokenCreate(t, userId, authSecret)
  await t.run(async (ctx) => ctx.db.patch("users", userId, { deletedAt: now }))
  const deleted = await t.query(api.organizerDashboard.organizerDashboardContextQuery, {
    token: freshToken,
  })
  expect(deleted.success).toBe(false)
})

test("denies memberships without an explicit organizer role and grants admins no global bypass", async () => {
  const t = convexTest(schema, modules)
  const userId = await foundationUserInsert(t)
  const adminId = await foundationUserInsert(t, "admin")
  await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("orgs", {
      orgHandle: "legacy-org",
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("orgMembers", {
      userId,
      orgId,
      orgHandle: "legacy-org",
      role: "member",
      invitedBy: userId,
      createdAt: now,
      updatedAt: now,
    })
  })
  const token = await testAuthSessionTokenCreate(t, userId, authSecret)
  const context = await t.query(api.organizerDashboard.organizerDashboardContextQuery, { token })
  expect(context.success).toBe(true)
  if (!context.success) return
  expect(context.data.organizations).toHaveLength(0)
  expect(context.data.activeOrganization).toBeNull()

  const adminToken = await testAuthSessionTokenCreate(t, adminId, authSecret)
  const adminContext = await t.query(api.organizerDashboard.organizerDashboardContextQuery, {
    token: adminToken,
  })
  expect(adminContext.success).toBe(true)
  if (!adminContext.success) return
  expect(adminContext.data.organizations).toHaveLength(0)
  expect(adminContext.data.activeOrganization).toBeNull()
})

test("refuses a blocked organization explicitly and never falls back to another org", async () => {
  const t = convexTest(schema, modules)
  const userId = await foundationUserInsert(t)
  const blocked = await foundationOrgInsert(t, userId, "blocked-org", { status: "gesperrt" })
  const open = await foundationOrgInsert(t, userId, "open-org")
  const token = await testAuthSessionTokenCreate(t, userId, authSecret)

  const denied = await t.query(api.organizerDashboard.organizerDashboardContextQuery, {
    token,
    orgId: blocked.orgId,
  })
  expect(denied.success).toBe(false)

  const fallback = await t.query(api.organizerDashboard.organizerDashboardContextQuery, { token })
  expect(fallback.success).toBe(true)
  if (!fallback.success) return
  expect(fallback.data.organizations).toHaveLength(2)
  expect(fallback.data.activeOrganization?.id).toBe(open.orgId)
})

test("creates an organization with linked core org, config, and inhaber membership", async () => {
  const t = convexTest(schema, modules)
  const userId = await foundationUserInsert(t)
  const token = await testAuthSessionTokenCreate(t, userId, authSecret)

  const created = await t.mutation(api.organizerDashboard.organizerDashboardOrganizationCreateMutation, {
    token,
    name: "Neue Org",
    slug: "neue-org",
    kind: "verein",
    iban: validIban,
    bankHolder: "Neue Org e.V.",
    termsRevision: organizerContractDocuments.terms.revision,
    dpaRevision: organizerContractDocuments.dpa.revision,
    termsAccepted: true,
    dpaAccepted: true,
  })
  expect(created.success).toBe(true)
  if (!created.success) return

  const linked = await t.run(async (ctx) => {
    const org = await ctx.db.get("orgs", created.data.orgId)
    const membership = await ctx.db
      .query("orgMembers")
      .withIndex("userIdOrgId", (q) => q.eq("userId", userId).eq("orgId", created.data.orgId))
      .unique()
    const config = await ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("orgId", (q) => q.eq("orgId", created.data.orgId))
      .unique()
    return { org, membership, config }
  })
  expect(linked.org).toMatchObject({ orgHandle: "neue-org", name: "Neue Org" })
  expect(linked.membership).toMatchObject({ role: "member", organizerRole: "inhaber" })
  expect(linked.config).toMatchObject({
    status: "pruefung",
    profile: { name: "Neue Org", slug: "neue-org", kind: "verein" },
    bank: { iban: validIban, holder: "Neue Org e.V." },
    tax: { status: "regel", defaultRateBps: 1900 },
    fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
    configurationConfirmed: false,
  })
  expect(typeof linked.config?.contracts.termsAcceptedAt).toBe("string")
  expect(typeof linked.config?.contracts.dpaAcceptedAt).toBe("string")
})

test("rejects creation without terms, with duplicate slug, or with invalid IBAN and writes nothing", async () => {
  const t = convexTest(schema, modules)
  const userId = await foundationUserInsert(t)
  await foundationOrgInsert(t, userId, "belegt-org")
  const token = await testAuthSessionTokenCreate(t, userId, authSecret)
  const countOrgs = () => t.run(async (ctx) => (await ctx.db.query("orgs").take(1000)).length)
  const before = await countOrgs()

  const base = {
    token,
    name: "Abgelehnte Org",
    slug: "abgelehnte-org",
    kind: "verein",
    termsRevision: organizerContractDocuments.terms.revision,
    dpaRevision: organizerContractDocuments.dpa.revision,
    termsAccepted: true,
    dpaAccepted: true,
  } as const
  const noTerms = await t.mutation(api.organizerDashboard.organizerDashboardOrganizationCreateMutation, {
    ...base,
    termsAccepted: false,
  })
  expect(noTerms.success).toBe(false)
  const duplicate = await t.mutation(api.organizerDashboard.organizerDashboardOrganizationCreateMutation, {
    ...base,
    slug: "belegt-org",
  })
  expect(duplicate.success).toBe(false)
  const badIban = await t.mutation(api.organizerDashboard.organizerDashboardOrganizationCreateMutation, {
    ...base,
    slug: "iban-org",
    iban: "DE00123456789012345678",
    bankHolder: "Holder",
  })
  expect(badIban.success).toBe(false)
  expect(await countOrgs()).toBe(before)
})

test("rejects spoofed config fields at the schema boundary", () => {
  const spoofedCreate = v.safeParse(organizerDashboardOrganizationCreateSchema, {
    name: "Spoof",
    slug: "spoof-org",
    kind: "verein",
    termsRevision: organizerContractDocuments.terms.revision,
    dpaRevision: organizerContractDocuments.dpa.revision,
    termsAccepted: true,
    dpaAccepted: true,
    status: "aktiv",
    fee: { percentBps: 500, fixedCents: 0, payer: "kaeufer" },
    tax: { status: "klein", defaultRateBps: 700 },
    configurationConfirmed: true,
    termsAcceptedAt: now,
  })
  expect(spoofedCreate.success).toBe(false)

  const spoofedUpdate = v.safeParse(organizerDashboardOrganizationUpdateSchema, {
    orgId: "org123",
    profile: { name: "Spoof" },
    status: "aktiv",
    fee: { percentBps: 500, fixedCents: 0, payer: "kaeufer" },
    tax: { status: "klein", defaultRateBps: 700 },
    bank: { iban: validIban, holder: "Holder" },
  })
  expect(spoofedUpdate.success).toBe(false)

  const emptyUpdate = v.safeParse(organizerDashboardOrganizationUpdateSchema, { orgId: "org123" })
  expect(emptyUpdate.success).toBe(false)
})

test("lets owners edit profile and bank but blocks admin bank edits and failed writes", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await foundationUserInsert(t)
  const adminId = await foundationUserInsert(t)
  const { orgId } = await foundationOrgInsert(t, ownerId, "update-org", { withBank: true })
  await t.run(async (ctx) =>
    ctx.db.insert("orgMembers", {
      userId: adminId,
      orgId,
      orgHandle: "update-org",
      role: "member",
      organizerRole: "admin",
      invitedBy: ownerId,
      createdAt: now,
      updatedAt: now,
    }),
  )
  const ownerToken = await testAuthSessionTokenCreate(t, ownerId, authSecret)
  const adminToken = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const profileUpdated = await t.mutation(api.organizerDashboard.organizerDashboardOrganizationUpdateMutation, {
    token: ownerToken,
    orgId,
    name: "Aktualisierte Org",
    contactEmail: "hallo@example.org",
  })
  expect(profileUpdated.success).toBe(true)

  const adminBank = await t.mutation(api.organizerDashboard.organizerDashboardOrganizationUpdateMutation, {
    token: adminToken,
    orgId,
    iban: validIban,
    bankHolder: "Admin",
  })
  expect(adminBank.success).toBe(false)

  const ownerBank = await t.mutation(api.organizerDashboard.organizerDashboardOrganizationUpdateMutation, {
    token: ownerToken,
    orgId,
    iban: validIban,
    bankHolder: "Aktualisiert",
  })
  expect(ownerBank.success).toBe(true)

  const invalid = await t.mutation(api.organizerDashboard.organizerDashboardOrganizationUpdateMutation, {
    token: ownerToken,
    orgId,
    iban: "DE00123456789012345678",
    bankHolder: "Holder",
  })
  expect(invalid.success).toBe(false)

  const config = await t.run(async (ctx) =>
    ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("orgId", (q) => q.eq("orgId", orgId))
      .unique(),
  )
  expect(config?.profile.name).toBe("Aktualisierte Org")
  expect(config?.profile.contact?.email).toBe("hallo@example.org")
  expect(config?.bank?.holder).toBe("Aktualisiert")
  expect(config?.status).toBe("aktiv")
  expect(config?.fee).toMatchObject({ percentBps: 0, fixedCents: 0, payer: "kaeufer" })
})

test("requires pagination beyond one hundred memberships instead of truncating silently", async () => {
  const t = convexTest(schema, modules)
  const userId = await foundationUserInsert(t)
  await t.run(async (ctx) => {
    for (let index = 0; index < 101; index++) {
      const slug = `bulk-org-${index}`
      const orgId = await ctx.db.insert("orgs", {
        orgHandle: slug,
        createdAt: now,
        updatedAt: now,
      })
      await ctx.db.insert("orgMembers", {
        userId,
        orgId,
        orgHandle: slug,
        role: "member",
        organizerRole: "inhaber",
        invitedBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      await ctx.db.insert("organizerDashboardOrganizations", {
        orgId,
        status: "aktiv",
        profile: { name: slug, slug, kind: "verein" },
        tax: { status: "regel", defaultRateBps: 1900 },
        fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
        configurationConfirmed: false,
        contracts: { termsAcceptedAt: now, dpaAcceptedAt: now },
        createdAt: now,
        updatedAt: now,
      })
    }
  })
  const token = await testAuthSessionTokenCreate(t, userId, authSecret)
  const context = await t.query(api.organizerDashboard.organizerDashboardContextQuery, { token })
  expect(context.success).toBe(false)
  if (context.success) return
  expect(context.errorMessage).toMatch(/pagination/i)
})
