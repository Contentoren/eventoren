import { createHash } from "node:crypto"
import { organizerContractDocuments } from "#src/organizer/dashboard/contracts/organizerContractDocuments.ts"
import { organizerContractTextCanonicalCreate } from "#src/organizer/dashboard/contracts/organizerContractTextCanonicalCreate.ts"

type Row = Record<string, unknown>
export type RehearsalSnapshot = Record<string, Row[]>
export type RehearsalComparisonInput = {
  before: RehearsalSnapshot
  after: RehearsalSnapshot
  phase: "fixtures" | "apply" | "backfill"
  orgs: readonly { id: string; slug: string; name: string }[]
  customerUserId: string
  adminUserId: string
  targetEventKey: string
  backfillChanges: readonly number[]
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (typeof value === "object" && value !== null) {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`
  }
  return JSON.stringify(value) ?? "undefined"
}

function hash(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex")
}

function without(row: Row, keys: readonly string[]): Row {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)))
}

function instant(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  )
}

function keyOf(table: string, row: Row): unknown {
  return table === "_tables" ? row.name : row._id
}

function indexed(table: string, rows: Row[]): Map<unknown, Row> {
  return new Map(rows.map((row) => [keyOf(table, row), row]))
}

function generatedRowMatches(row: Row, expected: Row): boolean {
  return (
    typeof row._id === "string" &&
    typeof row._creationTime === "number" &&
    hash(without(row, ["_id", "_creationTime"])) === hash(expected)
  )
}

function fixtureRowMatches(table: string, row: Row, input: RehearsalComparisonInput): boolean {
  const org = input.orgs.find((item) => (table === "orgs" ? row._id : row.orgId) === item.id)
  if (!org) return false
  const now =
    table === "organizerDashboardContractConsents"
      ? row.acceptedAt
      : table === "organizerDashboardAudit"
        ? row.at
        : row.createdAt
  if (!instant(now)) return false
  const { terms, dpa } = organizerContractDocuments
  if (table === "orgs")
    return generatedRowMatches(row, { orgHandle: org.slug, name: org.name, createdAt: now, updatedAt: now })
  if (table === "orgMembers")
    return generatedRowMatches(row, {
      orgId: org.id,
      orgHandle: org.slug,
      userId: input.customerUserId,
      role: "member",
      organizerRole: "inhaber",
      invitedBy: input.customerUserId,
      createdAt: now,
      updatedAt: now,
    })
  if (table === "organizerDashboardOrganizations")
    return generatedRowMatches(row, {
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
        consentedByUserId: input.customerUserId,
      },
      configurationConfirmed: false,
      createdAt: now,
      updatedAt: now,
    })
  if (table === "organizerDashboardContractConsents")
    return generatedRowMatches(row, {
      orgId: org.id,
      acceptedAt: now,
      acceptedByUserId: input.customerUserId,
      termsDocumentId: terms.documentId,
      termsRevision: terms.revision,
      dpaDocumentId: dpa.documentId,
      dpaRevision: dpa.revision,
      termsTextDigest: `sha256:${createHash("sha256").update(organizerContractTextCanonicalCreate(terms)).digest("hex")}`,
      dpaTextDigest: `sha256:${createHash("sha256").update(organizerContractTextCanonicalCreate(dpa)).digest("hex")}`,
      termsSnapshot: terms.sections.map(([heading, body]) => ({ heading, body })),
      dpaSnapshot: dpa.sections.map(([heading, body]) => ({ heading, body })),
    })
  if (table === "organizerDashboardAudit")
    return generatedRowMatches(row, {
      orgId: org.id,
      actorUserId: input.customerUserId,
      area: "contracts",
      action: "accepted",
      at: now,
      note: `terms=${terms.revision}; dpa=${dpa.revision}`,
    })
  return false
}

function pricingJobMatches(row: Row, input: RehearsalComparisonInput): boolean {
  const allowed = [
    "_id",
    "_creationTime",
    "orgId",
    "feeRevision",
    "status",
    "cursorVersion",
    "eventCursor",
    "activeEventId",
    "tierCursor",
    "processedEvents",
    "processedTiers",
    "updatedTiers",
    "startedByUserId",
    "createdAt",
    "updatedAt",
  ]
  const target = (input.after.catalogEvents ?? []).find((event) => event.eventKey === input.targetEventKey)
  return (
    Object.keys(row).every((key) => allowed.includes(key)) &&
    typeof row._id === "string" &&
    Number.isFinite(row._creationTime) &&
    row.orgId === input.orgs[0]?.id &&
    row.feeRevision === 1 &&
    row.cursorVersion === 1 &&
    row.startedByUserId === input.adminUserId &&
    instant(row.createdAt) &&
    instant(row.updatedAt) &&
    ["pending", "running", "done"].includes(String(row.status)) &&
    ["processedEvents", "processedTiers", "updatedTiers"].every(
      (key) => Number.isSafeInteger(row[key]) && Number(row[key]) >= 0,
    ) &&
    Number(row.processedEvents) <= 1 &&
    Number(row.updatedTiers) <= Number(row.processedTiers) &&
    (row.activeEventId === undefined || row.activeEventId === target?._id) &&
    ["eventCursor", "tierCursor"].every((key) => row[key] === undefined || typeof row[key] === "string")
  )
}

function originalFieldsMatch(table: string, before: Row, after: Row, input: RehearsalComparisonInput): boolean {
  if (hash(before) === hash(after)) return true
  if (input.phase === "fixtures") return false
  const orgId = input.orgs[0]?.id
  if (table === "catalogEvents" && before.eventKey === input.targetEventKey) {
    const expectedOwner = input.phase === "apply" ? orgId : before.orgId
    return (
      (input.phase !== "apply" || before.orgId === undefined) &&
      after.orgId === expectedOwner &&
      instant(after.updatedAt) &&
      hash(without(before, ["orgId", "updatedAt", "catalogVersion", "eventRevision"])) ===
        hash(without(after, ["orgId", "updatedAt", "catalogVersion", "eventRevision"])) &&
      (after.catalogVersion === before.catalogVersion ||
        (Number.isSafeInteger(after.catalogVersion) &&
          Number(after.catalogVersion) > Number(before.catalogVersion ?? 0))) &&
      (after.eventRevision === before.eventRevision ||
        (Number.isSafeInteger(after.eventRevision) && Number(after.eventRevision) > Number(before.eventRevision ?? 1)))
    )
  }
  if (
    table === "ticketOrders" &&
    before.eventKey === input.targetEventKey &&
    input.phase === "backfill" &&
    before.orgId === undefined
  ) {
    return (
      after.orgId === orgId &&
      instant(after.updatedAt) &&
      hash(without(before, ["orgId", "updatedAt"])) === hash(without(after, ["orgId", "updatedAt"]))
    )
  }
  if (table === "organizerDashboardOrganizations" && before.orgId === orgId) {
    return (
      after.feeRevision === (input.phase === "apply" ? 1 : before.feeRevision) &&
      (input.phase !== "apply" || before.feeRevision === undefined) &&
      ["updating", "ready"].includes(String(after.pricingStatus)) &&
      instant(after.updatedAt) &&
      hash(without(before, ["feeRevision", "pricingStatus", "updatedAt"])) ===
        hash(without(after, ["feeRevision", "pricingStatus", "updatedAt"]))
    )
  }
  if (table === "organizerDashboardPricingJobs" && before.orgId === orgId) {
    return (
      pricingJobMatches(after, input) &&
      hash(
        without(before, [
          "status",
          "eventCursor",
          "activeEventId",
          "tierCursor",
          "processedEvents",
          "processedTiers",
          "updatedTiers",
          "updatedAt",
        ]),
      ) ===
        hash(
          without(after, [
            "status",
            "eventCursor",
            "activeEventId",
            "tierCursor",
            "processedEvents",
            "processedTiers",
            "updatedTiers",
            "updatedAt",
          ]),
        )
    )
  }
  const target = (input.before.catalogEvents ?? []).find((event) => event.eventKey === input.targetEventKey)
  if (
    table === "catalogTicketTiers" &&
    before.eventId === target?._id &&
    before.archivedAt === undefined &&
    target?.status !== "archived" &&
    target?.deletedAt === undefined
  ) {
    return (
      before.feeCents !== 0 &&
      after.feeCents === 0 &&
      instant(after.updatedAt) &&
      Number.isSafeInteger(after.catalogVersion) &&
      Number(after.catalogVersion) > Number(before.catalogVersion ?? 0) &&
      hash(without(before, ["feeCents", "catalogVersion", "updatedAt"])) ===
        hash(without(after, ["feeCents", "catalogVersion", "updatedAt"]))
    )
  }
  return false
}

/** Full-record comparison, not a table growth exemption. Never returns rows, IDs, hashes or PII.
 * Every original ID survives, including in tables receiving synthetic rows. All original
 * fields hash identically except the explicit target-only ownership/repricing fields above.
 * Unknown side-effect rows (including catalog sync output) fail closed, never get ignored.
 */
export function organizerDashboardMigrationRehearsalSnapshotCompare(input: RehearsalComparisonInput) {
  let idsPreserved = true
  let originalFieldsPreserved = true
  let additionsExpected = true
  let shapeValid = true
  let originalDocumentsChecked = 0
  const additions: RehearsalSnapshot = {}
  const originalMatches: Record<string, boolean> = {}
  for (const table of new Set([...Object.keys(input.before), ...Object.keys(input.after)])) {
    const before = input.before[table] ?? []
    const after = input.after[table] ?? []
    const oldRows = indexed(table, before)
    const newRows = indexed(table, after)
    if (
      oldRows.size !== before.length ||
      newRows.size !== after.length ||
      [...before, ...after].some((row) => typeof keyOf(table, row) !== "string" || keyOf(table, row) === "")
    )
      shapeValid = false
    if (table in input.before && !(table in input.after)) idsPreserved = false
    originalMatches[table] = true
    for (const [id, row] of oldRows) {
      if (table !== "_tables") originalDocumentsChecked += 1
      const next = newRows.get(id)
      if (!next) idsPreserved = false
      if (!next || !originalFieldsMatch(table, row, next, input)) {
        originalFieldsPreserved = false
        originalMatches[table] = false
      }
    }
    additions[table] = after.filter((row) => !oldRows.has(keyOf(table, row)))
    // Empty schema tables may already exist, but unexplained new table names do not pass.
    if (!(table in input.before) && after.length === 0) additionsExpected = false
  }
  const fixtureTables = [
    "orgs",
    "orgMembers",
    "organizerDashboardOrganizations",
    "organizerDashboardContractConsents",
    "organizerDashboardAudit",
  ]
  if (input.phase === "fixtures") {
    if (
      input.orgs.length !== 2 ||
      new Set(input.orgs.map((org) => org.id)).size !== 2 ||
      input.orgs.some((org) => (input.before.orgs ?? []).some((row) => row._id === org.id))
    )
      additionsExpected = false
    for (const table of new Set([...Object.keys(additions), ...fixtureTables])) {
      const rows = additions[table] ?? []
      if (!fixtureTables.includes(table)) {
        if (rows.length !== 0) additionsExpected = false
        continue
      }
      if (rows.length !== input.orgs.length || rows.some((row) => !fixtureRowMatches(table, row, input)))
        additionsExpected = false
      for (const org of input.orgs) {
        const matching = rows.filter((row) => (table === "orgs" ? row._id : row.orgId) === org.id)
        const createdAt = (additions.orgs ?? []).find((row) => row._id === org.id)?.createdAt
        if (
          matching.length !== 1 ||
          (matching[0]?.createdAt ?? matching[0]?.acceptedAt ?? matching[0]?.at) !== createdAt
        )
          additionsExpected = false
      }
    }
  } else {
    const expectedNotes =
      input.phase === "apply"
        ? [`event:${input.targetEventKey}`]
        : input.backfillChanges.map((changed) => `backfill:${input.targetEventKey}:${changed}`)
    const actualNotes: unknown[] = []
    for (const [table, rows] of Object.entries(additions)) {
      if (table === "organizerDashboardAudit") {
        for (const row of rows) {
          if (
            !instant(row.at) ||
            !generatedRowMatches(row, {
              orgId: input.orgs[0]?.id,
              actorUserId: input.adminUserId,
              area: "migration",
              action: "migrated",
              at: row.at,
              note: row.note,
            })
          )
            additionsExpected = false
          actualNotes.push(row.note)
        }
      } else if (table === "organizerDashboardPricingJobs" && input.phase === "apply") {
        if (rows.length !== 1 || !pricingJobMatches(rows[0] ?? {}, input)) additionsExpected = false
      } else if (rows.length !== 0) additionsExpected = false
    }
    if (hash(actualNotes.sort()) !== hash([...expectedNotes].sort())) additionsExpected = false
    if (input.phase === "apply" && (additions.organizerDashboardPricingJobs ?? []).length !== 1)
      additionsExpected = false
    if (input.phase === "backfill") {
      const changedOrders = (input.before.ticketOrders ?? []).filter(
        (row) => row.eventKey === input.targetEventKey && row.orgId === undefined,
      ).length
      if (
        input.backfillChanges.some((changed) => !Number.isSafeInteger(changed) || changed <= 0) ||
        input.backfillChanges.reduce((total, changed) => total + changed, 0) !== changedOrders
      )
        additionsExpected = false
    }
  }
  const targetEvents = (input.after.catalogEvents ?? []).filter((row) => row.eventKey === input.targetEventKey)
  const targetOwnershipExpected =
    input.phase === "fixtures" ||
    (targetEvents.length === 1 &&
      targetEvents[0]?.orgId === input.orgs[0]?.id &&
      (input.phase !== "backfill" ||
        (input.after.ticketOrders ?? [])
          .filter((row) => row.eventKey === input.targetEventKey)
          .every((row) => row.orgId === input.orgs[0]?.id)))
  const targetConfig = (input.after.organizerDashboardOrganizations ?? []).filter(
    (row) => row.orgId === input.orgs[0]?.id,
  )
  const pricingRequestExpected =
    input.phase === "fixtures" ||
    (targetConfig.length === 1 &&
      targetConfig[0]?.feeRevision === 1 &&
      ["updating", "ready"].includes(String(targetConfig[0]?.pricingStatus)))
  const passed =
    shapeValid &&
    idsPreserved &&
    originalFieldsPreserved &&
    additionsExpected &&
    targetOwnershipExpected &&
    pricingRequestExpected
  return {
    passed,
    shapeValid,
    idsPreserved,
    originalFieldsPreserved,
    additionsExpected,
    targetOwnershipExpected,
    originalDocumentsChecked,
    eventFieldsPreserved: originalMatches.catalogEvents ?? true,
    orderFieldsPreserved: originalMatches.ticketOrders ?? true,
  }
}
