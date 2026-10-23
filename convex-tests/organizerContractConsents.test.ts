/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { organizerContractPartyConsentFixture } from "../test/organizerContractPartyConsent.fixture.ts"
import { expect, test } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { organizerContractDocuments } from "../src/organizer/dashboard/contracts/organizerContractDocuments.ts"
import { organizerContractsCurrentCheck } from "../src/organizer/dashboard/contracts/organizerContractsCurrentCheck.ts"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"
import type { ConvexHttpClient } from "convex/browser"
import { organizerDashboardConvexBackendCreate } from "../src/organizer/dashboard/api/organizerDashboardConvexBackendCreate.ts"
import { organizerDashboardHonoCreate } from "../src/organizer/dashboard/api/organizerDashboardHonoCreate.ts"
import { organizerDashboardCliRun } from "../src/cli/organizerDashboardCliRun.ts"
import { organizerDashboardClientCreate } from "../src/client/organizerDashboardClientCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const secret = "organizer-consent-evidence-test-secret"
const old = "2020-01-01T00:00:00.000Z"
const consent = {
  ...organizerContractPartyConsentFixture,
  termsAccepted: true,
  dpaAccepted: true,
  termsRevision: organizerContractDocuments.terms.revision,
  dpaRevision: organizerContractDocuments.dpa.revision,
}

async function setup(legacy = false) {
  process.env.AUTH_SECRET = secret
  const t = convexTest(schema, modules)
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", { name: "Evidence Owner", role: "customer", createdAt: old, updatedAt: old }),
  )
  const token = await testAuthSessionTokenCreate(t, userId, secret)
  const orgId = await (async () => {
    if (!legacy) {
      const created = await t.mutation(api.organizerDashboard.organizerDashboardOrganizationCreateMutation, {
        token,
        name: "Evidence Org",
        slug: "evidence-org",
        kind: "verein",
        ...consent,
      })
      if (!created.success) throw new Error(created.errorMessage)
      return created.data.orgId
    }
    return t.run(async (ctx) => {
      const id = await ctx.db.insert("orgs", {
        name: "Legacy",
        orgHandle: "legacy-evidence",
        createdAt: old,
        updatedAt: old,
      })
      await ctx.db.insert("orgMembers", {
        orgId: id,
        userId,
        orgHandle: "legacy-evidence",
        role: "member",
        organizerRole: "inhaber",
        invitedBy: userId,
        createdAt: old,
        updatedAt: old,
      })
      await ctx.db.insert("organizerDashboardOrganizations", {
        orgId: id,
        status: "pruefung",
        profile: { name: "Legacy", slug: "legacy-evidence", kind: "verein" },
        tax: { status: "regel", defaultRateBps: 1900 },
        fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
        contracts: { termsAcceptedAt: old, dpaAcceptedAt: old },
        configurationConfirmed: false,
        createdAt: old,
        updatedAt: old,
      })
      return id
    })
  })()
  const evidenceRead = () =>
    t.run((ctx) =>
      ctx.db
        .query("organizerDashboardContractConsents")
        .withIndex("orgIdAt", (q) => q.eq("orgId", orgId))
        .collect(),
    )
  const organizationRead = () =>
    t.run((ctx) =>
      ctx.db
        .query("organizerDashboardOrganizations")
        .withIndex("orgId", (q) => q.eq("orgId", orgId))
        .unique(),
    )
  const accept = () => t.mutation(api.organizerDashboard.organizerContractsAcceptMutation, { token, orgId, ...consent })
  return { t, token, userId, orgId, evidenceRead, organizationRead, accept }
}

test("organization creation freezes both documents in exactly one attributed UTC evidence row", async () => {
  const { evidenceRead, userId } = await setup()
  const rows = await evidenceRead()
  expect(rows).toHaveLength(1)
  const row = rows[0]
  if (!row) throw new Error("Missing creation evidence")
  expect(row).toMatchObject({
    termsDocumentId: organizerContractDocuments.terms.documentId,
    dpaDocumentId: organizerContractDocuments.dpa.documentId,
    termsRevision: consent.termsRevision,
    dpaRevision: consent.dpaRevision,
    acceptedByUserId: userId,
    party: consent.contractParty,
    acceptedFee: { percentBps: 390, fixedCents: 49, payer: consent.feePayer },
    authorityConfirmed: true,
    earlyServiceStartRequested: false,
  })
  expect(row.acceptedAt).toBe(new Date(row.acceptedAt).toISOString())
  for (const key of ["terms", "dpa"] as const) {
    expect(row[`${key}TextDigest`]).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(row[`${key}Snapshot`].length).toBeGreaterThan(0)
    expect(row[`${key}Snapshot`]).toEqual(
      organizerContractDocuments[key].sections.map(([heading, body]) => ({ heading, body })),
    )
    const canonical = JSON.stringify({
      documentId: row[`${key}DocumentId`],
      revision: row[`${key}Revision`],
      sections: row[`${key}Snapshot`].map(({ heading, body }) => ({ heading, body })),
    })
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical))
    expect(row[`${key}TextDigest`]).toBe(
      `sha256:${Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("")}`,
    )
  }
})

test("a real acceptance appends one evidence row with the current revisions", async () => {
  const { t, organizationRead, evidenceRead, accept, userId } = await setup()
  const organization = await organizationRead()
  if (!organization) throw new Error("Missing organization")
  await t.run((ctx) =>
    ctx.db.patch("organizerDashboardOrganizations", organization._id, {
      contracts: { ...organization.contracts, termsRevision: "outdated" },
    }),
  )
  expect((await accept()).success).toBe(true)
  const rows = await evidenceRead()
  expect(rows).toHaveLength(2)
  expect(rows[1]).toMatchObject({
    termsRevision: consent.termsRevision,
    dpaRevision: consent.dpaRevision,
    acceptedByUserId: userId,
  })
})

test("idempotent current acceptance preserves row count, accepting actor, time and audit rows", async () => {
  const { t, orgId, evidenceRead, accept } = await setup()
  const before = await evidenceRead()
  const audits = () =>
    t.run((ctx) =>
      ctx.db
        .query("organizerDashboardAudit")
        .withIndex("orgIdAt", (q) => q.eq("orgId", orgId))
        .collect(),
    )
  const auditBefore = await audits()
  const deliveriesBefore = await t.run((ctx) => ctx.db.query("organizerDashboardContractDeliveries").collect())
  expect((await accept()).success).toBe(true)
  expect(await evidenceRead()).toEqual(before)
  expect(await audits()).toEqual(auditBefore)
  expect(await t.run((ctx) => ctx.db.query("organizerDashboardContractDeliveries").collect())).toEqual(deliveriesBefore)
})

test("new acceptance retains old snapshots and digests unchanged while advancing the current pointer", async () => {
  const { t, orgId, userId, organizationRead, evidenceRead, accept } = await setup(true)
  const organization = await organizationRead()
  if (!organization) throw new Error("Missing organization")
  await t.run(async (ctx) => {
    await ctx.db.patch("organizerDashboardOrganizations", organization._id, {
      contracts: {
        termsRevision: "old-terms",
        dpaRevision: "old-dpa",
        termsConsentedAt: old,
        dpaConsentedAt: old,
        consentedByUserId: userId,
      },
    })
    await ctx.db.insert("organizerDashboardContractConsents", {
      orgId,
      termsDocumentId: "old-terms-document",
      termsRevision: "old-terms",
      dpaDocumentId: "old-dpa-document",
      dpaRevision: "old-dpa",
      termsTextDigest: `sha256:${"a".repeat(64)}`,
      dpaTextDigest: `sha256:${"b".repeat(64)}`,
      termsSnapshot: [{ heading: "Old terms", body: "Historical terms text" }],
      dpaSnapshot: [{ heading: "Old DPA", body: "Historical DPA text" }],
      acceptedAt: old,
      acceptedByUserId: userId,
    })
  })
  const before = (await evidenceRead())[0]
  if (!before) throw new Error("Missing historical evidence")
  expect((await accept()).success).toBe(true)
  const rows = await evidenceRead()
  expect(rows).toHaveLength(2)
  expect(rows.find((row) => row._id === before._id)).toEqual(before)
  expect((await organizationRead())?.contracts).toMatchObject({
    termsRevision: consent.termsRevision,
    dpaRevision: consent.dpaRevision,
  })
})

test("legacy timestamp-only organizations receive no invented evidence before explicit acceptance", async () => {
  const { evidenceRead, organizationRead, accept } = await setup(true)
  const organization = await organizationRead()
  if (!organization) throw new Error("Missing legacy organization")
  expect(organizerContractsCurrentCheck(organization.contracts)).toBe(false)
  expect(await evidenceRead()).toEqual([])
  expect((await accept()).success).toBe(true)
  expect(await evidenceRead()).toHaveLength(1)
})

test("creation and explicit acceptance audit only revision IDs, never document text", async () => {
  for (const legacy of [false, true]) {
    const { t, orgId, userId, accept } = await setup(legacy)
    if (legacy) expect((await accept()).success).toBe(true)
    const rows = await t.run((ctx) =>
      ctx.db
        .query("organizerDashboardAudit")
        .withIndex("orgIdAt", (q) => q.eq("orgId", orgId))
        .collect(),
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      area: "contracts",
      action: "accepted",
      actorUserId: userId,
      note: `terms=${consent.termsRevision}; dpa=${consent.dpaRevision}`,
    })
    for (const document of Object.values(organizerContractDocuments)) {
      for (const [, body] of document.sections) expect(rows[0]?.note).not.toContain(body)
    }
  }
})

test("party identity, representative and email cannot be swapped even after the accepted revision becomes stale", async () => {
  const { t, token, orgId, organizationRead, evidenceRead } = await setup()
  const org = (await organizationRead())!
  await t.run((ctx) =>
    ctx.db.patch("organizerDashboardOrganizations", org._id, {
      contracts: { ...org.contracts, termsRevision: "stale" },
    }),
  )
  const before = await organizationRead()
  const evidence = await evidenceRead()
  for (const change of [
    { legalName: "Another Party" },
    { representativeName: "Other Representative" },
    { email: "other@example.org" },
  ]) {
    const result = await t.mutation(api.organizerDashboard.organizerContractsAcceptMutation, {
      token,
      orgId,
      ...consent,
      contractParty: { ...consent.contractParty, ...change },
    })
    expect(result.success).toBe(false)
    expect(await organizationRead()).toEqual(before)
    expect(await evidenceRead()).toEqual(evidence)
  }
})

test("fee payer reacceptance appends evidence without changing prior party or fee snapshots", async () => {
  const { t, token, orgId, organizationRead, evidenceRead } = await setup()
  const before = (await evidenceRead())[0]!
  const result = await t.mutation(api.organizerDashboard.organizerContractsAcceptMutation, {
    token,
    orgId,
    ...consent,
    feePayer: "veranstalter",
  })
  expect(result.success).toBe(true)
  const rows = await evidenceRead()
  expect(rows).toHaveLength(2)
  expect(rows.find((row) => row._id === before._id)).toEqual(before)
  expect((await organizationRead())?.contracts.acceptedFee).toEqual({
    percentBps: 390,
    fixedCents: 49,
    payer: "veranstalter",
  })
})

test("admin cannot change any accepted fee field and failed attempts have no writes or pricing jobs", async () => {
  const { t, orgId, organizationRead, evidenceRead } = await setup()
  const adminId = await t.run((ctx) =>
    ctx.db.insert("users", { name: "Contract Admin", role: "admin", createdAt: old, updatedAt: old }),
  )
  const token = await testAuthSessionTokenCreate(t, adminId, secret)
  const transport = { mutation: t.mutation, query: t.query } as unknown as ConvexHttpClient
  const backend = organizerDashboardConvexBackendCreate(transport)
  const app = organizerDashboardHonoCreate(backend)
  const client = organizerDashboardClientCreate({ client: transport, token })
  const before = await organizationRead()
  const evidence = await evidenceRead()
  for (const fee of [
    { percentBps: 391, fixedCents: 49, payer: "kaeufer" },
    { percentBps: 390, fixedCents: 50, payer: "kaeufer" },
    { percentBps: 390, fixedCents: 49, payer: "veranstalter" },
  ]) {
    const result = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
      token,
      orgId,
      tax: { status: "regel", defaultRateBps: 1900 },
      fee,
    })
    expect(result.success).toBe(false)
    const input = { orgId, tax: { status: "regel", defaultRateBps: 1900 }, fee }
    const http = await app.request("/api/veranstalter", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ operation: "admin-configure", ...input }),
    })
    expect(http.ok).toBe(false)
    expect(await http.text()).toContain("Gebühren")
    const lines: string[] = []
    expect(
      await organizerDashboardCliRun({
        argv: ["admin-configure", "--url", "https://convex.example.org", "--token-env", "ADMIN_TOKEN"],
        env: { ADMIN_TOKEN: token },
        stdinText: JSON.stringify(input),
        stdout: (text) => lines.push(text),
        backendFromUrl: () => backend,
      }),
    ).not.toBe(0)
    expect(lines.join("")).toContain("Gebühren")
    const sdk = await client.adminConfigure(input as Parameters<typeof client.adminConfigure>[0])
    expect(sdk.success).toBe(false)
    if (!sdk.success) expect(sdk.error.message).toContain("Gebühren")
    expect(await organizationRead()).toEqual(before)
    expect(await evidenceRead()).toEqual(evidence)
  }
  expect(await t.run((ctx) => ctx.db.query("organizerDashboardPricingJobs").take(1))).toEqual([])
  expect(
    (
      await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
        token,
        orgId,
        tax: { status: "regel", defaultRateBps: 1900 },
        fee: before!.fee,
      })
    ).success,
  ).toBe(true)
})

test("mail failure remains private and persisted, leases recover crashes and retries stop at five attempts", async () => {
  const { t, evidenceRead } = await setup()
  const evidence = await evidenceRead()
  const delivery = await t.run((ctx) => ctx.db.query("organizerDashboardContractDeliveries").unique())
  expect(delivery).toMatchObject({ evidenceId: evidence[0]!._id, status: "pending", attempts: 0 })
  const deliveryId = delivery!._id
  const claim = () =>
    t.mutation(internal.organizerContractDelivery.organizerContractDeliveryClaimInternalMutation, { deliveryId })
  for (let attempt = 1; attempt <= 5; attempt++) {
    await t.run((ctx) => ctx.db.patch("organizerDashboardContractDeliveries", deliveryId, { nextAttemptAt: 0 }))
    const claimed = await claim()
    expect(claimed?.attempts).toBe(attempt)
    expect(claimed?.evidence).toEqual(evidence[0])
    expect(await claim()).toBe(null) // competing worker cannot use the lease
    if (attempt === 1) continue // action crash: next lease recovers without a result callback
    await t.mutation(internal.organizerContractDelivery.organizerContractDeliveryUpdateInternalMutation, {
      deliveryId,
      attempts: attempt,
      sent: false,
    })
  }
  expect(await claim()).toBe(null)
  expect(await t.run((ctx) => ctx.db.get("organizerDashboardContractDeliveries", deliveryId))).toMatchObject({
    status: "failed",
    attempts: 5,
    lastError: "SMTP delivery failed",
  })
  expect(await evidenceRead()).toEqual(evidence)
})

test("successful mail receipt is terminal and old callbacks cannot change delivery status", async () => {
  const { t } = await setup()
  const delivery = await t.run((ctx) => ctx.db.query("organizerDashboardContractDeliveries").unique())
  const deliveryId = delivery!._id
  await t.mutation(internal.organizerContractDelivery.organizerContractDeliveryClaimInternalMutation, { deliveryId })
  await t.mutation(internal.organizerContractDelivery.organizerContractDeliveryUpdateInternalMutation, {
    deliveryId,
    attempts: 1,
    sent: true,
  })
  await t.mutation(internal.organizerContractDelivery.organizerContractDeliveryUpdateInternalMutation, {
    deliveryId,
    attempts: 1,
    sent: false,
  })
  expect(
    await t.mutation(internal.organizerContractDelivery.organizerContractDeliveryClaimInternalMutation, { deliveryId }),
  ).toBe(null)
  expect(await t.run((ctx) => ctx.db.get("organizerDashboardContractDeliveries", deliveryId))).toMatchObject({
    status: "sent",
    attempts: 1,
  })
})
