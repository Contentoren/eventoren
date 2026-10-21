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
const validIban = "DE89370400440532013000"

type OrganizerRole = "inhaber" | "admin" | "eventmanager" | "finanzen" | "einlass"

async function profileUserInsert(t: ReturnType<typeof convexTest>): Promise<Id<"users">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "profile permission test user",
      role: "customer",
      createdAt: now,
      updatedAt: now,
    }),
  )
}

async function profileOrgInsert(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  slug: string,
  options?: {
    organizerRole?: OrganizerRole
    status?: "pruefung" | "aktiv" | "gesperrt"
    withBank?: boolean
    legacyContracts?: boolean
  },
): Promise<{ orgId: Id<"orgs"> }> {
  const organizerRole = options?.organizerRole ?? "inhaber"
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
      organizerRole,
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
      fee: { percentBps: 250, fixedCents: 120, payer: "kaeufer" },
      configurationConfirmed: false,
      ...(options?.legacyContracts ? { contracts: {} } : { contracts: { termsAcceptedAt: now, dpaAcceptedAt: now } }),
      createdAt: now,
      updatedAt: now,
    })
    return id
  })
  return { orgId }
}

test("grants the inhaber the full profile including bank, fee, and tax", async () => {
  const t = convexTest(schema, modules)
  const userId = await profileUserInsert(t)
  const { orgId } = await profileOrgInsert(t, userId, "inhaber-org", { withBank: true })
  const token = await testAuthSessionTokenCreate(t, userId, authSecret)

  const profile = await t.query(api.organizerDashboardProfile.organizerDashboardOrganizationGetQuery, {
    token,
    orgId,
  })
  expect(profile.success).toBe(true)
  if (!profile.success) return
  expect(profile.data.profile).toMatchObject({ name: "Org inhaber-org", slug: "inhaber-org" })
  expect(profile.data.bank).toEqual({ iban: validIban, holder: "Holder" })
  expect(profile.data.fee).toEqual({ percentBps: 250, fixedCents: 120, payer: "kaeufer" })
  expect(profile.data.tax).toEqual({ status: "regel", defaultRateBps: 1900 })
  expect(profile.data.contracts).toEqual({ termsAccepted: true, dpaAccepted: true, current: false })
})

test("hides bank, fee, and tax from the eventmanager without leaking them", async () => {
  const t = convexTest(schema, modules)
  const userId = await profileUserInsert(t)
  const { orgId } = await profileOrgInsert(t, userId, "eventmanager-org", {
    organizerRole: "eventmanager",
    withBank: true,
  })
  const token = await testAuthSessionTokenCreate(t, userId, authSecret)

  const profile = await t.query(api.organizerDashboardProfile.organizerDashboardOrganizationGetQuery, {
    token,
    orgId,
  })
  expect(profile.success).toBe(true)
  if (!profile.success) return
  expect(profile.data.profile).toMatchObject({ slug: "eventmanager-org" })
  expect(profile.data.bank).toBeNull()
  expect(profile.data.fee).toBeNull()
  expect(profile.data.tax).toBeNull()
  expect(JSON.stringify(profile)).not.toContain(validIban)
})

test("shows bank, fee, and tax to finanzen while admins keep read-only bank access", async () => {
  const t = convexTest(schema, modules)
  const finanzenId = await profileUserInsert(t)
  const adminId = await profileUserInsert(t)
  const { orgId: finanzenOrg } = await profileOrgInsert(t, finanzenId, "finanzen-org", {
    organizerRole: "finanzen",
    withBank: true,
  })
  const { orgId: adminOrg } = await profileOrgInsert(t, adminId, "orgadmin-org", {
    organizerRole: "admin",
    withBank: true,
  })

  const finanzenProfile = await t.query(api.organizerDashboardProfile.organizerDashboardOrganizationGetQuery, {
    token: await testAuthSessionTokenCreate(t, finanzenId, authSecret),
    orgId: finanzenOrg,
  })
  expect(finanzenProfile.success).toBe(true)
  if (!finanzenProfile.success) return
  expect(finanzenProfile.data.bank).toEqual({ iban: validIban, holder: "Holder" })
  expect(finanzenProfile.data.fee).not.toBeNull()

  const adminProfile = await t.query(api.organizerDashboardProfile.organizerDashboardOrganizationGetQuery, {
    token: await testAuthSessionTokenCreate(t, adminId, authSecret),
    orgId: adminOrg,
  })
  expect(adminProfile.success).toBe(true)
  if (!adminProfile.success) return
  expect(adminProfile.data.bank).toEqual({ iban: validIban, holder: "Holder" })
})

test("denies blocked organizations and strangers without leaking bank data", async () => {
  const t = convexTest(schema, modules)
  const userId = await profileUserInsert(t)
  const strangerId = await profileUserInsert(t)
  const { orgId } = await profileOrgInsert(t, userId, "gesperrt-org", {
    status: "gesperrt",
    withBank: true,
  })

  const blocked = await t.query(api.organizerDashboardProfile.organizerDashboardOrganizationGetQuery, {
    token: await testAuthSessionTokenCreate(t, userId, authSecret),
    orgId,
  })
  expect(blocked.success).toBe(false)

  const stranger = await t.query(api.organizerDashboardProfile.organizerDashboardOrganizationGetQuery, {
    token: await testAuthSessionTokenCreate(t, strangerId, authSecret),
    orgId,
  })
  expect(stranger.success).toBe(false)
})

test("preserves legacy migration contracts as open and readable for the owner", async () => {
  const t = convexTest(schema, modules)
  const userId = await profileUserInsert(t)
  const { orgId } = await profileOrgInsert(t, userId, "legacy-org", {
    withBank: true,
    legacyContracts: true,
  })
  const token = await testAuthSessionTokenCreate(t, userId, authSecret)

  const profile = await t.query(api.organizerDashboardProfile.organizerDashboardOrganizationGetQuery, {
    token,
    orgId,
  })
  expect(profile.success).toBe(true)
  if (!profile.success) return
  expect(profile.data.contracts).toEqual({ termsAccepted: false, dpaAccepted: false, current: false })
  expect(profile.data.bank).toEqual({ iban: validIban, holder: "Holder" })
})
