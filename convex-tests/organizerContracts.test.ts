/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"
import { organizerContractDocuments } from "../src/organizer/dashboard/contracts/organizerContractDocuments.ts"
import { organizerDashboardAdminActivationCheck } from "../src/organizer/dashboard/admin/organizerDashboardAdminActivationCheck.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const secret = "organizer-contract-test-secret"
const consent = {
  termsAccepted: true,
  dpaAccepted: true,
  termsRevision: organizerContractDocuments.terms.revision,
  dpaRevision: organizerContractDocuments.dpa.revision,
}
async function setup() {
  process.env.AUTH_SECRET = secret
  const t = convexTest(schema, modules)
  const now = "2026-01-01T00:00:00.000Z"
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", { name: "Contract Owner", role: "customer", createdAt: now, updatedAt: now }),
  )
  const token = await testAuthSessionTokenCreate(t, userId, secret)
  return { t, token, userId }
}

test("onboarding rejects false, stale, missing and buyer revisions before creating any organization", async () => {
  const { t, token } = await setup()
  const base = { token, name: "Contract Org", slug: "contract-org", kind: "verein", ...consent }
  for (const invalid of [
    { termsAccepted: false },
    { dpaAccepted: false },
    { termsRevision: "buyer-agb" },
    { dpaRevision: "old-avv" },
  ]) {
    const result = await t.mutation(api.organizerDashboard.organizerDashboardOrganizationCreateMutation, {
      ...base,
      ...invalid,
    })
    expect(result.success).toBe(false)
  }
  const { termsRevision: _, ...missing } = base
  await expect(
    t.mutation(api.organizerDashboard.organizerDashboardOrganizationCreateMutation, missing as typeof base),
  ).rejects.toThrow()
  expect(await t.run((ctx) => ctx.db.query("orgs").take(1))).toEqual([])
})

test("creation records exact revisions, server UTC times and accepting actor", async () => {
  const { t, token, userId } = await setup()
  const created = await t.mutation(api.organizerDashboard.organizerDashboardOrganizationCreateMutation, {
    token,
    name: "Contract Org",
    slug: "contract-org",
    kind: "verein",
    ...consent,
  })
  expect(created.success).toBe(true)
  if (!created.success) return
  const config = await t.run((ctx) =>
    ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("orgId", (q) => q.eq("orgId", created.data.orgId))
      .unique(),
  )
  expect(config?.contracts).toMatchObject({
    termsRevision: consent.termsRevision,
    dpaRevision: consent.dpaRevision,
    consentedByUserId: userId,
  })
  expect(config?.contracts.termsConsentedAt).toMatch(/Z$/)
  expect(config?.contracts.termsConsentedAt).toBe(config?.contracts.termsAcceptedAt)
  expect(config?.contracts.dpaConsentedAt).toBe(config?.contracts.dpaAcceptedAt)
})

test("legacy timestamps do not authorize activation; explicit owner acceptance preserves them and retries preserve evidence", async () => {
  const { t, token, userId } = await setup()
  const old = "2020-01-01T00:00:00.000Z"
  const orgId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("orgs", {
      name: "Legacy",
      orgHandle: "legacy-contract",
      createdAt: old,
      updatedAt: old,
    })
    await ctx.db.insert("orgMembers", {
      orgId: id,
      userId,
      orgHandle: "legacy-contract",
      role: "member",
      organizerRole: "inhaber",
      invitedBy: userId,
      createdAt: old,
      updatedAt: old,
    })
    await ctx.db.insert("organizerDashboardOrganizations", {
      orgId: id,
      status: "pruefung",
      profile: { name: "Legacy", slug: "legacy-contract", kind: "verein" },
      bank: { iban: "DE89370400440532013000", holder: "Legacy" },
      tax: { status: "regel", defaultRateBps: 1900 },
      fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
      contracts: { termsAcceptedAt: old, dpaAcceptedAt: old },
      configurationConfirmed: true,
      createdAt: old,
      updatedAt: old,
    })
    return id
  })
  const read = () =>
    t.run((ctx) =>
      ctx.db
        .query("organizerDashboardOrganizations")
        .withIndex("orgId", (q) => q.eq("orgId", orgId))
        .unique(),
    )
  const before = await read()
  expect(before && organizerDashboardAdminActivationCheck(before).success).toBe(false)
  expect(
    (
      await t.mutation(api.organizerDashboard.organizerContractsAcceptMutation, {
        token,
        orgId,
        ...consent,
        dpaRevision: "stale",
      })
    ).success,
  ).toBe(false)
  expect((await read())?.contracts).toEqual(before?.contracts)
  expect(
    (await t.mutation(api.organizerDashboard.organizerContractsAcceptMutation, { token, orgId, ...consent })).success,
  ).toBe(true)
  const accepted = await read()
  expect(accepted?.contracts.termsAcceptedAt).toBe(old)
  expect(accepted?.contracts.dpaAcceptedAt).toBe(old)
  expect(accepted?.contracts.termsConsentedAt).not.toBe(old)
  expect(accepted && organizerDashboardAdminActivationCheck(accepted).success).toBe(true)
  expect(
    (await t.mutation(api.organizerDashboard.organizerContractsAcceptMutation, { token, orgId, ...consent })).success,
  ).toBe(true)
  expect((await read())?.contracts).toEqual(accepted?.contracts)
  await t.run(async (ctx) => {
    const member = await ctx.db
      .query("orgMembers")
      .withIndex("userIdOrgId", (q) => q.eq("userId", userId).eq("orgId", orgId))
      .unique()
    if (member) await ctx.db.patch("orgMembers", member._id, { organizerRole: "admin" })
  })
  expect(
    (await t.mutation(api.organizerDashboard.organizerContractsAcceptMutation, { token, orgId, ...consent })).success,
  ).toBe(false)
})
