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
import * as v from "valibot"
import { createResult, createResultError, type PromiseResult } from "#result"
import { localRehearsalLoopbackValidate } from "./localRehearsalLoopbackValidate.ts"
import { organizerDashboardMigrationRehearsalManifestCreate } from "./organizerDashboardMigrationRehearsalManifestCreate.ts"

/**
 * Live legacy role-write coverage against the private local prod-copy backend.
 *
 * Seeds synthetic LEGACY org/member rows (core role member/guest, NO
 * organizerRole, NO dashboard config) through the staging-only
 * rehearsalFixtures module, then applies an explicit admin manifest with
 * orgInits + roleAssignments. Never touches copied production users and never
 * touches the copied event selected by the event-migration harness.
 *
 * Reproducible invocation (from the worktree root, after deploy+fixtures):
 *   bun --cwd /home/leo/.t3code-david/worktrees/eventoren/feature-veranstalter-dashboard \
 *     -e 'import { organizerDashboardMigrationRoleCoverageRun } from "./scripts/organizerDashboardMigrationRehearsalRoleCoverage.ts"; \
 *          const r = await organizerDashboardMigrationRoleCoverageRun(); \
 *          console.log(JSON.stringify(r.success ? r.data : { success: false })); \
 *          if (!r.success) { console.error(r.op, r.errorMessage); process.exit(1) }'
 *
 * Stdout carries numeric counts, booleans, and paths only — never tokens.
 */

const localRehearsalUrl = "http://127.0.0.1:13470"
const localTestMarker = "eventoren-local-rehearsal-migration"
const legacyRunTag = "role1"

type RoleCoverageSummary = {
  readonly verify: boolean
  readonly seedReused: boolean
  readonly preNoOrganizerRole: boolean
  readonly preCoreRolesIntact: boolean
  readonly preNoConfig: boolean
  readonly applyFirst: { orgs: number; events: number; roles: number }
  readonly postRoleEinlass: boolean
  readonly postCoreRoleUnchanged: boolean
  readonly postConfigContractsEmpty: boolean
  readonly postConfigUnconfirmed: boolean
  readonly postAuditDelta: number
  readonly reapplyZero: boolean
  readonly reapplyNoAuditDup: boolean
  readonly promoteGuestToOwner: boolean
  readonly lastOwnerDowngradeRefused: boolean
  readonly postRefusalUnchanged: boolean
  readonly postRefusalNoAuditDup: boolean
  readonly orgId: string
  readonly reportPath: string
}

function roleCoverageFail(message: string) {
  return createResultError("organizerDashboardMigrationRoleCoverageRun", message)
}

function roleCoverageStateRoot(): string {
  const raw = process.env.LOCAL_REHEARSAL_STATE_ROOT ?? join(homedir(), ".local/state/eventoren/local-rehearsal")
  const canon = realpathSync(raw)
  const base = join(homedir(), ".local/state/eventoren")
  if (canon !== base && !canon.startsWith(`${base}/`)) throw new Error("state root escape")
  return canon
}

function roleCoveragePrivateFileCheck(path: string): void {
  const st = lstatSync(path)
  if (!st.isFile() || st.isSymbolicLink()) throw new Error(`refused file at ${path}`)
  const mode = statSync(path).mode & 0o777
  if (mode & 0o077) throw new Error(`refused permissions at ${path}`)
}

function roleCoverageScrubbedEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("CONVEX_")) continue
    if (value !== undefined) env[key] = value
  }
  return env
}

function roleCoverageRunClosed(argv: string[], cwd: string): { status: number; stdout: string } {
  const child = spawnSync(argv[0], argv.slice(1), {
    cwd,
    env: roleCoverageScrubbedEnv(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
  return { status: child.status ?? 1, stdout: child.stdout ?? "" }
}

const seedSchema = v.object({
  marker: v.string(),
  runTag: v.string(),
  orgId: v.string(),
  orgHandle: v.string(),
  orgReused: v.boolean(),
  members: v.array(
    v.object({
      suffix: v.string(),
      userId: v.string(),
      memberId: v.string(),
      role: v.string(),
      userReused: v.boolean(),
      memberReused: v.boolean(),
    }),
  ),
})

const diagnoseSchema = v.object({
  marker: v.string(),
  members: v.array(
    v.object({
      userId: v.string(),
      role: v.string(),
      organizerRole: v.nullable(v.string()),
      updatedAt: v.string(),
    }),
  ),
  config: v.nullable(
    v.object({
      kind: v.string(),
      contracts: v.record(v.string(), v.string()),
      configurationConfirmed: v.boolean(),
      status: v.string(),
    }),
  ),
  auditCount: v.number(),
})

type Diagnose = v.InferOutput<typeof diagnoseSchema>

function roleCoverageIsSuccess(value: unknown): value is { success: true; data: unknown } {
  if (typeof value !== "object" || value === null) return false
  return (value as { success?: unknown }).success === true
}

function roleCoverageCountsOf(value: unknown): { orgs: number; events: number; roles: number } {
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

/**
 * Executes the live legacy role-write coverage and returns numeric/boolean
 * evidence only. Any token stays in-process; thrown errors and the returned
 * summary carry no secrets.
 */
export async function organizerDashboardMigrationRoleCoverageRun(): PromiseResult<RoleCoverageSummary> {
  const op = "organizerDashboardMigrationRoleCoverageRun"
  try {
    const repoRoot = process.cwd()
    const target = localRehearsalLoopbackValidate(localRehearsalUrl)
    if (!target.success) return createResultError(op, target.errorMessage)
    const stateRoot = roleCoverageStateRoot()
    const cliEnv = join(stateRoot, "cli.env")
    const fixtureFile = join(stateRoot, "staging/fixture-tokens.json")
    roleCoveragePrivateFileCheck(cliEnv)
    roleCoveragePrivateFileCheck(fixtureFile)

    const verify = roleCoverageRunClosed(["bash", "ops/convex/local-rehearsal/bootstrap.bash", "verify"], repoRoot)
    if (verify.status !== 0) return roleCoverageFail("bootstrap verify refused")

    const tokensParsed: unknown = JSON.parse(readFileSync(fixtureFile, "utf8"))
    const tokensResult = v.safeParse(
      v.object({
        sessions: v.array(v.object({ role: v.string(), token: v.string(), userId: v.string() })),
      }),
      tokensParsed,
    )
    if (!tokensResult.success) return roleCoverageFail("fixture token shape refused")
    const admin = tokensResult.output.sessions.find((s) => s.role === "admin")
    if (!admin || admin.token.length < 16) return roleCoverageFail("admin fixture token missing")
    const adminToken = admin.token

    const stagingRoot = join(stateRoot, "staging/rehearsal-functions")
    const seed = roleCoverageRunClosed(
      [
        "bunx",
        "convex",
        "run",
        "rehearsalFixtures:rehearsalLegacyOrgSeed",
        `{"marker":"eventoren-local-rehearsal","runTag":"${legacyRunTag}"}`,
        "--env-file",
        cliEnv,
      ],
      stagingRoot,
    )
    if (seed.status !== 0) return roleCoverageFail("legacy org seed refused")
    const seedResult = v.safeParse(seedSchema, JSON.parse(seed.stdout))
    if (!seedResult.success) return roleCoverageFail("legacy seed shape refused")
    const seeded = seedResult.output
    if (seeded.members.length !== 2) return roleCoverageFail("legacy seed member count refused")
    const memberUser = seeded.members.find((m) => m.suffix === "member")
    const guestUser = seeded.members.find((m) => m.suffix === "guest")
    if (!memberUser || !guestUser) return roleCoverageFail("legacy seed roles refused")
    const orgId = seeded.orgId

    const diagnose = async (): Promise<Diagnose> => {
      const probed = roleCoverageRunClosed(
        [
          "bunx",
          "convex",
          "run",
          "rehearsalFixtures:rehearsalLegacyOrgDiagnose",
          `{"marker":"eventoren-local-rehearsal","orgId":"${orgId}"}`,
          "--env-file",
          cliEnv,
        ],
        stagingRoot,
      )
      if (probed.status !== 0) throw new Error("legacy diagnose refused")
      const parsed = v.safeParse(diagnoseSchema, JSON.parse(probed.stdout))
      if (!parsed.success) throw new Error("legacy diagnose shape refused")
      return parsed.output
    }

    const pre = await diagnose()
    const preNoOrganizerRole = pre.members.every((m) => m.organizerRole === null)
    if (!preNoOrganizerRole) return roleCoverageFail("legacy members already carry organizerRole")
    const preCoreRolesIntact =
      pre.members.some((m) => m.role === "member") && pre.members.some((m) => m.role === "guest")
    if (!preCoreRolesIntact) return roleCoverageFail("legacy core roles refused")
    const preNoConfig = pre.config === null
    if (!preNoConfig) return roleCoverageFail("legacy org already configured")
    const auditBefore = pre.auditCount

    const client = new ConvexHttpClient(localRehearsalUrl)
    const applyName = "organizerDashboardMigration:organizerDashboardMigrationApplyMutation"
    const manifestInput = {
      orgInits: [{ orgId, kind: "verein" }],
      eventAssignments: [],
      roleAssignments: [{ userId: memberUser.userId, orgId, role: "einlass" }],
    }
    const manifest = organizerDashboardMigrationRehearsalManifestCreate(manifestInput)
    if (!manifest.success) return createResultError(op, manifest.errorMessage)
    const firstApplied: unknown = await client.mutation(applyName, { token: adminToken, ...manifest.data })
    if (!roleCoverageIsSuccess(firstApplied)) return roleCoverageFail("legacy apply refused")
    const applyFirst = roleCoverageCountsOf(firstApplied.data)
    if (applyFirst.orgs !== 1 || applyFirst.events !== 0 || applyFirst.roles !== 1) {
      return roleCoverageFail("legacy apply counts refused")
    }

    const post = await diagnose()
    const postRoleEinlass = post.members.some((m) => m.userId === memberUser.userId && m.organizerRole === "einlass")
    if (!postRoleEinlass) return roleCoverageFail("legacy organizerRole not written")
    const postCoreRoleUnchanged = post.members.some((m) => m.userId === memberUser.userId && m.role === "member")
    if (!postCoreRoleUnchanged) return roleCoverageFail("legacy core role changed")
    const postConfigContractsEmpty = post.config !== null && Object.keys(post.config.contracts).length === 0
    if (!postConfigContractsEmpty) return roleCoverageFail("legacy contracts not empty")
    const postConfigUnconfirmed = post.config !== null && post.config.configurationConfirmed === false
    if (!postConfigUnconfirmed) return roleCoverageFail("legacy config unexpectedly confirmed")
    const postAuditDelta = post.auditCount - auditBefore
    if (postAuditDelta !== 2) return roleCoverageFail("legacy audit delta refused")

    const secondApplied: unknown = await client.mutation(applyName, { token: adminToken, ...manifest.data })
    if (!roleCoverageIsSuccess(secondApplied)) return roleCoverageFail("legacy reapply refused")
    const applySecond = roleCoverageCountsOf(secondApplied.data)
    const reapplyZero = applySecond.orgs === 0 && applySecond.events === 0 && applySecond.roles === 0
    if (!reapplyZero) return roleCoverageFail("legacy reapply was not a no-op")
    const afterReapply = await diagnose()
    const reapplyNoAuditDup = afterReapply.auditCount === post.auditCount
    if (!reapplyNoAuditDup) return roleCoverageFail("legacy reapply wrote audit dups")

    const promoteManifest = organizerDashboardMigrationRehearsalManifestCreate({
      orgInits: [],
      eventAssignments: [],
      roleAssignments: [{ userId: guestUser.userId, orgId, role: "inhaber" }],
    })
    if (!promoteManifest.success) return createResultError(op, promoteManifest.errorMessage)
    const promoted: unknown = await client.mutation(applyName, { token: adminToken, ...promoteManifest.data })
    if (!roleCoverageIsSuccess(promoted)) return roleCoverageFail("legacy promote refused")
    const promoteGuestToOwner = roleCoverageCountsOf(promoted.data).roles === 1
    if (!promoteGuestToOwner) return roleCoverageFail("legacy promote count refused")
    const afterPromote = await diagnose()
    const auditAfterPromote = afterPromote.auditCount

    const downgradeManifest = organizerDashboardMigrationRehearsalManifestCreate({
      orgInits: [],
      eventAssignments: [],
      roleAssignments: [{ userId: guestUser.userId, orgId, role: "einlass" }],
    })
    if (!downgradeManifest.success) return createResultError(op, downgradeManifest.errorMessage)
    const downgradeAttempt: unknown = await client.mutation(applyName, {
      token: adminToken,
      ...downgradeManifest.data,
    })
    const lastOwnerDowngradeRefused = !roleCoverageIsSuccess(downgradeAttempt)
    if (!lastOwnerDowngradeRefused) return roleCoverageFail("last-owner downgrade was not refused")
    const afterRefusal = await diagnose()
    const stillOwner = afterRefusal.members.some((m) => m.userId === guestUser.userId && m.organizerRole === "inhaber")
    const guestCoreUnchanged = afterRefusal.members.some((m) => m.userId === guestUser.userId && m.role === "guest")
    const postRefusalUnchanged = stillOwner && guestCoreUnchanged
    if (!postRefusalUnchanged) return roleCoverageFail("refused downgrade changed state")
    const postRefusalNoAuditDup = afterRefusal.auditCount === auditAfterPromote
    if (!postRefusalNoAuditDup) return roleCoverageFail("refused downgrade wrote audits")

    const stamp = new Date().toISOString().replaceAll(/[-:.]/g, "").slice(0, 15)
    const rehearsalDir = join(stateRoot, "rehearsal")
    mkdirSync(rehearsalDir, { recursive: true, mode: 0o700 })
    const reportPath = join(rehearsalDir, `migration-role-coverage-${stamp}.json`)
    if (existsSync(reportPath)) return roleCoverageFail("role coverage report path already exists")
    const summary: RoleCoverageSummary = {
      verify: true,
      seedReused: seeded.orgReused,
      preNoOrganizerRole,
      preCoreRolesIntact,
      preNoConfig,
      applyFirst,
      postRoleEinlass,
      postCoreRoleUnchanged,
      postConfigContractsEmpty,
      postConfigUnconfirmed,
      postAuditDelta,
      reapplyZero,
      reapplyNoAuditDup,
      promoteGuestToOwner,
      lastOwnerDowngradeRefused,
      postRefusalUnchanged,
      postRefusalNoAuditDup,
      orgId,
      reportPath,
    }
    writeFileSync(reportPath, JSON.stringify({ marker: localTestMarker, localTestOnly: true, summary }, null, 2))
    chmodSync(reportPath, 0o600)
    return createResult(summary)
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown role coverage failure"
    return roleCoverageFail(message)
  }
}
