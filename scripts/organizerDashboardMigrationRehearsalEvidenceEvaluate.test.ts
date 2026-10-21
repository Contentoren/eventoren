import { describe, expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { organizerContractDocuments } from "#src/organizer/dashboard/contracts/organizerContractDocuments.ts"
import { organizerContractTextCanonicalCreate } from "#src/organizer/dashboard/contracts/organizerContractTextCanonicalCreate.ts"
import { organizerContractTextDigestCreate } from "#src/organizer/dashboard/contracts/organizerContractTextDigestCreate.ts"
import { organizerDashboardMigrationRehearsalEvidenceEvaluate } from "./organizerDashboardMigrationRehearsalEvidenceEvaluate.ts"
import {
  organizerDashboardMigrationRehearsalSnapshotCompare,
  type RehearsalSnapshot,
} from "./organizerDashboardMigrationRehearsalSnapshotCompare.ts"

const now = "2026-10-21T12:00:00.000Z"
const later = "2026-10-21T12:01:00.000Z"
function row(id: string, fields: Record<string, unknown>) {
  return { _id: id, _creationTime: 1, ...fields }
}

/** Entirely synthetic snapshots; no private files, backend, environment or copied data. */
function scenario() {
  const orgs = [
    { id: "org-a", slug: "local-rehearsal-a", name: "Local Rehearsal Org A" },
    { id: "org-b", slug: "local-rehearsal-b", name: "Local Rehearsal Org B" },
  ]
  const baseline: RehearsalSnapshot = {
    _tables: [{ name: "catalogEvents", id: 1 }],
    orgs: [row("legacy-org", { name: "Synthetic original", updatedAt: now })],
    orgMembers: [row("legacy-member", { orgId: "legacy-org", organizerRole: "inhaber", updatedAt: now })],
    organizerDashboardOrganizations: [
      row("legacy-config", { orgId: "legacy-org", contracts: { termsRevision: "old" } }),
    ],
    organizerDashboardContractConsents: [row("legacy-consent", { orgId: "legacy-org", termsRevision: "old" })],
    organizerDashboardAudit: [row("legacy-audit", { orgId: "legacy-org", note: "original" })],
    catalogEvents: [
      row("event-target", { eventKey: "target", title: "Keep full title", updatedAt: now }),
      row("event-control", { eventKey: "control", updatedAt: now }),
    ],
    ticketOrders: [
      row("order-1", { eventKey: "target", totalCents: 1234, buyer: { name: "Synthetic buyer" }, updatedAt: now }),
      row("order-2", { eventKey: "target", paidAt: now, updatedAt: now }),
      row("order-control", { eventKey: "control", updatedAt: now }),
    ],
    ticketIssued: [row("ticket-1", { orderId: "order-1", orgId: "legacy-org", updatedAt: now })],
    catalogTicketTiers: [
      row("tier-target", { eventId: "event-target", priceCents: 1200, feeCents: 0 }),
      row("tier-control", { eventId: "event-control", feeCents: 200 }),
    ],
    organizerDashboardPricingJobs: [],
    emptyTable: [],
  }
  const postFixtures = structuredClone(baseline)
  const { terms, dpa } = organizerContractDocuments
  for (const org of orgs) {
    postFixtures.orgs?.push(row(org.id, { name: org.name, orgHandle: org.slug, createdAt: now, updatedAt: now }))
    postFixtures.orgMembers?.push(
      row(`member-${org.id}`, {
        orgId: org.id,
        orgHandle: org.slug,
        userId: "customer",
        invitedBy: "customer",
        role: "member",
        organizerRole: "inhaber",
        createdAt: now,
        updatedAt: now,
      }),
    )
    postFixtures.organizerDashboardOrganizations?.push(
      row(`config-${org.id}`, {
        orgId: org.id,
        status: "pruefung",
        profile: { name: org.name, slug: org.slug, kind: "verein" },
        tax: { status: "regel", defaultRateBps: 1900 },
        fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
        contracts: {
          termsAcceptedAt: now,
          dpaAcceptedAt: now,
          termsRevision: terms.revision,
          dpaRevision: dpa.revision,
          termsConsentedAt: now,
          dpaConsentedAt: now,
          consentedByUserId: "customer",
        },
        configurationConfirmed: false,
        createdAt: now,
        updatedAt: now,
      }),
    )
    postFixtures.organizerDashboardContractConsents?.push(
      row(`consent-${org.id}`, {
        orgId: org.id,
        acceptedAt: now,
        acceptedByUserId: "customer",
        termsDocumentId: terms.documentId,
        termsRevision: terms.revision,
        dpaDocumentId: dpa.documentId,
        dpaRevision: dpa.revision,
        termsTextDigest: `sha256:${createHash("sha256").update(organizerContractTextCanonicalCreate(terms)).digest("hex")}`,
        dpaTextDigest: `sha256:${createHash("sha256").update(organizerContractTextCanonicalCreate(dpa)).digest("hex")}`,
        termsSnapshot: terms.sections.map(([heading, body]) => ({ heading, body })),
        dpaSnapshot: dpa.sections.map(([heading, body]) => ({ heading, body })),
      }),
    )
    postFixtures.organizerDashboardAudit?.push(
      row(`consent-audit-${org.id}`, {
        orgId: org.id,
        actorUserId: "customer",
        area: "contracts",
        action: "accepted",
        at: now,
        note: `terms=${terms.revision}; dpa=${dpa.revision}`,
      }),
    )
  }
  const mid = structuredClone(postFixtures)
  Object.assign(mid.catalogEvents?.[0] ?? {}, { orgId: "org-a", updatedAt: later })
  Object.assign(mid.organizerDashboardOrganizations?.[1] ?? {}, {
    feeRevision: 1,
    pricingStatus: "updating",
    updatedAt: later,
  })
  mid.organizerDashboardPricingJobs?.push(
    row("pricing-job", {
      orgId: "org-a",
      feeRevision: 1,
      status: "pending",
      cursorVersion: 1,
      processedEvents: 0,
      processedTiers: 0,
      updatedTiers: 0,
      startedByUserId: "admin",
      createdAt: later,
      updatedAt: later,
    }),
  )
  mid.organizerDashboardAudit?.push(
    row("apply-audit", {
      orgId: "org-a",
      actorUserId: "admin",
      area: "migration",
      action: "migrated",
      at: later,
      note: "event:target",
    }),
  )
  const final = structuredClone(mid)
  for (const order of final.ticketOrders ?? [])
    if (order.eventKey === "target") Object.assign(order, { orgId: "org-a", updatedAt: later })
  for (let page = 0; page < 2; page += 1)
    final.organizerDashboardAudit?.push(
      row(`backfill-${page}`, {
        orgId: "org-a",
        actorUserId: "admin",
        area: "migration",
        action: "migrated",
        at: later,
        note: "backfill:target:1",
      }),
    )
  return {
    baseline,
    postFixtures,
    mid,
    final,
    orgs,
    customerUserId: "customer",
    adminUserId: "admin",
    targetEventKey: "target",
    backfillChanges: [1, 1],
  }
}

function evaluateChangedFinal(table: string, index: number, patch: Record<string, unknown>) {
  const input = scenario()
  Object.assign(input.final[table]?.[index] ?? {}, patch)
  return organizerDashboardMigrationRehearsalEvidenceEvaluate(input)
}

describe("synthetic creation and migration checkpoint evidence", () => {
  test("synthetic consent hashes match the real evidence digest format, including sha256 prefix", async () => {
    const consent = scenario().postFixtures.organizerDashboardContractConsents?.[1]
    expect(consent?.termsTextDigest).toBe(
      await organizerContractTextDigestCreate(organizerContractTextCanonicalCreate(organizerContractDocuments.terms)),
    )
    expect(consent?.dpaTextDigest).toBe(
      await organizerContractTextDigestCreate(organizerContractTextCanonicalCreate(organizerContractDocuments.dpa)),
    )
  })

  test("accepts exactly two bundled consent rows, two acceptance audits, one apply audit and one audit per changed backfill page", () => {
    const input = scenario()
    const evidence = organizerDashboardMigrationRehearsalEvidenceEvaluate(input)
    expect(evidence.passed).toBe(true)
    expect(evidence.fixtureCheckpointMatchesExpected).toBe(true)
    expect(evidence.applyCheckpointMatchesExpected).toBe(true)
    expect(evidence.backfillCheckpointMatchesExpected).toBe(true)
    expect(input.postFixtures.organizerDashboardContractConsents?.length).toBe(3)
    expect(input.postFixtures.organizerDashboardAudit?.length).toBe(3)
    expect(input.mid.organizerDashboardAudit?.length).toBe(4)
    expect(input.final.organizerDashboardAudit?.length).toBe(6)
    expect(evidence.baselineDocumentsChecked).toBe(
      Object.entries(input.baseline).reduce((sum, [table, rows]) => sum + (table === "_tables" ? 0 : rows.length), 0),
    )
    expect(evidence.baselineTableMappingsChecked).toBe(1)
    expect(evidence.checkpointDocumentComparisons).toBeGreaterThan(evidence.baselineDocumentsChecked * 3)
  })

  test.each([
    "organizerDashboardContractConsents",
    "organizerDashboardAudit",
    "orgs",
    "orgMembers",
    "organizerDashboardOrganizations",
  ])("rejects extra synthetic-looking rows even in %s", (table) => {
    const input = scenario()
    const extra = structuredClone(input.postFixtures[table]?.[1] ?? {})
    extra._id = "extra"
    input.postFixtures[table]?.push(extra)
    expect(organizerDashboardMigrationRehearsalEvidenceEvaluate(input).fixtureCheckpointMatchesExpected).toBe(false)
  })

  test("rejects missing evidence or acceptance audit instead of treating creation as an empty-table exemption", () => {
    for (const table of ["organizerDashboardContractConsents", "organizerDashboardAudit"]) {
      const input = scenario()
      input.postFixtures[table]?.pop()
      expect(organizerDashboardMigrationRehearsalEvidenceEvaluate(input).fixtureCheckpointMatchesExpected).toBe(false)
    }
  })

  test.each([
    { orgId: "unrelated" },
    { acceptedByUserId: "admin" },
    { termsRevision: "stale" },
    { termsTextDigest: "changed" },
    { termsSnapshot: [] },
  ])("rejects incorrect consent identity, exact revision, digest or document snapshot: %j", (patch) => {
    const input = scenario()
    Object.assign(input.postFixtures.organizerDashboardContractConsents?.[1] ?? {}, patch)
    expect(organizerDashboardMigrationRehearsalEvidenceEvaluate(input).fixtureCheckpointMatchesExpected).toBe(false)
  })

  test("rejects swapping the two evidence IDs to duplicate one organization's consent", () => {
    const input = scenario()
    Object.assign(
      input.postFixtures.organizerDashboardContractConsents?.[2] ?? {},
      structuredClone(input.postFixtures.organizerDashboardContractConsents?.[1] ?? {}),
      { _id: "different-id" },
    )
    expect(organizerDashboardMigrationRehearsalEvidenceEvaluate(input).fixtureCheckpointMatchesExpected).toBe(false)
  })

  test("rejects unaccounted apply/backfill audit rows and audit rows with the wrong actor or target", () => {
    for (const patch of [{ actorUserId: "customer" }, { orgId: "org-b" }, { note: "backfill:control:1" }]) {
      expect(evaluateChangedFinal("organizerDashboardAudit", 4, patch).passed).toBe(false)
    }
    const input = scenario()
    input.mid.organizerDashboardAudit?.push(row("unexpected-audit", { orgId: "org-a" }))
    expect(organizerDashboardMigrationRehearsalEvidenceEvaluate(input).applyCheckpointMatchesExpected).toBe(false)
  })

  test("rejects extra rows or a new unrelated table (including a new empty one)", () => {
    for (const extra of [[], [row("extra", { orgId: "org-a" })]]) {
      const input = scenario()
      input.final.unrelatedTable = extra
      expect(organizerDashboardMigrationRehearsalEvidenceEvaluate(input).passed).toBe(false)
    }
    const input = scenario()
    input.final.ticketIssued?.push(row("extra-ticket", {}))
    expect(organizerDashboardMigrationRehearsalEvidenceEvaluate(input).countDeltasAllowlisted).toBe(false)
  })
})

describe("full-original-record comparator, including growth tables", () => {
  test.each([
    "orgs",
    "orgMembers",
    "organizerDashboardOrganizations",
    "organizerDashboardContractConsents",
    "organizerDashboardAudit",
    "catalogEvents",
    "ticketOrders",
    "ticketIssued",
  ])("rejects replacement of an original %s ID even when counts and other fields match", (table) => {
    const evidence = evaluateChangedFinal(table, 0, { _id: "replacement-id" })
    expect(evidence.idHashesPreserved).toBe(false)
    expect(evidence.passed).toBe(false)
  })

  test.each([
    "orgs",
    "orgMembers",
    "organizerDashboardOrganizations",
    "organizerDashboardContractConsents",
    "organizerDashboardAudit",
    "ticketIssued",
  ])("detects full field hash changes in original %s rows", (table) => {
    const evidence = evaluateChangedFinal(table, 0, { hiddenUnexpectedField: "changed" })
    expect(evidence.idHashesPreserved).toBe(true)
    expect(evidence.originalFieldsPreserved).toBe(false)
    expect(evidence.passed).toBe(false)
  })

  test("detects original growth-table corruption during fixture creation, not just final comparison", () => {
    const input = scenario()
    Object.assign(input.postFixtures.orgs?.[0] ?? {}, { name: "changed" })
    expect(organizerDashboardMigrationRehearsalEvidenceEvaluate(input).fixtureCheckpointMatchesExpected).toBe(false)
  })

  test("does not globally exclude orgId or updatedAt from unrelated events, orders or tickets", () => {
    for (const [table, index] of [
      ["catalogEvents", 1],
      ["ticketOrders", 2],
      ["ticketIssued", 0],
    ] as const) {
      for (const patch of [{ orgId: "org-a" }, { updatedAt: later }]) {
        expect(evaluateChangedFinal(table, index, patch).originalFieldsPreserved).toBe(false)
      }
    }
  })

  test("detects full nested buyer fields and target event fields even though ownership changed legitimately", () => {
    expect(
      evaluateChangedFinal("ticketOrders", 0, { buyer: { name: "Altered synthetic buyer" } }).orderFieldsPreserved,
    ).toBe(false)
    expect(evaluateChangedFinal("catalogEvents", 0, { title: "Altered title" }).eventFieldsPreserved).toBe(false)
    expect(evaluateChangedFinal("ticketOrders", 0, { orgId: "org-b" }).passed).toBe(false)
    expect(evaluateChangedFinal("catalogEvents", 0, { orgId: "org-b" }).passed).toBe(false)
  })

  test("preserves synthetic evidence and audits after creation; later mutations cannot hide in growth tables", () => {
    expect(evaluateChangedFinal("organizerDashboardContractConsents", 1, { acceptedAt: later }).passed).toBe(false)
    expect(evaluateChangedFinal("organizerDashboardAudit", 1, { note: "changed" }).passed).toBe(false)
  })

  test("permits only target tier zero-fee repricing fields, not price or unrelated tier changes", () => {
    const input = scenario()
    Object.assign(input.mid.catalogTicketTiers?.[0] ?? {}, { feeCents: 200 })
    Object.assign(input.final.catalogTicketTiers?.[0] ?? {}, { feeCents: 0, catalogVersion: 2, updatedAt: later })
    Object.assign(input.final.catalogEvents?.[0] ?? {}, { catalogVersion: 2, eventRevision: 2 })
    const compare = () =>
      organizerDashboardMigrationRehearsalSnapshotCompare({
        ...input,
        before: input.mid,
        after: input.final,
        phase: "backfill",
      })
    expect(compare().passed).toBe(true)
    Object.assign(input.final.catalogTicketTiers?.[0] ?? {}, { priceCents: 9999 })
    expect(compare().originalFieldsPreserved).toBe(false)
    expect(
      evaluateChangedFinal("catalogTicketTiers", 1, { feeCents: 0, catalogVersion: 2, updatedAt: later })
        .originalFieldsPreserved,
    ).toBe(false)
  })

  test("rejects duplicate IDs, lost empty tables and changed table mappings", () => {
    const duplicate = scenario()
    duplicate.final.orgs?.push(structuredClone(duplicate.final.orgs[0] ?? {}))
    expect(organizerDashboardMigrationRehearsalEvidenceEvaluate(duplicate).idHashesPreserved).toBe(false)
    const missing = scenario()
    delete missing.final.emptyTable
    expect(organizerDashboardMigrationRehearsalEvidenceEvaluate(missing).passed).toBe(false)
    expect(evaluateChangedFinal("_tables", 0, { id: 999 }).originalFieldsPreserved).toBe(false)
  })

  test("rejects a backfill changed count that does not match the actual original orders assigned", () => {
    const input = scenario()
    input.backfillChanges = [2, 1]
    Object.assign(input.final.organizerDashboardAudit?.[4] ?? {}, { note: "backfill:target:2" })
    expect(organizerDashboardMigrationRehearsalEvidenceEvaluate(input).backfillCheckpointMatchesExpected).toBe(false)
  })

  test("fails closed on catalog-sync side effects rather than exempting entire tables", () => {
    const input = scenario()
    input.final.catalogSyncSnapshots = [row("sync-snapshot", { version: 2 })]
    expect(organizerDashboardMigrationRehearsalEvidenceEvaluate(input).passed).toBe(false)
    delete input.final.catalogSyncSnapshots
    for (const checkpoint of [input.baseline, input.postFixtures, input.mid, input.final])
      checkpoint.catalogSyncStates = [row("sync-state", { version: 1 })]
    Object.assign(input.final.catalogSyncStates?.[0] ?? {}, { version: 2 })
    expect(organizerDashboardMigrationRehearsalEvidenceEvaluate(input).originalFieldsPreserved).toBe(false)
  })

  test("does not return rows, original field hashes, tokens, or synthetic buyer values", () => {
    const serialized = JSON.stringify(organizerDashboardMigrationRehearsalEvidenceEvaluate(scenario()))
    for (const privateValue of ["Synthetic buyer", "order-1", "customer", "legacy-org", "Keep full title"])
      expect(serialized).not.toContain(privateValue)
  })
})
