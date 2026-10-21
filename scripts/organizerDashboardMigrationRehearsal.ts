import { spawnSync } from "node:child_process"
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { ConvexHttpClient } from "convex/browser"
import { makeFunctionReference } from "convex/server"
import * as v from "valibot"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerContractDocuments } from "#src/organizer/dashboard/contracts/organizerContractDocuments.ts"
import {
  type RehearsalSnapshot,
  organizerDashboardMigrationRehearsalSnapshotCompare,
} from "./organizerDashboardMigrationRehearsalSnapshotCompare.ts"
import { localRehearsalLoopbackValidate } from "./localRehearsalLoopbackValidate.ts"
import { organizerDashboardMigrationRehearsalEvidenceEvaluate } from "./organizerDashboardMigrationRehearsalEvidenceEvaluate.ts"
import { organizerDashboardMigrationRehearsalManifestCreate } from "./organizerDashboardMigrationRehearsalManifestCreate.ts"

/**
 * Real migration rehearsal against the private local prod-copy backend.
 *
 * Reproducible invocation (from the worktree root, after deploy+fixtures):
 *   bun --cwd /home/leo/.t3code-david/worktrees/eventoren/feature-veranstalter-dashboard \
 *     -e 'import { organizerDashboardMigrationRehearsalRun } from "./scripts/organizerDashboardMigrationRehearsal.ts"; \
 *          const r = await organizerDashboardMigrationRehearsalRun(); \
 *          console.log(JSON.stringify(r.success ? r.data : { success: false })); \
 *          if (!r.success) { console.error(r.op, r.errorMessage); process.exit(1) }'
 *
 * Fail-closed: bootstrap verify first, literal 127.0.0.1:13470 only, private
 * files must be 0600 non-symlinks, backend identity guarded, inherited
 * CONVEX_* env scrubbed for every child. Stdout carries numeric counts,
 * booleans, and paths only — never tokens or buyer PII.
 */

const localRehearsalUrl = "http://127.0.0.1:13470"
const localBackendIdentity = "eventoren-local-rehearsal"
const localTestMarker = "eventoren-local-rehearsal-migration"
const backfillPageSize = 25
const backfillRescanPageSize = 100

type RehearsalSummary = {
  readonly verify: boolean
  readonly cronMentions: number
  readonly multiPageCoverage: boolean
  readonly tablesBaseline: number
  readonly documentsBaseline: number
  readonly tablesFinal: number
  readonly documentsFinal: number
  readonly unownedEventsBaseline: number
  readonly targetOrders: number
  readonly targetPaidOrders: number
  readonly syntheticOrgsCreated: number
  readonly applyFirst: { orgs: number; events: number; roles: number }
  readonly applySecond: { orgs: number; events: number; roles: number }
  readonly invalidManifestRefused: boolean
  readonly customerApplyRefused: boolean
  readonly customerBackfillRefused: boolean
  readonly wrongOrgRefused: boolean
  readonly ownerStillOriginalAfterWrongOrg: boolean
  readonly refusedApplyTargetChecksPassed: boolean
  readonly fixtureCheckpointMatchesExpected: boolean
  readonly applyCheckpointMatchesExpected: boolean
  readonly backfillCheckpointMatchesExpected: boolean
  readonly originalFieldsPreserved: boolean
  readonly baselineDocumentsChecked: number
  readonly baselineTableMappingsChecked: number
  readonly checkpointDocumentComparisons: number
  readonly backfillPages: number
  readonly backfillScanned: number
  readonly backfillChanged: number
  readonly backfillRescanChanged: number
  readonly backfillRescanScanned: number
  readonly backfillRescanComplete: boolean
  readonly auditBaseline: number
  readonly auditAfterFixtures: number
  readonly consentEvidenceBaseline: number
  readonly consentEvidenceAfterFixtures: number
  readonly consentEvidenceFinal: number
  readonly auditAfterApplies: number
  readonly auditFinal: number
  readonly idHashesPreserved: boolean
  readonly countDeltasAllowlisted: boolean
  readonly auditMatchesBackfillPages: boolean
  readonly orderFieldsPreserved: boolean
  readonly eventFieldsPreserved: boolean
  readonly controlEventsUnowned: boolean
  readonly controlOrdersUnchanged: boolean
  readonly restoreToolAvailable: boolean
  readonly rollbackVerified: false
  readonly reportPath: string
  readonly manifestPath: string
  readonly baselinePath: string
  readonly postFixturesPath: string
  readonly midPath: string
  readonly finalPath: string
}

type ZipSummary = {
  tables: Record<string, { count: number; idHash: string }>
  unownedEventKeys: string[]
  orderCountByEventKey: Record<string, number>
  paidOrdersByEventKey: Record<string, number>
  documents: RehearsalSnapshot
}

function rehearsalFail(message: string) {
  return createResultError("organizerDashboardMigrationRehearsalRun", message)
}

function rehearsalStateRoot(): string {
  const raw = process.env.LOCAL_REHEARSAL_STATE_ROOT ?? join(homedir(), ".local/state/eventoren/local-rehearsal")
  const canon = realpathSync(raw)
  const base = join(homedir(), ".local/state/eventoren")
  if (canon !== base && !canon.startsWith(`${base}/`)) throw new Error("state root escape")
  return canon
}

function rehearsalPrivateFileCheck(path: string): void {
  const st = lstatSync(path)
  if (!st.isFile() || st.isSymbolicLink()) throw new Error(`refused file at ${path}`)
  const mode = statSync(path).mode & 0o777
  if (mode & 0o077) throw new Error(`refused permissions at ${path}`)
}

function rehearsalScrubbedEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("CONVEX_")) continue
    if (value !== undefined) env[key] = value
  }
  return env
}

function rehearsalRunClosed(argv: [string, ...string[]], cwd: string): { status: number; stdout: string } {
  const child = spawnSync(argv[0], argv.slice(1), {
    cwd,
    env: rehearsalScrubbedEnv(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
  return { status: child.status ?? 1, stdout: child.stdout ?? "" }
}

const zipSummaryPython = `
import zipfile, json, hashlib, sys
path = sys.argv[1]
z = zipfile.ZipFile(path)
tables = {}
documents = {}
for n in z.namelist():
  if not n.endswith("/documents.jsonl"):
    continue
  table = n.split("/")[0]
  if table in documents:
    raise ValueError("duplicate table entry")
  ids = []
  count = 0
  documents[table] = []
  for line in z.read(n).decode().splitlines():
    if not line.strip():
      continue
    count += 1
    row = json.loads(line)
    documents[table].append(row)
    ids.append(row.get("_id", row.get("name", "")))
  ids.sort()
  tables[table] = {"count": count, "idHash": hashlib.sha256("\\n".join(ids).encode()).hexdigest()}

events = [json.loads(l) for l in z.read("catalogEvents/documents.jsonl").decode().splitlines() if l.strip()]
orders = [json.loads(l) for l in z.read("ticketOrders/documents.jsonl").decode().splitlines() if l.strip()]
unowned = sorted(e.get("eventKey", "") for e in events if "orgId" not in e and not e.get("deletedAt"))
per_key = {}
paid = {}
for o in orders:
  k = o.get("eventKey", "")
  per_key[k] = per_key.get(k, 0) + 1
  if o.get("paidAt"):
    paid[k] = paid.get(k, 0) + 1
print(json.dumps({
  "tables": tables,
  "unownedEventKeys": unowned,
  "orderCountByEventKey": per_key,
  "paidOrdersByEventKey": paid,
  "documents": documents,
}))
`

function rehearsalSummarizeZip(path: string, cwd: string): ZipSummary {
  rehearsalPrivateFileCheck(path)
  const child = spawnSync("python3", ["-c", zipSummaryPython, path], {
    cwd,
    env: rehearsalScrubbedEnv(),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
  if (child.status !== 0) throw new Error("zip summarize failed")
  const parsed: unknown = JSON.parse(child.stdout)
  const schema = v.object({
    tables: v.record(v.string(), v.object({ count: v.number(), idHash: v.string() })),
    unownedEventKeys: v.array(v.string()),
    orderCountByEventKey: v.record(v.string(), v.number()),
    paidOrdersByEventKey: v.record(v.string(), v.number()),
    documents: v.record(v.string(), v.array(v.record(v.string(), v.unknown()))),
  })
  const result = v.safeParse(schema, parsed)
  if (!result.success) throw new Error("zip summary shape refused")
  return result.output
}

type FixtureTokens = { customerToken: string; adminToken: string; customerUserId: string; adminUserId: string }

function rehearsalReadFixtureTokens(path: string): FixtureTokens {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"))
  const schema = v.object({
    sessions: v.array(v.object({ role: v.string(), token: v.string(), userId: v.string() })),
  })
  const result = v.safeParse(schema, parsed)
  if (!result.success) throw new Error("fixture token shape refused")
  const customer = result.output.sessions.find((s) => s.role === "customer")
  const admin = result.output.sessions.find((s) => s.role === "admin")
  if (!customer || !admin) throw new Error("fixture roles missing")
  if (customer.token.length < 16 || admin.token.length < 16) throw new Error("fixture tokens too short")
  return {
    customerToken: customer.token,
    adminToken: admin.token,
    customerUserId: customer.userId,
    adminUserId: admin.userId,
  }
}

function rehearsalTableCount(summary: ZipSummary, table: string): number {
  return summary.tables[table]?.count ?? 0
}

function rehearsalIsSuccess(value: unknown): value is { success: true; data: unknown } {
  if (typeof value !== "object" || value === null) return false
  return (value as { success?: unknown }).success === true
}

function rehearsalCountsOf(value: unknown): { orgs: number; events: number; roles: number } {
  const schema = v.object({
    orgsInitialized: v.number(),
    eventsAssigned: v.number(),
    rolesAssigned: v.number(),
  })
  const result = v.safeParse(schema, value)
  if (!result.success) throw new Error("apply count shape refused")
  return {
    orgs: result.output.orgsInitialized,
    events: result.output.eventsAssigned,
    roles: result.output.rolesAssigned,
  }
}

function rehearsalBackfillOf(value: unknown): { scanned: number; changed: number; cursor: string; isDone: boolean } {
  const schema = v.object({
    scanned: v.number(),
    changed: v.number(),
    cursor: v.string(),
    isDone: v.boolean(),
  })
  const result = v.safeParse(schema, value)
  if (!result.success) throw new Error("backfill count shape refused")
  return result.output
}

const planReference = makeFunctionReference<"query">("organizerDashboardMigration:organizerDashboardMigrationPlanQuery")
const orgCreateReference = makeFunctionReference<"mutation">(
  "organizerDashboard:organizerDashboardOrganizationCreateMutation",
)

async function rehearsalPlanListsEvent(
  client: ConvexHttpClient,
  adminToken: string,
  eventKey: string,
): Promise<boolean> {
  let cursor: string | null = null
  for (let page = 0; page < 10; page += 1) {
    const raw: unknown = await client.query(planReference, {
      token: adminToken,
      paginationOpts: { cursor, numItems: 50 },
    })
    if (!rehearsalIsSuccess(raw)) throw new Error("plan query refused")
    const parsed = v.safeParse(
      v.object({
        page: v.array(v.object({ eventKey: v.string() })),
        isDone: v.boolean(),
        continueCursor: v.string(),
      }),
      raw.data,
    )
    if (!parsed.success) throw new Error("plan page shape refused")
    if (parsed.output.page.some((item) => item.eventKey === eventKey)) return true
    if (parsed.output.isDone) return false
    cursor = parsed.output.continueCursor
  }
  throw new Error("plan pagination did not finish")
}

/**
 * Executes the full local migration rehearsal and returns numeric/boolean
 * evidence only. Any token or buyer PII stays in-process; thrown errors and
 * the returned summary carry no secrets.
 */
export async function organizerDashboardMigrationRehearsalRun(): PromiseResult<RehearsalSummary> {
  const op = "organizerDashboardMigrationRehearsalRun"
  try {
    const repoRoot = process.cwd()
    const target = localRehearsalLoopbackValidate(localRehearsalUrl)
    if (!target.success) return createResultError(op, target.errorMessage)
    const stateRoot = rehearsalStateRoot()
    const cliEnv = join(stateRoot, "cli.env")
    const fixtureFile = join(stateRoot, "staging/fixture-tokens.json")
    rehearsalPrivateFileCheck(cliEnv)
    rehearsalPrivateFileCheck(fixtureFile)

    const verify = rehearsalRunClosed(["bash", "ops/convex/local-rehearsal/bootstrap.bash", "verify"], repoRoot)
    if (verify.status !== 0) return rehearsalFail("bootstrap verify refused")

    const logs = rehearsalRunClosed(["podman", "logs", localBackendIdentity], repoRoot)
    const cronMentions =
      logs.status === 0 ? logs.stdout.split("\n").filter((line) => /cron|schedul/i.test(line)).length : -1

    const stamp = new Date().toISOString().replaceAll(/[-:.]/g, "").slice(0, 15)
    const rehearsalDir = join(stateRoot, "rehearsal")
    mkdirSync(rehearsalDir, { recursive: true, mode: 0o700 })
    const baselinePath = join(rehearsalDir, `local-baseline-${stamp}.zip`)
    const finalPath = join(rehearsalDir, `local-final-${stamp}.zip`)
    const postFixturesPath = join(rehearsalDir, `local-fixtures-${stamp}.zip`)
    const midPath = join(rehearsalDir, `local-mid-${stamp}.zip`)
    const manifestPath = join(rehearsalDir, `migration-manifest-${stamp}.json`)
    const reportPath = join(rehearsalDir, `migration-report-${stamp}.json`)
    if (existsSync(baselinePath)) return rehearsalFail("baseline path already exists")

    const exportBaseline = rehearsalRunClosed(
      ["bunx", "convex", "export", "--env-file", cliEnv, "--path", baselinePath],
      repoRoot,
    )
    if (exportBaseline.status !== 0 || !existsSync(baselinePath)) return rehearsalFail("local baseline export refused")
    chmodSync(baselinePath, 0o600)
    const s0 = rehearsalSummarizeZip(baselinePath, repoRoot)

    const tokens = rehearsalReadFixtureTokens(fixtureFile)
    const client = new ConvexHttpClient(localRehearsalUrl)

    const slugSuffix = Date.now()
      .toString(36)
      .toLowerCase()
      .replaceAll(/[^a-z0-9]/g, "")
    const slugA = `local-rehearsal-a-${slugSuffix}`
    const slugB = `local-rehearsal-b-${slugSuffix}`
    // termsAccepted/dpaAccepted are local-test consent flags only here; they
    // carry no legal meaning for these synthetic rehearsal orgs.
    const orgACreated: unknown = await client.mutation(orgCreateReference, {
      token: tokens.customerToken,
      name: "Local Rehearsal Org A",
      slug: slugA,
      kind: "verein",
      termsRevision: organizerContractDocuments.terms.revision,
      dpaRevision: organizerContractDocuments.dpa.revision,
      termsAccepted: true,
      dpaAccepted: true,
    })
    if (!rehearsalIsSuccess(orgACreated)) return rehearsalFail("synthetic org A create refused")
    const orgAParsed = v.safeParse(v.object({ orgId: v.string() }), orgACreated.data)
    if (!orgAParsed.success) return rehearsalFail("synthetic org A shape refused")
    const orgBCreated: unknown = await client.mutation(orgCreateReference, {
      token: tokens.customerToken,
      name: "Local Rehearsal Org B",
      slug: slugB,
      kind: "verein",
      termsRevision: organizerContractDocuments.terms.revision,
      dpaRevision: organizerContractDocuments.dpa.revision,
      termsAccepted: true,
      dpaAccepted: true,
    })
    if (!rehearsalIsSuccess(orgBCreated)) return rehearsalFail("synthetic org B create refused")
    const orgBParsed = v.safeParse(v.object({ orgId: v.string() }), orgBCreated.data)
    if (!orgBParsed.success) return rehearsalFail("synthetic org B shape refused")
    const orgA = orgAParsed.output.orgId
    const orgB = orgBParsed.output.orgId
    const exportFixtures = rehearsalRunClosed(
      ["bunx", "convex", "export", "--env-file", cliEnv, "--path", postFixturesPath],
      repoRoot,
    )
    if (exportFixtures.status !== 0 || !existsSync(postFixturesPath))
      return rehearsalFail("post-fixture export refused")
    chmodSync(postFixturesPath, 0o600)
    const sf = rehearsalSummarizeZip(postFixturesPath, repoRoot)

    const ranked = s0.unownedEventKeys
      .map((key) => ({ key, orders: s0.orderCountByEventKey[key] ?? 0 }))
      .filter((entry) => entry.orders > 0)
      .sort((a, b) => b.orders - a.orders)
    if (ranked.length === 0) return rehearsalFail("no unowned event with orders in baseline")
    const targetKey = ranked[0]?.key ?? ""
    const targetOrders = ranked[0]?.orders ?? 0
    if (targetKey === "") return rehearsalFail("target event selection refused")
    const targetPaidOrders = s0.paidOrdersByEventKey[targetKey] ?? 0

    const manifestInput = {
      orgInits: [{ orgId: orgA, kind: "verein" }],
      eventAssignments: [{ eventKey: targetKey, orgId: orgA }],
      roleAssignments: [{ userId: tokens.customerUserId, orgId: orgA, role: "inhaber" }],
    }
    const manifest = organizerDashboardMigrationRehearsalManifestCreate(manifestInput)
    if (!manifest.success) return createResultError(op, manifest.errorMessage)
    writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          marker: localTestMarker,
          localTestOnly: true,
          neverProductionOwnership: true,
          manifest: manifest.data,
        },
        null,
        2,
      ),
      { mode: 0o600, flag: "wx" },
    )
    chmodSync(manifestPath, 0o600)

    const comparisonScope = {
      orgs: [
        { id: orgA, slug: slugA, name: "Local Rehearsal Org A" },
        { id: orgB, slug: slugB, name: "Local Rehearsal Org B" },
      ],
      customerUserId: tokens.customerUserId,
      adminUserId: tokens.adminUserId,
      targetEventKey: targetKey,
    }
    const fixtureEvidence = organizerDashboardMigrationRehearsalSnapshotCompare({
      ...comparisonScope,
      before: s0.documents,
      after: sf.documents,
      phase: "fixtures",
      backfillChanges: [],
    })
    if (!fixtureEvidence.passed) return rehearsalFail("synthetic creation checkpoint comparison failed")

    const applyName = makeFunctionReference<"mutation">(
      "organizerDashboardMigration:organizerDashboardMigrationApplyMutation",
    )
    const backfillName = makeFunctionReference<"mutation">(
      "organizerDashboardMigration:organizerDashboardMigrationBackfillMutation",
    )

    const invalidManifest = organizerDashboardMigrationRehearsalManifestCreate({
      orgInits: [],
      eventAssignments: [
        { eventKey: targetKey, orgId: orgA },
        { eventKey: "local-rehearsal-no-such-event", orgId: orgB },
      ],
      roleAssignments: [],
    })
    if (!invalidManifest.success) return createResultError(op, invalidManifest.errorMessage)
    const invalidAttempt: unknown = await client.mutation(applyName, {
      token: tokens.adminToken,
      ...invalidManifest.data,
    })
    const invalidManifestRefused = !rehearsalIsSuccess(invalidAttempt)
    if (!invalidManifestRefused) return rehearsalFail("invalid manifest was not refused")
    const stillUnownedAfterInvalid = await rehearsalPlanListsEvent(client, tokens.adminToken, targetKey)
    if (!stillUnownedAfterInvalid) return rehearsalFail("invalid manifest caused writes")

    const customerAttempt: unknown = await client.mutation(applyName, {
      token: tokens.customerToken,
      ...manifest.data,
    })
    const customerApplyRefused = !rehearsalIsSuccess(customerAttempt)
    if (!customerApplyRefused) return rehearsalFail("customer apply was not refused")
    const stillUnownedAfterCustomer = await rehearsalPlanListsEvent(client, tokens.adminToken, targetKey)
    if (!stillUnownedAfterCustomer) return rehearsalFail("customer apply caused writes")

    const firstApplied: unknown = await client.mutation(applyName, {
      token: tokens.adminToken,
      ...manifest.data,
    })
    if (!rehearsalIsSuccess(firstApplied)) return rehearsalFail("valid manifest apply refused")
    const applyFirst = rehearsalCountsOf(firstApplied.data)
    if (applyFirst.events !== 1) return rehearsalFail("valid manifest assigned no event")

    const secondApplied: unknown = await client.mutation(applyName, {
      token: tokens.adminToken,
      ...manifest.data,
    })
    if (!rehearsalIsSuccess(secondApplied)) return rehearsalFail("identical manifest reapply refused")
    const applySecond = rehearsalCountsOf(secondApplied.data)
    if (applySecond.orgs !== 0 || applySecond.events !== 0 || applySecond.roles !== 0) {
      return rehearsalFail("identical manifest reapply was not a no-op")
    }

    const wrongOrgAttempt: unknown = await client.mutation(applyName, {
      token: tokens.adminToken,
      orgInits: [],
      eventAssignments: [{ eventKey: targetKey, orgId: orgB }],
      roleAssignments: [],
    })
    const wrongOrgRefused = !rehearsalIsSuccess(wrongOrgAttempt)
    if (!wrongOrgRefused) return rehearsalFail("wrong-org apply was not refused")
    const ownerCheck: unknown = await client.mutation(applyName, {
      token: tokens.adminToken,
      ...manifest.data,
    })
    if (!rehearsalIsSuccess(ownerCheck)) return rehearsalFail("owner changed after wrong-org refusal")
    const ownerStillOriginalAfterWrongOrg =
      rehearsalCountsOf(ownerCheck.data).events === 0 &&
      rehearsalCountsOf(ownerCheck.data).orgs === 0 &&
      rehearsalCountsOf(ownerCheck.data).roles === 0

    const customerBackfill: unknown = await client.mutation(backfillName, {
      token: tokens.customerToken,
      eventKey: targetKey,
      pageSize: backfillPageSize,
    })
    const customerBackfillRefused = !rehearsalIsSuccess(customerBackfill)
    if (!customerBackfillRefused) return rehearsalFail("customer backfill was not refused")

    const exportAfterApplies = rehearsalRunClosed(
      ["bunx", "convex", "export", "--env-file", cliEnv, "--path", midPath],
      repoRoot,
    )
    if (exportAfterApplies.status !== 0) return rehearsalFail("mid-run export refused")
    chmodSync(midPath, 0o600)
    const s1 = rehearsalSummarizeZip(midPath, repoRoot)

    const pageSizeForTarget =
      targetOrders >= 3 ? Math.max(1, Math.min(backfillPageSize, Math.floor(targetOrders / 3))) : 1
    let backfillPages = 0
    let backfillScanned = 0
    let backfillChanged = 0
    const backfillChanges: number[] = []
    let cursor: string | null = null
    for (let page = 0; page < 30; page += 1) {
      const raw: unknown = await client.mutation(backfillName, {
        token: tokens.adminToken,
        eventKey: targetKey,
        ...(cursor === null ? {} : { cursor }),
        pageSize: pageSizeForTarget,
      })
      if (!rehearsalIsSuccess(raw)) return rehearsalFail("backfill page refused")
      const batch = rehearsalBackfillOf(raw.data)
      backfillPages += 1
      backfillScanned += batch.scanned
      backfillChanged += batch.changed
      if (batch.changed > 0) backfillChanges.push(batch.changed)
      if (batch.isDone) break
      cursor = batch.cursor
      if (page === 29) return rehearsalFail("backfill pagination did not finish")
    }
    const multiPageCoverage = backfillPages >= 3
    if (!multiPageCoverage && targetOrders >= 3) {
      return rehearsalFail("backfill did not exercise three pages")
    }

    const rescan: unknown = await client.mutation(backfillName, {
      token: tokens.adminToken,
      eventKey: targetKey,
      pageSize: backfillRescanPageSize,
    })
    if (!rehearsalIsSuccess(rescan)) return rehearsalFail("backfill rescan refused")
    const rescanBatch = rehearsalBackfillOf(rescan.data)
    const backfillRescanChanged = rescanBatch.changed
    if (backfillRescanChanged !== 0) return rehearsalFail("backfill rescan was not a no-op")

    const exportFinal = rehearsalRunClosed(
      ["bunx", "convex", "export", "--env-file", cliEnv, "--path", finalPath],
      repoRoot,
    )
    if (exportFinal.status !== 0 || !existsSync(finalPath)) return rehearsalFail("final export refused")
    chmodSync(finalPath, 0o600)
    const s2 = rehearsalSummarizeZip(finalPath, repoRoot)

    const evidence = organizerDashboardMigrationRehearsalEvidenceEvaluate({
      baseline: s0.documents,
      postFixtures: sf.documents,
      mid: s1.documents,
      final: s2.documents,
      ...comparisonScope,
      backfillChanges,
    })
    const { idHashesPreserved, countDeltasAllowlisted } = evidence
    const { auditMatchesBackfillPages, orderFieldsPreserved, eventFieldsPreserved } = evidence
    const refusedApplyTargetChecksPassed =
      stillUnownedAfterInvalid && stillUnownedAfterCustomer && ownerStillOriginalAfterWrongOrg
    const controlEventsUnowned =
      evidence.idHashesPreserved &&
      evidence.eventFieldsPreserved &&
      s0.unownedEventKeys.filter((key) => key !== targetKey).every((key) => s2.unownedEventKeys.includes(key))
    const controlOrdersUnchanged =
      evidence.idHashesPreserved &&
      evidence.orderFieldsPreserved &&
      Object.entries(s0.orderCountByEventKey)
        .filter(([key]) => key !== targetKey)
        .every(([key, count]) => (s2.orderCountByEventKey[key] ?? -1) === count) &&
      Object.keys(s2.orderCountByEventKey).every(
        (key) => key === targetKey || (s0.orderCountByEventKey[key] ?? -1) === s2.orderCountByEventKey[key],
      )
    if (!stillUnownedAfterInvalid || !stillUnownedAfterCustomer) {
      return rehearsalFail("refused apply left the target assigned")
    }

    const snapshotPath = join(stateRoot, "snapshots/prod-20261020.zip")
    let restoreToolAvailable = false
    try {
      rehearsalPrivateFileCheck(snapshotPath)
      const help = rehearsalRunClosed(["bash", "ops/convex/local-rehearsal/restore.bash", "--help"], repoRoot)
      restoreToolAvailable = help.status === 0
    } catch {
      restoreToolAvailable = false
    }

    const countOf = (s: ZipSummary): number =>
      Object.entries(s.tables).reduce((total, [name, table]) => total + (name === "_tables" ? 0 : table.count), 0)
    const tableCountOf = (s: ZipSummary): number => Object.keys(s.tables).filter((name) => name !== "_tables").length
    const summary: RehearsalSummary = {
      verify: true,
      cronMentions,
      multiPageCoverage,
      tablesBaseline: tableCountOf(s0),
      documentsBaseline: countOf(s0),
      tablesFinal: tableCountOf(s2),
      documentsFinal: countOf(s2),
      unownedEventsBaseline: s0.unownedEventKeys.length,
      targetOrders,
      targetPaidOrders,
      syntheticOrgsCreated: 2,
      applyFirst,
      applySecond,
      invalidManifestRefused,
      customerApplyRefused,
      customerBackfillRefused,
      wrongOrgRefused,
      ownerStillOriginalAfterWrongOrg,
      refusedApplyTargetChecksPassed,
      fixtureCheckpointMatchesExpected: evidence.fixtureCheckpointMatchesExpected,
      applyCheckpointMatchesExpected: evidence.applyCheckpointMatchesExpected,
      backfillCheckpointMatchesExpected: evidence.backfillCheckpointMatchesExpected,
      originalFieldsPreserved: evidence.originalFieldsPreserved,
      baselineDocumentsChecked: evidence.baselineDocumentsChecked,
      baselineTableMappingsChecked: evidence.baselineTableMappingsChecked,
      checkpointDocumentComparisons: evidence.checkpointDocumentComparisons,
      backfillPages,
      backfillScanned,
      backfillChanged,
      backfillRescanChanged,
      backfillRescanScanned: rescanBatch.scanned,
      backfillRescanComplete: rescanBatch.isDone,
      auditBaseline: rehearsalTableCount(s0, "organizerDashboardAudit"),
      auditAfterFixtures: rehearsalTableCount(sf, "organizerDashboardAudit"),
      consentEvidenceBaseline: rehearsalTableCount(s0, "organizerDashboardContractConsents"),
      consentEvidenceAfterFixtures: rehearsalTableCount(sf, "organizerDashboardContractConsents"),
      consentEvidenceFinal: rehearsalTableCount(s2, "organizerDashboardContractConsents"),
      auditAfterApplies: rehearsalTableCount(s1, "organizerDashboardAudit"),
      auditFinal: rehearsalTableCount(s2, "organizerDashboardAudit"),
      idHashesPreserved,
      countDeltasAllowlisted,
      auditMatchesBackfillPages,
      orderFieldsPreserved,
      eventFieldsPreserved,
      controlEventsUnowned,
      controlOrdersUnchanged,
      restoreToolAvailable,
      rollbackVerified: false,
      reportPath,
      manifestPath,
      baselinePath,
      postFixturesPath,
      midPath,
      finalPath,
    }
    writeFileSync(reportPath, JSON.stringify({ marker: localTestMarker, localTestOnly: true, summary }, null, 2), {
      mode: 0o600,
      flag: "wx",
    })
    chmodSync(reportPath, 0o600)
    if (!evidence.passed || !controlEventsUnowned || !controlOrdersUnchanged || !refusedApplyTargetChecksPassed) {
      return rehearsalFail("checkpoint comparison failed; private report contains boolean/count evidence only")
    }
    return createResult(summary)
  } catch {
    // SDK/JSON errors can contain arguments or copied data; never echo their message.
    return rehearsalFail("rehearsal I/O or response validation failed (details suppressed)")
  }
}
