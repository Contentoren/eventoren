/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { organizerContractDocuments } from "../src/organizer/dashboard/contracts/organizerContractDocuments.ts"
import { organizerContractsCurrentCheck } from "../src/organizer/dashboard/contracts/organizerContractsCurrentCheck.ts"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const secret = "organizer-consent-evidence-test-secret"
const old = "2020-01-01T00:00:00.000Z"
const consent = {
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
  return { t, userId, orgId, evidenceRead, organizationRead, accept }
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
  expect((await accept()).success).toBe(true)
  expect(await evidenceRead()).toEqual(before)
  expect(await audits()).toEqual(auditBefore)
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
