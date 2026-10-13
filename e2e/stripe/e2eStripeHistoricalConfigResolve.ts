import { execFileSync } from "node:child_process"
import { lstat, readFile } from "node:fs/promises"
import { join } from "node:path"
import { parse as dotenvParse } from "dotenv"
import { createResult, createResultError } from "#result"
import * as v from "valibot"
import { e2eStripeTestClientCreate } from "./e2eStripeTestClientCreate.ts"

const testKeyPattern = /^(sk|rk)_test_[A-Za-z0-9]+$/u
const accountPattern = /^acct_[A-Za-z0-9]+$/u
const testKeySchema = v.pipe(v.string(), v.regex(testKeyPattern))
const accountSchema = v.pipe(v.string(), v.regex(accountPattern))
const billingEntrySchema = v.object({
  path: v.string(),
  labels: v.optional(v.object({ sourcePath: v.optional(v.string()) })),
  units: v.optional(v.array(v.string())),
})
const billingRegistrySchema = v.object({ data: v.array(billingEntrySchema) })

type BillingProject = { directory: string; units: string[] }
type BillingProjectResult =
  | { success: true; data: BillingProject }
  | { success: false; op: string; errorMessage: string }
type ServiceFilesResult = { success: true; data: string[] } | { success: false; op: string; errorMessage: string }
type AccountCheckResult = { success: true; data: string } | { success: false; op: string; errorMessage: string }
type PrivateFileStat = { mode: number; isFile: boolean; isSymbolicLink: boolean; uid: number }
type StripeAccountClient = Pick<ReturnType<typeof e2eStripeTestClientCreate>, "account">

/**
 * Default historical Stripe TEST credential resolution for the global
 * owned-TEST provider scan. Explicit E2E_TEST credentials win when key,
 * account and organization are all valid (verified with a read-only TEST
 * account lookup); otherwise the registered Billing project directory is
 * taken from the project-registry `billing` metadata (`path`/`sourcePath`
 * exact mapping, never a hardcoded home), cross-checked against the actual
 * service `EnvironmentFiles`, and only the dotenv TEST key is read from the
 * owner-only 0600 regular non-symlink service file (live keys are never
 * read). The TEST account id is asserted from the TEST connection itself and
 * the organization id comes from the selected Eventoren target env, never
 * from hardcoded ids. Credentials stay in process only: the registry
 * child receives just PATH/HOME/USER plus explicit registry socket
 * metadata (PROJECT_REGISTRY_SOCKET, PROJECT_REGISTRY_MODE,
 * XDG_RUNTIME_DIR) and never E2E secrets. A missing default
 * fails cleanup with the checkpoint retained instead of reporting provider
 * absence.
 */
export async function e2eStripeHistoricalConfigResolve(input: {
  target: "production" | "development"
  environment?: Record<string, string | undefined>
  billingProjectDirectory?: string
  eventorenDirectory?: string
  billingProjectResolve?: () => Promise<BillingProjectResult>
  billingProjectExec?: (args: readonly string[], env: Record<string, string>) => string
  serviceEnvironmentFiles?: (units: string[]) => Promise<ServiceFilesResult>
  fileRead?: (path: string) => Promise<string>
  fileStat?: (path: string) => Promise<PrivateFileStat>
  stripeClient?: StripeAccountClient
  stripeClientCreate?: typeof e2eStripeTestClientCreate
}) {
  const op = "e2eStripeHistoricalConfigResolve"
  const environment = input.environment ?? process.env
  const explicitKey = (environment["E2E_STRIPE_TEST_SECRET_KEY"] ?? "").trim()
  const explicitAccountId = (environment["E2E_STRIPE_TEST_ACCOUNT_ID"] ?? "").trim()
  const explicitOrganizationId = (environment["E2E_BILLING_ORGANIZATION_ID"] ?? "").trim()
  // An explicit organization is not authority to cross the selected target.
  // Standalone explicit configurations may have no local target file, but an
  // accessible target configuration must agree before any provider call.
  if (explicitOrganizationId) {
    let targetRaw: string | undefined
    try {
      targetRaw = await (input.fileRead ?? e2eStripeHistoricalConfigFileReadDefault)(
        join(input.eventorenDirectory ?? process.cwd(), `.env.${input.target}`),
      )
    } catch {
      // The explicit credential path also supports hosts without target files.
    }
    if (targetRaw !== undefined) {
      const targetOrganizationId = (dotenvParse(targetRaw)["EVENTOREN_BILLING_ORGANIZATION_ID"] ?? "").trim()
      if (!targetOrganizationId || targetOrganizationId !== explicitOrganizationId)
        return createResultError(
          op,
          "Explicit E2E billing organization differs from selected target; checkpoint retained",
        )
    }
  }
  if (
    v.safeParse(testKeySchema, explicitKey).success &&
    v.safeParse(accountSchema, explicitAccountId).success &&
    explicitOrganizationId.length > 0
  ) {
    const verified = await e2eStripeHistoricalConfigAccountCheck(
      input.stripeClient ?? (input.stripeClientCreate ?? e2eStripeTestClientCreate)(explicitKey),
    )
    if (!verified.success) return verified
    if (verified.data !== explicitAccountId)
      return createResultError(op, "Stripe TEST account identity mismatch; checkpoint retained")
    return createResult({ key: explicitKey, accountId: explicitAccountId, organizationId: explicitOrganizationId })
  }
  const project = input.billingProjectDirectory?.trim()
    ? createResult({ directory: input.billingProjectDirectory.trim(), units: [] as string[] })
    : await (
        input.billingProjectResolve ??
        (() => e2eStripeHistoricalConfigBillingProjectDefault(environment, input.billingProjectExec))
      )()
  if (!project.success) return project
  const files = await (input.serviceEnvironmentFiles ?? e2eStripeHistoricalConfigServiceFilesDefault)(
    project.data.units,
  )
  if (!files.success) return files
  const envPath = join(project.data.directory, ".env")
  if (!files.data.includes(envPath))
    return createResultError(op, "Historical Stripe TEST default unavailable; checkpoint retained")
  const read = input.fileRead ?? e2eStripeHistoricalConfigFileReadDefault
  const stat = input.fileStat ?? e2eStripeHistoricalConfigFileStatDefault
  let fileStat: PrivateFileStat
  try {
    fileStat = await stat(envPath)
  } catch {
    return createResultError(op, "Historical Stripe TEST default unavailable; checkpoint retained")
  }
  if (fileStat.isSymbolicLink || !fileStat.isFile)
    return createResultError(op, "Historical Stripe TEST default unavailable; checkpoint retained")
  if ((fileStat.mode & 0o777) !== 0o600)
    return createResultError(op, "Historical Stripe TEST default unavailable; checkpoint retained")
  if (typeof process.getuid === "function" && fileStat.uid !== process.getuid())
    return createResultError(op, "Historical Stripe TEST default unavailable; checkpoint retained")
  let billingRaw: string
  let eventorenRaw: string
  try {
    billingRaw = await read(envPath)
    eventorenRaw = await read(join(input.eventorenDirectory ?? process.cwd(), `.env.${input.target}`))
  } catch {
    return createResultError(op, "Historical Stripe TEST default unavailable; checkpoint retained")
  }
  const key = (dotenvParse(billingRaw)["EVENTOREN_STRIPE_API_KEY_TEST"] ?? "").trim()
  if (!v.safeParse(testKeySchema, key).success)
    return createResultError(op, "Historical Stripe TEST default unavailable; checkpoint retained")
  const organizationId = (dotenvParse(eventorenRaw)["EVENTOREN_BILLING_ORGANIZATION_ID"] ?? "").trim()
  if (!organizationId) return createResultError(op, "Historical Stripe TEST default unavailable; checkpoint retained")
  const verified = await e2eStripeHistoricalConfigAccountCheck(
    input.stripeClient ?? (input.stripeClientCreate ?? e2eStripeTestClientCreate)(key),
  )
  if (!verified.success) return verified
  return createResult({ key, accountId: verified.data, organizationId })
}

async function e2eStripeHistoricalConfigAccountCheck(client: StripeAccountClient): Promise<AccountCheckResult> {
  const op = "e2eStripeHistoricalConfigResolve"
  let account: Awaited<ReturnType<StripeAccountClient["account"]>>
  try {
    account = await client.account()
  } catch {
    return createResultError(op, "Stripe TEST account verification unavailable; checkpoint retained")
  }
  if (!account.success)
    return createResultError(op, "Stripe TEST account verification unavailable; checkpoint retained")
  if (typeof account.data !== "string" || !v.safeParse(accountSchema, account.data).success)
    return createResultError(op, "Stripe TEST account identity mismatch; checkpoint retained")
  return createResult(account.data)
}

function e2eStripeHistoricalConfigRegistryEnv(source: Record<string, string | undefined>): Record<string, string> {
  const path = source["PATH"]?.trim()
  const home = source["HOME"]?.trim()
  const env: Record<string, string> = {
    PATH: path && path.length > 0 ? path : "/usr/bin:/bin",
    HOME: home && home.length > 0 ? home : "/home/leo",
  }
  const user = source["USER"]?.trim()
  if (user) env["USER"] = user
  const socket = source["PROJECT_REGISTRY_SOCKET"]?.trim()
  if (socket) env["PROJECT_REGISTRY_SOCKET"] = socket
  const mode = source["PROJECT_REGISTRY_MODE"]?.trim()
  if (mode) env["PROJECT_REGISTRY_MODE"] = mode
  const runtimeDirectory = source["XDG_RUNTIME_DIR"]?.trim()
  if (runtimeDirectory) env["XDG_RUNTIME_DIR"] = runtimeDirectory
  return env
}

async function e2eStripeHistoricalConfigBillingProjectDefault(
  source?: Record<string, string | undefined>,
  exec?: (args: readonly string[], env: Record<string, string>) => string,
): Promise<BillingProjectResult> {
  const op = "e2eStripeHistoricalConfigResolve"
  const environment = source ?? process.env
  const args = ["--json", "project", "get", "billing"]
  const env = e2eStripeHistoricalConfigRegistryEnv(environment)
  const run =
    exec ??
    ((runArgs: readonly string[], runEnv: Record<string, string>) =>
      execFileSync("project-registry", [...runArgs], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 15_000,
        env: runEnv,
      }))
  let raw: string
  try {
    raw = run(args, env)
  } catch {
    return createResultError(op, "Historical Stripe TEST default unavailable; checkpoint retained")
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return createResultError(op, "Historical Stripe TEST default unavailable; checkpoint retained")
  }
  const registry = v.safeParse(billingRegistrySchema, parsed)
  if (!registry.success) return createResultError(op, "Historical Stripe TEST default unavailable; checkpoint retained")
  const directories = new Set<string>()
  const units = new Set<string>()
  for (const entry of registry.output.data) {
    const directory = entry.path.trim()
    if (!directory) continue
    const sourcePath = entry.labels?.sourcePath?.trim()
    if (sourcePath && sourcePath !== directory)
      return createResultError(op, "Historical Stripe TEST default unavailable; checkpoint retained")
    directories.add(directory)
    for (const unit of entry.units ?? []) {
      if (unit.trim()) units.add(unit.trim())
    }
  }
  const directory = [...directories][0]
  if (directories.size !== 1 || !directory)
    return createResultError(op, "Historical Stripe TEST default unavailable; checkpoint retained")
  return createResult({ directory, units: [...units] })
}

async function e2eStripeHistoricalConfigServiceFilesDefault(units: string[]): Promise<ServiceFilesResult> {
  const op = "e2eStripeHistoricalConfigResolve"
  if (units.length === 0)
    return createResultError(op, "Historical Stripe TEST default unavailable; checkpoint retained")
  const files: string[] = []
  try {
    for (const unit of units) {
      const name = unit.endsWith(".service") ? unit : `${unit}.service`
      const shown = execFileSync("systemctl", ["--user", "show", name, "-p", "EnvironmentFiles"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 15_000,
      })
      for (const line of shown.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed.startsWith("EnvironmentFiles=")) continue
        for (const token of trimmed.slice("EnvironmentFiles=".length).split(" ")) {
          const candidate = token.trim()
          if (candidate.startsWith("/")) files.push(candidate)
        }
      }
    }
  } catch {
    return createResultError(op, "Historical Stripe TEST default unavailable; checkpoint retained")
  }
  return createResult(files)
}

async function e2eStripeHistoricalConfigFileReadDefault(path: string): Promise<string> {
  return readFile(path, "utf8")
}

async function e2eStripeHistoricalConfigFileStatDefault(path: string): Promise<PrivateFileStat> {
  const stat = await lstat(path)
  return { mode: stat.mode, isFile: stat.isFile(), isSymbolicLink: stat.isSymbolicLink(), uid: stat.uid }
}
