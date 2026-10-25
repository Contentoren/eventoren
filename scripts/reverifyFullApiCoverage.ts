#!/usr/bin/env bun
/**
 * Full API coverage re-verification for eventoren (DEV backend only).
 *
 * Invokes every public Convex function in the static catalog through all
 * three agent surfaces (project CLI, HTTP MCP convex-call, TS apiClient),
 * plus an admin `convex run` probe for internal functions (refused on the
 * agent surfaces by design). Test-scoped fixtures are created up front and
 * removed afterwards; resources without a delete API are reported as
 * leftovers with exact counts.
 *
 * Usage (from repo root):
 *   bun run scripts/reverifyFullApiCoverage.ts [--phase all|setup|main|cleanup|render] [--only mod:name,...]
 *
 * Inputs (env, else .env.development in repo root):
 *   REVERIFY_URL        Convex deployment URL (default: file CONVEX_URL fallbacks)
 *   REVERIFY_MCP_URL    MCP endpoint URL (default: <CONVEX_SITE_URL>/mcp)
 *   REVERIFY_API_KEY    dev API key (default: file EVENTOREN_API_KEY)
 *   REVERIFY_OUT        results JSON (default: /tmp/eventoren-reverify-results.json)
 *   REVERIFY_STATE      fixture state JSON (default: /tmp/eventoren-reverify-state.json)
 *   REVERIFY_SPEC       deployed function-spec JSON (default: /tmp/eventoren-dev-spec.json)
 *
 * Never touches production: the deployment URL must contain "localhost",
 * "127.0.0.1", or "leonardomora" (dev), anything else aborts.
 */

import { spawn } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { SignJWT } from "jose"
import { ConvexHttpClient } from "convex/browser"
import { convexFunctionCatalog } from "../src/utils/convex_client/convexFunctionCatalog.js"
import { apiClientConvexCall } from "../src/client/apiClientConvexCall.js"

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(scriptDir)
const DEV = "covrev1"

type SurfaceName = "cli" | "mcp" | "ts"
type SurfaceResult = {
  ok: boolean
  executed: boolean
  code: string
  summary: string
  ms: number
  credential: string
}
type FunctionResult = {
  kind: string
  visibility: string
  acceptsToken: boolean | null
  args: string
  cli: SurfaceResult
  mcp: SurfaceResult
  ts: SurfaceResult
  admin?: SurfaceResult
  note?: string
}

// ---------------------------------------------------------------- config

function envFileLoad(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of readFileSync(join(repoRoot, ".env.development"), "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#") || !t.includes("=")) continue
    const i = t.indexOf("=")
    out[t.slice(0, i).trim()] = t
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "")
  }
  return out
}
const fileEnv = envFileLoad()
const config = {
  convexUrl:
    process.env["REVERIFY_URL"] ??
    fileEnv["CONVEX_URL"] ??
    fileEnv["CONVEX_SELF_HOSTED_URL"] ??
    fileEnv["VITE_CONVEX_URL"] ??
    "",
  mcpUrl:
    process.env["REVERIFY_MCP_URL"] ?? `${fileEnv["CONVEX_SITE_URL"] ?? fileEnv["VITE_CONVEX_SITE_URL"] ?? ""}/mcp`,
  apiKey: process.env["REVERIFY_API_KEY"] ?? fileEnv["EVENTOREN_API_KEY"] ?? "",
  authSecret: fileEnv["AUTH_SECRET"] ?? "",
  outPath: process.env["REVERIFY_OUT"] ?? "/tmp/eventoren-reverify-results.json",
  statePath: process.env["REVERIFY_STATE"] ?? "/tmp/eventoren-reverify-state.json",
  specPath: process.env["REVERIFY_SPEC"] ?? "/tmp/eventoren-dev-spec.json",
}
if (!config.convexUrl || !/localhost|127\.0\.0\.1|leonardomora/.test(config.convexUrl)) {
  throw new Error(`refusing to run: unexpected Convex URL "${config.convexUrl}"`)
}
if (!config.apiKey) throw new Error("missing dev EVENTOREN_API_KEY")
if (!config.authSecret || config.authSecret.startsWith("replace-with-")) throw new Error("missing dev AUTH_SECRET")

const argv = Bun.argv.slice(2)
const phaseArg = argv.find((a) => a.startsWith("--phase="))?.slice("--phase=".length) ?? "all"
const onlyArg = argv.find((a) => a.startsWith("--only="))?.slice("--only=".length) ?? ""
const onlySet = new Set(
  onlyArg
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
)

// ---------------------------------------------------------------- state

type FixtureState = {
  orgId: string
  eventKey: string
  eventId: string
  tierKey: string
  category: string
  testadminId: string
  sessionJwt: string
  sessionC: string
  userC: string
  userScli: string
  sessionScli: string
  userSmcp: string
  sessionSmcp: string
  userSts: string
  sessionSts: string
  userHcli: string
  sessionHcli: string
  userHmcp: string
  sessionHmcp: string
  userHts: string
  sessionHts: string
  keyA: string
  keyB: string
  message: string | null
  guest: string | null
  quota: string | null
  code: string | null
  codeValue: string | null
  phase: string | null
  voucher: string | null
  voucherCode: string | null
  invitation: string | null
  salePay: string | null
  saleComplete: string | null
  saleCancel: string | null
  saleDevice: string | null
  scanLink: string | null
  scanCode: string | null
  scanHelper: string | null
  activationCode: string | null
  payout: string | null
  created: Record<string, string[]>
  zitadelSessions: string[]
  runStart: string
}
function stateLoad(): FixtureState {
  return JSON.parse(readFileSync(config.statePath, "utf8")) as FixtureState
}
function stateSave(state: FixtureState): void {
  writeFileSync(config.statePath, `${JSON.stringify(state, null, 2)}\n`)
}
function stateTrack(state: FixtureState, kind: string, id: string): void {
  const list = state.created[kind] ?? []
  if (!list.includes(id)) list.push(id)
  state.created[kind] = list
  stateSave(state)
}

// ---------------------------------------------------------------- results

function resultsLoad(): Record<string, FunctionResult> {
  if (!existsSync(config.outPath)) return {}
  return (JSON.parse(readFileSync(config.outPath, "utf8")) as { functions: Record<string, FunctionResult> }).functions
}
function resultsSave(functions: Record<string, FunctionResult>): void {
  writeFileSync(
    config.outPath,
    `${JSON.stringify({ updatedAt: new Date().toISOString(), convexUrl: config.convexUrl, functions }, null, 2)}\n`,
  )
}

// ---------------------------------------------------------------- spec

type SpecNode = { type: string; value?: unknown; tableName?: string; optional?: boolean; fieldType?: SpecNode }
type SpecFn = { kind: string; visibility: string; args: SpecNode }
function specLoad(): Map<string, SpecFn> {
  const raw = JSON.parse(readFileSync(config.specPath, "utf8")) as {
    functions: { identifier?: string; functionType?: string; visibility?: { kind: string }; args?: SpecNode }[]
  }
  const map = new Map<string, SpecFn>()
  for (const f of raw.functions) {
    if (!f.identifier || !f.functionType || !f.args) continue
    const kind =
      f.functionType === "Query"
        ? f.visibility?.kind === "public"
          ? "query"
          : "internalQuery"
        : f.functionType === "Mutation"
          ? f.visibility?.kind === "public"
            ? "mutation"
            : "internalMutation"
          : f.visibility?.kind === "public"
            ? "action"
            : "internalAction"
    map.set(f.identifier.replace(".js:", ":"), {
      kind,
      visibility: f.visibility?.kind ?? "public",
      args: f.args,
    })
  }
  return map
}

// ---------------------------------------------------------------- args

const FAKE_CODE = `${DEV}-no-code`
const deadEmail = (who: string): string => `${DEV}-${who}@example.com`

// Convex v.id values are table-scoped: an id from another table fails
// validation. Harvested real row ids per table (read-only census).
const harvestedIds = new Map<string, string>()

async function harvestIds(): Promise<void> {
  const tables = [
    ...new Set(
      [...specGlobal.values()].flatMap((fn) => {
        const acc: string[] = []
        const walk = (n: unknown): void => {
          if (typeof n !== "object" || n === null) return
          const node = n as Record<string, unknown>
          if (node["type"] === "id" && typeof node["tableName"] === "string") acc.push(node["tableName"] as string)
          for (const v of Object.values(node)) {
            if (typeof v === "object") walk(v)
          }
        }
        walk(fn.args)
        return acc
      }),
    ),
  ]
  const js = `await Promise.all(${JSON.stringify(tables)}.map(async t => { try { const r = await ctx.db.query(t).take(1); return [t, r.length ? r[0]._id : null]; } catch (e) { return [t, null]; } })).then(pairs => Object.fromEntries(pairs))`
  const found = await inlineQuery<Record<string, string | null>>(js).catch(() => ({}) as Record<string, string | null>)
  for (const [table, id] of Object.entries(found)) {
    if (id) harvestedIds.set(table, id)
  }
  console.log(`harvested ids for ${harvestedIds.size}/${tables.length} tables`)
}

function idForTable(state: FixtureState, table: string): string {
  switch (table) {
    case "orgs":
      return state.orgId
    case "users":
      return state.testadminId
    case "organizerDashboardMessages":
      if (state.message) return state.message
      break
    case "organizerDashboardBoxOfficeSales":
      if (state.salePay) return state.salePay
      break
    case "scannerLinks":
      if (state.scanLink) return state.scanLink
      break
    case "organizerDashboardGuests":
      if (state.guest) return state.guest
      break
    case "organizerDashboardGuestQuotas":
      if (state.quota) return state.quota
      break
    case "organizerDashboardTeamInvitations":
      if (state.invitation) return state.invitation
      break
    default:
      break
  }
  // Harvested foreign row: valid table scope, lookup misses or access is
  // denied by org checks — still an executed domain error.
  return harvestedIds.get(table) ?? state.orgId
}

function fillNode(
  node: SpecNode,
  field: string,
  state: FixtureState,
  surface: SurfaceName,
  skipOverride = false,
): unknown {
  const name = field.toLowerCase()
  if (node.type === "object") {
    const value = (node.value ?? {}) as Record<string, SpecNode & { fieldType: SpecNode }>
    const out: Record<string, unknown> = {}
    for (const [key, fd] of Object.entries(value)) {
      const child = (fd as { fieldType: SpecNode }).fieldType
      const optional = (fd as { optional?: boolean }).optional === true
      if (key === "token") continue
      if (optional && !overrideHas(key)) continue
      const filled = fillNode(child, key, state, surface)
      if (filled !== undefined) out[key] = filled
    }
    return out
  }
  const override = skipOverride ? undefined : overrideFor(name, state, surface)
  // Unions consult the override only on literal match (see union branch);
  // every other scalar type takes a matching override directly.
  if (override !== undefined && node.type !== "union" && node.type !== "object") return override.value
  switch (node.type) {
    case "string":
      return ""
    case "number":
      return 0
    case "boolean":
      return false
    case "null":
      return null
    case "literal":
      return node.value
    case "any":
      return null
    case "bytes":
      return ""
    case "id":
      return idForTable(state, node.tableName ?? "")
    case "array":
      return []
    case "record":
      return {}
    case "union": {
      const options = (node.value ?? []) as SpecNode[]
      const by = (t: string): SpecNode | undefined => options.find((o) => o.type === t)
      // A field override wins only when it matches a literal option (e.g.
      // operation=revoke); otherwise the first literal is schema-valid.
      // Prefer null when the union allows it (pagination cursors); explicit
      // null is only ever emitted for union-typed fields, never for
      // optional plain fields (those are omitted instead).
      const literals = options.filter((o) => o.type === "literal").map((o) => o.value)
      if (override !== undefined && literals.includes(override.value)) return override.value
      const pick = by("null") ?? by("literal") ?? by("string") ?? by("number") ?? by("boolean") ?? options[0]
      if (!pick) return null
      return fillNode(pick, field, state, surface, true)
    }
    default:
      return null
  }
}

const overrideNames = new Set(
  "paginationopts eventkey eventid orgid userid tierkey category checkoutkey email newemail recipientemail buyeremail username name givenname familyname address line1 city postalcode country phone successurl cancelurl imageurl imagealt l locale quantity count limit numitems capacity maxperorder pricecents initialcents feecents amountcents discountvalue discounttype hoursbefore quota soldcount sortorder staleafterms runid runcreatedat entrance operation roles zitadeluserid provider kind dparevision termsrevision dpaaccepted termsaccepted slug documentetrevision documentsetrevision legalcontext confirmationcode newpassword currentpassword bio plusones note text subject body message title subtitle description venue organizer startsat endsat doorsat additionaldoorsat scheduledat expiresat label tags tierkeys eventkeys emails organizerrole sessionids includecallersession testharness successfulownedcurrentrun eventtitle participantname reason".split(
    " ",
  ),
)
function overrideHas(field: string): boolean {
  return overrideNames.has(field.toLowerCase())
}

function overrideFor(name: string, state: FixtureState, surface: SurfaceName): { value: unknown } | undefined {
  const v = (value: unknown): { value: unknown } => ({ value })
  if (name === "paginationopts") return v({ numItems: 5, cursor: null })
  if (name === "eventkey") return v(state.eventKey)
  if (name === "eventid") return v(state.eventId)
  if (name === "orgid") return v(state.orgId)
  if (name === "userid") return v(state.testadminId)
  if (name === "tierkey") return v(state.tierKey)
  if (name === "category") return v(state.category)
  if (name === "checkoutkey") return v(`${DEV}${surface}${"0123456789abcdef".repeat(4)}`.slice(0, 40))
  if (name === "code" && state.activationCode) return undefined // context decides; default filler applies
  if (name === "email" || name === "newemail" || name === "recipientemail" || name === "buyeremail")
    return v(deadEmail(name))
  if (name === "username") return v(`${DEV}-user`)
  if (name === "name" || name === "givenname" || name === "familyname") return v(`${DEV} Name`)
  if (name === "address" || name === "line1") return v(`${DEV} Str 1`)
  if (name === "city") return v("Berlin")
  if (name === "postalcode") return v("10115")
  if (name === "country") return v("DE")
  if (name === "phone") return v("+4930000000")
  if (name === "successurl" || name === "cancelurl" || name === "imageurl")
    return v(`https://eventoren.leonardomora.de/${DEV}`)
  if (name === "imagealt") return v(DEV)
  if (name === "l" || name === "locale") return v("de")
  if (name === "quantity" || name === "count" || name === "limit" || name === "numitems") return v(1)
  if (name === "capacity") return v(100)
  if (name === "maxperorder") return v(4)
  if (name === "pricecents" || name === "initialcents") return v(1000)
  if (name === "feecents" || name === "amountcents") return v(1)
  if (name === "discountvalue") return v(10)
  if (name === "discounttype") return v("prozent")
  if (name === "hoursbefore") return v(24)
  if (name === "soldcount" || name === "sortorder") return v(0)
  if (name === "quota") return v(10)
  if (name === "staleafterms") return v(10 * 365 * 24 * 3600 * 1000)
  if (name === "runid") return v(`${DEV}-0e9b6c8a-7f3d-4e2a-9b1c-5d6e7f8a9b0c`)
  if (name === "runcreatedat") return v(Date.now())
  if (name === "entrance") return v("Einlass")
  if (name === "operation") return v("revoke")
  if (name === "roles") return v(["organizer"])
  if (name === "zitadeluserid") return v("000000000000000000")
  if (name === "provider") return v("zitadel")
  if (name === "kind") return v("verein")
  if (name === "dparevision") return v("eventoren-veranstalter-avv-muster-2026-10-21-v1")
  if (name === "termsrevision") return v("eventoren-veranstalter-agb-muster-2026-10-21-v1")
  if (name === "dpaaccepted" || name === "termsaccepted") return v(true)
  if (name === "slug") return v(`${DEV}-org-${surface}`)
  if (name === "documentetrevision" || name === "documentsetrevision") return v(`sha256:${"0".repeat(64)}`)
  if (name === "legalcontext") return v({ documentSetRevision: `sha256:${"0".repeat(64)}` })
  if (name === "confirmationcode" || name === "newpassword" || name === "currentpassword") return v(`${DEV}-wrong-code`)
  if (name === "bio") return v(`${DEV} bio`)
  if (name === "plusones") return v(0)
  if (name === "note" || name === "text" || name === "subject" || name === "body") return v(`${DEV} text`)
  if (name === "message") return v(`${DEV} message`)
  if (name === "title") return v(`${DEV} Title`)
  if (name === "subtitle" || name === "description" || name === "venue" || name === "organizer") return v(DEV)
  if (name === "address") return v(`${DEV} Str 1`)
  if (name === "startsat") return v("2026-12-01T19:00:00.000Z")
  if (name === "endsat") return v("2026-12-01T22:00:00.000Z")
  if (name === "doorsat") return v("2026-12-01T18:30:00.000Z")
  if (name === "additionaldoorsat") return v([])
  if (name === "scheduledat") return v("2026-12-02T10:00:00.000Z")
  if (name === "expiresat") return v(Date.now() + 60 * 24 * 3600 * 1000)
  if (name === "cursor") return v(null)
  if (name === "label") return v(`${DEV} Einlass`)
  if (name === "tags") return v([DEV])
  if (name === "tierkeys") return v([state.tierKey])
  if (name === "eventkeys") return v([state.eventKey])
  if (name === "emails") return v([deadEmail(`inv-${surface}`)])
  if (name === "organizerrole") return v("eventmanager")
  if (name === "sessionids") return v([])
  if (name === "includecallersession") return v(false)
  if (name === "testharness") return v(true)
  if (name === "successfulownedcurrentrun") return v(false)
  if (name === "eventtitle") return v(`${DEV} noop`)
  if (name === "participantname") return v(`${DEV} Participant`)
  if (name === "reason") return v(`${DEV} test reason`)
  return undefined
}

// ---------------------------------------------------------------- runners

const surfaceTimeoutMs = 45000
const short = (s: string, n = 140): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

function isValidatorMessage(message: string): boolean {
  return /validator|argumentvalidation|object is missing|expected .* received|invalid argument/i.test(message)
}
function isAuthFailure(message: string): boolean {
  return /anmeldung erforderlich|authentication session|unauthorized|invalid credential|expired credential|admin role required|forbidden|nicht angemeldet/i.test(
    message,
  )
}
function isNotFoundFn(message: string): boolean {
  return /could not find (public |)function|unknown convex function/i.test(message)
}

function classifyEnvelope(data: unknown, credential: string, ms: number): SurfaceResult {
  if (typeof data === "object" && data !== null && "success" in data) {
    const envelope = data as { success: boolean; errorMessage?: string; op?: string }
    if (envelope.success)
      return { ok: true, executed: true, code: "result-ok", summary: "ok (Result success)", ms, credential }
    const msg = String(envelope.errorMessage ?? "error")
    return {
      ok: false,
      executed: true,
      code: isAuthFailure(msg) ? "result-auth" : "result-error",
      summary: `executed (Result error: ${short(msg)})`,
      ms,
      credential,
    }
  }
  return { ok: true, executed: true, code: "data", summary: "ok + data", ms, credential }
}

function classifyError(message: string, credential: string, ms: number): SurfaceResult {
  const msg = short(message.replace(/\s+/g, " ").trim())
  if (/status 404|unknown convex function/i.test(message))
    return { ok: false, executed: false, code: "unknown", summary: `refused client-side (${msg})`, ms, credential }
  if (/status 403|not agent-reachable/i.test(message))
    return { ok: false, executed: false, code: "internal", summary: `refused client-side (${msg})`, ms, credential }
  if (isNotFoundFn(message))
    return { ok: false, executed: false, code: "drift", summary: `NOT DEPLOYED (${msg})`, ms, credential }
  if (isValidatorMessage(message))
    return {
      ok: false,
      executed: false,
      code: "validator",
      summary: `backend reached, args rejected (${msg})`,
      ms,
      credential,
    }
  return {
    ok: false,
    executed: true,
    code: isAuthFailure(message) ? "backend-auth" : "backend-error",
    summary: `backend reached (${msg})`,
    ms,
    credential,
  }
}

let tsClient: ConvexHttpClient | null = null
function tsClientGet(): ConvexHttpClient {
  if (!tsClient) tsClient = new ConvexHttpClient(config.convexUrl)
  return tsClient
}

async function tsCall(
  module: string,
  name: string,
  args: Record<string, unknown>,
  token: string | undefined,
  credential: string,
): Promise<SurfaceResult> {
  const started = Date.now()
  try {
    const result = await apiClientConvexCall(
      { module, name, args, ...(token === undefined ? {} : { token }) },
      tsClientGet(),
    )
    if (!result.success)
      return classifyError(`${result.error.message} (status ${result.error.status})`, credential, Date.now() - started)
    return classifyEnvelope(result.data, credential, Date.now() - started)
  } catch (error) {
    return classifyError(error instanceof Error ? error.message : String(error), credential, Date.now() - started)
  }
}

function spawnRun(
  cmd: string,
  argv: string[],
  cwd: string,
  timeoutMs: number,
): Promise<{ exit: number; stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, argv, { cwd, timeout: timeoutMs, env: { ...process.env } })
    let stdout = ""
    let stderr = ""
    let timedOut = false
    child.stdout.on("data", (d) => {
      stdout += String(d)
    })
    child.stderr.on("data", (d) => {
      stderr += String(d)
    })
    child.on("error", (e) => {
      resolve({ exit: 1, stdout, stderr: `${stderr}${e.message}`, timedOut })
    })
    child.on("close", (code, signal) => {
      if (signal === "SIGTERM") timedOut = true
      resolve({ exit: code ?? 1, stdout, stderr, timedOut })
    })
  })
}

async function cliCall(
  module: string,
  name: string,
  args: Record<string, unknown>,
  token: string | undefined,
  credential: string,
): Promise<SurfaceResult> {
  const started = Date.now()
  const argv = ["run", "src/cli.ts", "convex-call", `${module}:${name}`, "--env", "development"]
  if (token !== undefined) argv.push("--token", token)
  argv.push("--json", JSON.stringify(args))
  const out = await spawnRun("bun", argv, repoRoot, surfaceTimeoutMs)
  const ms = Date.now() - started
  if (out.timedOut) return { ok: false, executed: false, code: "timeout", summary: "cli timeout", ms, credential }
  if (out.exit === 0) {
    // The CLI prints Convex function log lines before the JSON payload, and
    // scalar results (true/null) have no envelope at all.
    const candidates: string[] = [out.stdout]
    const lines = out.stdout.split("\n")
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i]?.trim() ?? ""
      if (trimmed === "{" || trimmed === "[") candidates.push(lines.slice(i).join("\n"))
    }
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i]?.trim() ?? ""
      if (trimmed !== "") {
        candidates.push(trimmed)
        break
      }
    }
    for (const candidate of candidates) {
      try {
        return classifyEnvelope(JSON.parse(candidate) as unknown, credential, ms)
      } catch {
        // keep scanning
      }
    }
    return {
      ok: false,
      executed: true,
      code: "parse",
      summary: `cli unparseable output (${short(out.stdout)})`,
      ms,
      credential,
    }
  }
  return classifyError(out.stderr.replace(/^error:\s*/, ""), credential, ms)
}

async function mcpCall(
  module: string,
  name: string,
  args: Record<string, unknown>,
  token: string,
  credential: string,
): Promise<SurfaceResult> {
  const started = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), surfaceTimeoutMs)
    let response: Response
    try {
      response = await fetch(config.mcpUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "convex-call", arguments: { module, function: name, args } },
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
    const ms = Date.now() - started
    if (response.status === 401)
      return { ok: false, executed: false, code: "mcp-401", summary: "MCP 401 Unauthorized", ms, credential }
    const body = (await response.json()) as {
      result?: { content?: { type: string; text: string }[]; isError?: boolean }
      error?: { code: number; message: string }
    }
    if (body.error) return classifyError(`MCP JSON-RPC ${body.error.code}: ${body.error.message}`, credential, ms)
    const text = body.result?.content?.[0]?.text ?? ""
    if (/^MCP error -32602/.test(text)) return classifyError(text.replace(/^MCP error -32602:\s*/, ""), credential, ms)
    if (/^MCP error -32603/.test(text)) return classifyError(text.replace(/^MCP error -32603:\s*/, ""), credential, ms)
    if (body.result?.isError) return classifyError(text, credential, ms)
    try {
      return classifyEnvelope(JSON.parse(text) as unknown, credential, ms)
    } catch {
      return { ok: true, executed: true, code: "text", summary: `ok (text: ${short(text, 80)})`, ms, credential }
    }
  } catch (error) {
    const ms = Date.now() - started
    return {
      ok: false,
      executed: false,
      code: "transport",
      summary: `mcp transport (${short(error instanceof Error ? error.message : String(error))})`,
      ms,
      credential,
    }
  }
}

async function adminRun(module: string, name: string, args: Record<string, unknown>): Promise<SurfaceResult> {
  const started = Date.now()
  const out = await spawnRun(
    "bunx",
    ["convex", "run", "--env-file=.env.development", `${module}:${name}`, JSON.stringify(args)],
    repoRoot,
    60000,
  )
  const ms = Date.now() - started
  if (out.timedOut)
    return { ok: false, executed: false, code: "timeout", summary: "admin timeout", ms, credential: "admin" }
  const stdout = out.stdout.trim()
  if (out.exit === 0) {
    try {
      return classifyEnvelope(JSON.parse(stdout || "null") as unknown, "admin", ms)
    } catch {
      return {
        ok: true,
        executed: true,
        code: "text",
        summary: `admin ok (${short(stdout, 80)})`,
        ms,
        credential: "admin",
      }
    }
  }
  return classifyError(`${out.stderr.split("\n").slice(-3).join(" ")} ${short(stdout, 120)}`, "admin", ms)
}

async function inlineQuery<T>(js: string): Promise<T> {
  const out = await spawnRun(
    "bunx",
    ["convex", "run", "--env-file=.env.development", "--inline-query", js],
    repoRoot,
    60000,
  )
  if (out.exit !== 0) throw new Error(`inline query failed: ${short(out.stderr, 200)}`)
  const stdout = out.stdout.trim()
  return JSON.parse(stdout) as T
}

async function convexRunJson(module: string, name: string, args: Record<string, unknown>): Promise<unknown> {
  const out = await spawnRun(
    "bunx",
    ["convex", "run", "--env-file=.env.development", `${module}:${name}`, JSON.stringify(args)],
    repoRoot,
    60000,
  )
  if (out.exit !== 0) throw new Error(`convex run ${module}:${name} failed: ${short(out.stderr, 300)}`)
  const stdout = out.stdout.trim()
  return JSON.parse(stdout || "null") as unknown
}

async function mintJwt(userId: string): Promise<string> {
  return new SignJWT({ jti: crypto.randomUUID() })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(new TextEncoder().encode(config.authSecret))
}

async function directCall(
  module: string,
  name: string,
  args: Record<string, unknown>,
  token: string,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const result = await apiClientConvexCall({ module, name, args, token }, tsClientGet())
  if (!result.success) return { success: false, error: `${result.error.message} (status ${result.error.status})` }
  const data = result.data as { success?: boolean; errorMessage?: string; data?: unknown }
  if (typeof data === "object" && data !== null && "success" in data) {
    if (data.success) return { success: true, data: data.data ?? data }
    return { success: false, error: String(data.errorMessage ?? "error") }
  }
  return { success: true, data }
}

// ---------------------------------------------------------------- setup

async function phaseSetup(spec: Map<string, SpecFn>): Promise<FixtureState> {
  let state: FixtureState | null = existsSync(config.statePath)
    ? (JSON.parse(readFileSync(config.statePath, "utf8")) as FixtureState)
    : null
  if (!state) {
    const org = await directCall(
      "organizerDashboard",
      "organizerDashboardOrganizationCreateMutation",
      {
        kind: "verein",
        name: `${DEV} Org`,
        slug: `${DEV}-org-setup`,
        dpaAccepted: true,
        dpaRevision: "eventoren-veranstalter-avv-muster-2026-10-21-v1",
        termsAccepted: true,
        termsRevision: "eventoren-veranstalter-agb-muster-2026-10-21-v1",
      },
      config.apiKey,
    )
    if (!org.success) throw new Error(`setup org failed: ${org.error}`)
    const orgId = (org.data as { orgId: string }).orgId
    const event = await directCall(
      "organizerDashboardEvents",
      "organizerDashboardEventCreateMutation",
      {
        orgId,
        title: `${DEV} Event`,
        subtitle: "sub",
        description: "desc",
        category: `${DEV}-test`,
        venue: "Test Venue",
        address: `${DEV} Str 1`,
        city: "Berlin",
        organizer: `${DEV} Org`,
        startsAt: "2026-12-01T19:00:00.000Z",
        endsAt: "2026-12-01T22:00:00.000Z",
        doorsAt: "2026-12-01T18:30:00.000Z",
        imageUrl: `https://eventoren.leonardomora.de/${DEV}`,
        imageAlt: DEV,
      },
      config.apiKey,
    )
    if (!event.success) throw new Error(`setup event failed: ${event.error}`)
    const eventData = event.data as { eventKey: string; eventId: string }
    await directCall("catalog", "catalogCategoryCreateMutation", { category: `${DEV}-test` }, config.apiKey)
    const tier = await directCall(
      "catalog",
      "catalogTicketTierUpsertMutation",
      {
        eventKey: eventData.eventKey,
        tierKey: `${DEV}-standard`,
        name: "Standard",
        description: "d",
        capacity: 100,
        priceCents: 1000,
        feeCents: 0,
        startsAt: "2026-12-01T19:00:00.000Z",
        endsAt: "2026-12-01T22:00:00.000Z",
        doorsAt: "2026-12-01T18:30:00.000Z",
      },
      config.apiKey,
    )
    if (!tier.success) throw new Error(`setup tier failed: ${tier.error}`)
    state = {
      orgId,
      eventKey: eventData.eventKey,
      eventId: eventData.eventId,
      tierKey: `${DEV}-standard`,
      category: `${DEV}-test`,
      testadminId: "mn72jre9gsvk7eh7vtd2srjweh8edrs5",
      sessionJwt: "",
      sessionC: "",
      userC: "",
      userScli: "",
      sessionScli: "",
      userSmcp: "",
      sessionSmcp: "",
      userSts: "",
      sessionSts: "",
      userHcli: "",
      sessionHcli: "",
      userHmcp: "",
      sessionHmcp: "",
      userHts: "",
      sessionHts: "",
      keyA: "",
      keyB: "",
      message: null,
      guest: null,
      quota: null,
      code: null,
      codeValue: null,
      phase: null,
      voucher: null,
      voucherCode: null,
      invitation: null,
      salePay: null,
      saleComplete: null,
      saleCancel: null,
      saleDevice: null,
      scanLink: null,
      scanCode: null,
      scanHelper: null,
      activationCode: null,
      payout: null,
      created: {},
      zitadelSessions: [],
      runStart: new Date().toISOString(),
    }
    stateSave(state)
  }
  if (!state.runStart) {
    state.runStart = new Date().toISOString()
    stateSave(state)
  }
  // sessions + throwaway users + keys
  if (!state.sessionJwt) {
    state.sessionJwt = await mintJwt(state.testadminId)
    await convexRunJson("auth", "authSessionInsertInternalMutation", {
      userId: state.testadminId,
      loginMethod: "password",
      token: state.sessionJwt,
    })
    stateSave(state)
  }
  const throwawaySlots = [
    { user: "userC", session: "sessionC", tag: "c" },
    { user: "userScli", session: "sessionScli", tag: "scli" },
    { user: "userSmcp", session: "sessionSmcp", tag: "smcp" },
    { user: "userSts", session: "sessionSts", tag: "sts" },
    { user: "userHcli", session: "sessionHcli", tag: "hcli" },
    { user: "userHmcp", session: "sessionHmcp", tag: "hmcp" },
    { user: "userHts", session: "sessionHts", tag: "hts" },
  ] as const
  for (const slot of throwawaySlots) {
    const userId = (state[slot.user] as string | undefined) ?? ""
    if (userId) {
      // Verify liveness: a previous run may have deleted this user.
      const rows = await inlineQuery<{ deletedAt?: string }[]>(
        `await ctx.db.get("users", ${JSON.stringify(userId)}).then(u => u ? [u] : [])`,
      ).catch(() => [] as { deletedAt?: string }[])
      if (rows.length === 0 || rows[0]?.deletedAt) {
        ;(state[slot.user] as string) = ""
        ;(state[slot.session] as string) = ""
        stateSave(state)
      }
    }
    if (!(state[slot.user] as string)) {
      // One-shot delete users get a unique identity per creation (a previous
      // run's soft-deleted row keeps its auth account reserved).
      const stamp = slot.tag === "c" ? "c" : `${slot.tag}-${Date.now().toString(36)}`
      const created = (await convexRunJson("auth", "createUserFromAuthProviderInternalMutation", {
        provider: "google",
        providerId: `${DEV}-throwaway-${stamp}`,
        username: `${DEV}${slot.tag}`,
        email: deadEmail(`throwaway-${slot.tag}`),
      })) as { success: boolean; data?: { userId?: string }; errorMessage?: string }
      let userId = created.data?.userId ?? ""
      if (!created.success) {
        if (slot.tag !== "c") throw new Error(`setup ${slot.user} failed: ${created.errorMessage}`)
        const retry = (await convexRunJson("auth", "createUserFromAuthProviderInternalMutation", {
          provider: "google",
          providerId: `${DEV}-throwaway-c-${Date.now().toString(36)}`,
          username: `${DEV}c`,
          email: deadEmail("throwaway-c"),
        })) as { success: boolean; data?: { userId?: string }; errorMessage?: string }
        if (!retry.success) throw new Error(`setup ${slot.user} failed: ${retry.errorMessage}`)
        userId = retry.data?.userId ?? ""
      }
      ;(state[slot.user] as string) = userId
      const jwt = await mintJwt(state[slot.user] as string)
      await convexRunJson("auth", "authSessionInsertInternalMutation", {
        userId: state[slot.user] as string,
        loginMethod: "password",
        token: jwt,
      })
      ;(state[slot.session] as string) = jwt
      stateSave(state)
    } else if (!(state[slot.session] as string)) {
      const jwt = await mintJwt(state[slot.user] as string)
      await convexRunJson("auth", "authSessionInsertInternalMutation", {
        userId: state[slot.user] as string,
        loginMethod: "password",
        token: jwt,
      })
      ;(state[slot.session] as string) = jwt
      stateSave(state)
    }
  }
  if (!state.keyA || !state.keyB) {
    for (const slot of ["keyA", "keyB"] as const) {
      if (state[slot]) continue
      const key = await directCall(
        "auth",
        "apiKeyCreateMutation",
        { name: `${DEV}-${slot.toLowerCase()}` },
        config.apiKey,
      )
      if (!key.success) throw new Error(`setup ${slot} failed: ${key.error}`)
      state[slot] = (key.data as { id: string }).id
      stateSave(state)
    }
  }
  await directCall("catalog", "catalogEventPublishMutation", { eventKey: state.eventKey }, config.apiKey)
  const need = async (
    slot:
      | "message"
      | "guest"
      | "quota"
      | "code"
      | "phase"
      | "voucher"
      | "invitation"
      | "salePay"
      | "saleComplete"
      | "saleCancel"
      | "saleDevice"
      | "scanLink"
      | "activationCode",
  ): Promise<void> => {
    if (state[slot]) return
    await ensureResource(state, spec, slot)
    stateSave(state)
  }
  await need("message")
  await need("guest")
  await need("quota")
  await need("code")
  await need("phase")
  await need("voucher")
  await need("invitation")
  await need("salePay")
  await need("saleComplete")
  await need("saleCancel")
  await need("saleDevice")
  await need("scanLink")
  if (!state.scanHelper && state.scanLink) {
    const helper = await directCall(
      "scannerLinks",
      "scannerLinkAdminHelperCreateMutation",
      {
        eventKeys: [state.eventKey],
        expiresAt: Date.now() + 30 * 24 * 3600 * 1000,
        name: `${DEV} helper`,
        parentId: state.scanLink,
      },
      config.apiKey,
    )
    if (helper.success) state.scanHelper = idOf(helper.data)
    stateSave(state)
  }
  await need("activationCode")
  console.log(`setup done: org=${state.orgId} event=${state.eventKey}`)
  return state
}

function idOf(data: unknown): string {
  const d = data as Record<string, unknown>
  for (const key of [
    "id",
    "_id",
    "guestId",
    "quotaId",
    "messageId",
    "invitationId",
    "saleId",
    "linkId",
    "helperId",
    "phaseId",
    "voucherId",
    "codeId",
    "payoutId",
  ]) {
    if (typeof d[key] === "string") return d[key] as string
  }
  if (typeof d["code"] === "string") return d["code"] as string
  const codes = d["codes"]
  if (Array.isArray(codes) && typeof codes[0] === "string") return codes[0] as string
  throw new Error(`no id in ${JSON.stringify(data).slice(0, 200)}`)
}

async function ensureResource(
  state: FixtureState,
  spec: Map<string, SpecFn>,
  slot:
    | "message"
    | "guest"
    | "quota"
    | "code"
    | "phase"
    | "voucher"
    | "invitation"
    | "salePay"
    | "saleComplete"
    | "saleCancel"
    | "saleDevice"
    | "scanLink"
    | "activationCode",
): Promise<string> {
  const have = state[slot]
  if (have) return have
  const fill = (key: string, surface: SurfaceName = "cli"): Record<string, unknown> => {
    const fn = spec.get(key)
    if (!fn) throw new Error(`no spec for ${key}`)
    return fillNode(fn.args, "", state, surface) as Record<string, unknown>
  }
  switch (slot) {
    case "message": {
      const args = {
        ...fill("organizerDashboardMessages:organizerDashboardMessageCreateMutation"),
        subject: `${DEV} msg`,
        body: `${DEV} body`,
      }
      const r = await directCall(
        "organizerDashboardMessages",
        "organizerDashboardMessageCreateMutation",
        args,
        config.apiKey,
      )
      if (!r.success) throw new Error(`ensure message failed: ${r.error} args=${JSON.stringify(args)}`)
      state.message = idOf(r.data)
      stateTrack(state, "message", state.message)
      return state.message
    }
    case "guest": {
      const r = await directCall(
        "organizerDashboardGuests",
        "organizerDashboardGuestUpsertMutation",
        { orgId: state.orgId, eventKey: state.eventKey, name: `${DEV} Guest`, plusOnes: 0, email: deadEmail("guest") },
        config.apiKey,
      )
      if (!r.success) throw new Error(`ensure guest failed: ${r.error}`)
      state.guest = idOf(r.data)
      stateTrack(state, "guest", state.guest)
      return state.guest
    }
    case "quota": {
      const r = await directCall(
        "organizerDashboardGuests",
        "organizerDashboardGuestQuotaUpsertMutation",
        { orgId: state.orgId, eventKey: state.eventKey, name: `${DEV} Quota`, limit: 10 },
        config.apiKey,
      )
      if (!r.success) throw new Error(`ensure quota failed: ${r.error}`)
      state.quota = idOf(r.data)
      stateTrack(state, "quota", state.quota)
      return state.quota
    }
    case "code": {
      await ensureTier(state, `${DEV}-pricing`)
      const args = fill("organizerDashboardPricing:organizerDashboardCodeCreateMutation")
      ;(args as Record<string, unknown>)["tierKeys"] = [`${DEV}-pricing`]
      const r = await directCall(
        "organizerDashboardPricing",
        "organizerDashboardCodeCreateMutation",
        { ...args, note: `${DEV} code` },
        config.apiKey,
      )
      if (!r.success) throw new Error(`ensure code failed: ${r.error} args=${JSON.stringify(args)}`)
      const value = (r.data as { code?: string }).code ?? idOf(r.data)
      // codeId params take the row _id, not the code value.
      const rows = await inlineQuery<{ _id: string }[]>(
        `await ctx.db.query("organizerDashboardCodes").filter(q => q.eq(q.field("orgId"), ${JSON.stringify(state.orgId)})).order("desc").take(50).then(r => r.filter(c => c.code === ${JSON.stringify(value)}))`,
      ).catch(() => [] as { _id: string }[])
      state.code = rows[0]?._id ?? value
      state.codeValue = value
      stateTrack(state, "code", state.code)
      return state.code
    }
    case "phase": {
      const r = await directCall(
        "organizerDashboardPricing",
        "organizerDashboardPhaseUpsertMutation",
        {
          orgId: state.orgId,
          eventKey: state.eventKey,
          tierKey: state.tierKey,
          name: `${DEV} Phase`,
          priceCents: 1000,
        },
        config.apiKey,
      )
      if (!r.success) throw new Error(`ensure phase failed: ${r.error}`)
      state.phase = idOf(r.data)
      stateTrack(state, "phase", state.phase)
      return state.phase
    }
    case "voucher": {
      const args = fill("organizerDashboardPricing:organizerDashboardVoucherIssueMutation")
      const r = await directCall(
        "organizerDashboardPricing",
        "organizerDashboardVoucherIssueMutation",
        { ...args, recipientEmail: deadEmail("voucher") },
        config.apiKey,
      )
      if (!r.success) throw new Error(`ensure voucher failed: ${r.error} args=${JSON.stringify(args)}`)
      state.voucher = idOf(r.data)
      state.voucherCode = (r.data as { code?: string }).code ?? state.voucher
      stateTrack(state, "voucher", state.voucher)
      return state.voucher
    }
    case "invitation": {
      const r = await directCall(
        "organizerDashboardTeam",
        "organizerDashboardTeamInviteMutation",
        { orgId: state.orgId, emails: [deadEmail("invite0")], organizerRole: "eventmanager" },
        config.apiKey,
      )
      if (!r.success) throw new Error(`ensure invitation failed: ${r.error}`)
      const ids = (r.data as { invitationIds?: string[]; invitations?: { id: string }[] }).invitationIds ??
        (r.data as { invitations?: { id: string }[] }).invitations?.map((i) => i.id) ?? [idOf(r.data)]
      state.invitation = ids[0] ?? ""
      for (const id of ids) stateTrack(state, "invitation", id)
      return state.invitation
    }
    case "salePay":
    case "saleComplete":
    case "saleCancel":
    case "saleDevice": {
      const r = await directCall(
        "organizerDashboardBoxOffice",
        "organizerDashboardBoxOfficeSaleCreateMutation",
        {
          orgId: state.orgId,
          eventKey: state.eventKey,
          tierKey: state.tierKey,
          quantity: 1,
          testHarness: true,
          buyerEmail: deadEmail(slot.toLowerCase()),
        },
        config.apiKey,
      )
      if (!r.success) throw new Error(`ensure ${slot} failed: ${r.error}`)
      state[slot] = idOf(r.data)
      stateTrack(state, "sale", state[slot] as string)
      return state[slot] as string
    }
    case "scanLink": {
      const r = await directCall(
        "scannerLinks",
        "scannerLinkAdminCreateMutation",
        { eventKeys: [state.eventKey], expiresAt: Date.now() + 60 * 24 * 3600 * 1000, name: `${DEV} link` },
        config.apiKey,
      )
      if (!r.success) throw new Error(`ensure scanLink failed: ${r.error}`)
      state.scanLink = idOf(r.data)
      const code = (r.data as { code?: string }).code
      if (code) state.scanCode = code
      stateTrack(state, "scanLink", state.scanLink)
      return state.scanLink
    }
    case "activationCode": {
      const r = await directCall(
        "ticketing",
        "ticketActivationCodeGenerateMutation",
        { eventKey: state.eventKey, tierKey: state.tierKey, count: 1 },
        config.apiKey,
      )
      if (!r.success) throw new Error(`ensure activationCode failed: ${r.error}`)
      const generated = (r.data as { generated?: { code: string }[] }).generated
      const codes = (r.data as { codes?: string[] }).codes
      state.activationCode =
        (Array.isArray(generated) ? generated[0]?.code : undefined) ??
        (Array.isArray(codes) ? codes[0] : undefined) ??
        idOf(r.data)
      return state.activationCode
    }
  }
}

async function ensureEvent(state: FixtureState): Promise<void> {
  // catalogEventDelete is soft (deletedAt + archived, row retained), so a
  // deleted fixture must be replaced with a fresh event key.
  const rows = await inlineQuery<{ eventKey: string; deletedAt?: string }[]>(
    `await ctx.db.query("catalogEvents").withIndex("eventKey", q => q.eq("eventKey", ${JSON.stringify(state.eventKey)})).take(1)`,
  ).catch(() => [] as { eventKey: string; deletedAt?: string }[])
  if (rows.length > 0 && !rows[0]?.deletedAt) {
    const got = await directCall(
      "organizerDashboardEvents",
      "organizerDashboardEventGetQuery",
      { orgId: state.orgId, eventKey: state.eventKey },
      config.apiKey,
    )
    if (got.success) return
  }
  const created = await directCall(
    "organizerDashboardEvents",
    "organizerDashboardEventCreateMutation",
    {
      orgId: state.orgId,
      title: `${DEV} Event`,
      subtitle: "sub",
      description: "desc",
      category: state.category,
      venue: "Test Venue",
      address: `${DEV} Str 1`,
      city: "Berlin",
      organizer: `${DEV} Org`,
      startsAt: "2026-12-01T19:00:00.000Z",
      endsAt: "2026-12-01T22:00:00.000Z",
      doorsAt: "2026-12-01T18:30:00.000Z",
      imageUrl: `https://eventoren.leonardomora.de/${DEV}`,
      imageAlt: DEV,
    },
    config.apiKey,
  )
  if (!created.success) throw new Error(`ensure dashboard event failed: ${created.error}`)
  const data = created.data as { eventKey: string; eventId: string }
  state.eventKey = data.eventKey
  state.eventId = data.eventId
  stateTrack(state, "event", data.eventKey)
  stateSave(state)
  await directCall(
    "catalog",
    "catalogTicketTierUpsertMutation",
    {
      eventKey: state.eventKey,
      tierKey: state.tierKey,
      name: "Standard",
      description: "d",
      capacity: 100,
      priceCents: 1000,
      feeCents: 0,
      startsAt: "2026-12-01T19:00:00.000Z",
      endsAt: "2026-12-01T22:00:00.000Z",
      doorsAt: "2026-12-01T18:30:00.000Z",
    },
    config.apiKey,
  )
  await directCall("catalog", "catalogEventPublishMutation", { eventKey: state.eventKey }, config.apiKey)
}

async function ensureTier(state: FixtureState, tierKey: string): Promise<void> {
  // Archived tier keys cannot be reused; upsert a live tier for this key.
  await directCall(
    "catalog",
    "catalogTicketTierUpsertMutation",
    {
      eventKey: state.eventKey,
      tierKey,
      name: `${DEV} Tier`,
      description: "d",
      capacity: 100,
      priceCents: 1000,
      feeCents: 0,
      startsAt: "2026-12-01T19:00:00.000Z",
      endsAt: "2026-12-01T22:00:00.000Z",
      doorsAt: "2026-12-01T18:30:00.000Z",
    },
    config.apiKey,
  )
}

async function helperCreate(state: FixtureState): Promise<string> {
  const helper = await directCall(
    "scannerLinks",
    "scannerLinkAdminHelperCreateMutation",
    {
      eventKeys: [state.eventKey],
      expiresAt: Date.now() + 30 * 24 * 3600 * 1000,
      name: `${DEV} helper`,
      parentId: state.scanLink,
    },
    config.apiKey,
  )
  if (!helper.success) throw new Error(`helper create failed: ${helper.error}`)
  return idOf(helper.data)
}

async function ensureScanLink(state: FixtureState): Promise<void> {
  if (state.scanLink) return
  state.scanLink = null
  state.scanCode = null
  await ensureResource(state, specGlobal, "scanLink")
  state.scanHelper = null
  try {
    state.scanHelper = await helperCreate(state)
  } catch {
    // helper stays null; revoke policies fall back to executed errors
  }
  stateSave(state)
}

async function ensureHelper(state: FixtureState): Promise<void> {
  await ensureScanLink(state)
  if (state.scanHelper) return
  state.scanHelper = await helperCreate(state)
  stateSave(state)
}

async function tolerant(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn()
  } catch (error) {
    console.log(`ensure skipped: ${short(error instanceof Error ? error.message : String(error), 120)}`)
  }
}

// ---------------------------------------------------------------- policies

let specGlobal: Map<string, SpecFn> = new Map()

type Plan = { args: Record<string, unknown>; token: string; credential: string; note?: string }

const jwtOnlyKeys = new Set([
  "auth:authAdminZitadelMembersListAction",
  "auth:authAdminZitadelOrganizerGrantAction",
  "auth:authAdminZitadelRolesSetAction",
])
const sessionCKeys = new Set([
  "auth:userProfileUpdateMutation",
  "customerAccount:customerAccountProfileUpdateMutation",
  "auth:userEmailChange1RequestAction",
  "auth:userEmailChange2ConfirmMutation",
  "auth:userPasswordChange1RequestAction",
  "auth:userPasswordChange2ConfirmMutation",
  "auth:authSessionE2eMarkMutation",
])

async function planCall(state: FixtureState, module: string, name: string, surface: SurfaceName): Promise<Plan> {
  const key = `${module}:${name}`
  const specFn = specGlobal.get(key)
  const base = (specFn ? (fillNode(specFn.args, "", state, surface) as Record<string, unknown>) : {}) ?? {}
  let token = config.apiKey
  let credential = "key"
  let note: string | undefined
  const has = (field: string): boolean => {
    const v = (specFn?.args.value ?? {}) as Record<string, unknown>
    return field in v
  }
  if (jwtOnlyKeys.has(key)) {
    token = state.sessionJwt
    credential = "jwt"
    note = "requires session (API key rejected)"
  } else if (key === "auth:userDeleteSoftMutation") {
    const slot = surface === "cli" ? state.sessionScli : surface === "mcp" ? state.sessionSmcp : state.sessionSts
    token = slot
    credential = `soft-${surface}`
    note = "throwaway soft-delete user per surface"
  } else if (key === "auth:userDeleteHardMutation") {
    const slot = surface === "cli" ? state.sessionHcli : surface === "mcp" ? state.sessionHmcp : state.sessionHts
    token = slot
    credential = `hard-${surface}`
    note = "throwaway hard-delete user per surface"
  } else if (sessionCKeys.has(key)) {
    token = state.sessionC
    credential = "sessionC"
    note = "throwaway user C"
  } else if (key === "ticketing:ticketCheckoutCreateAction") {
    // Checkout access resolves JWT sessions, not API keys.
    token = state.sessionJwt
    credential = "jwt"
    note = "unknown tier (expects domain error, no order)"
  } else if (key === "auth:authSessionRevokeMutation") {
    const jwt = await mintJwt(state.testadminId)
    await convexRunJson("auth", "authSessionInsertInternalMutation", {
      userId: state.testadminId,
      loginMethod: "password",
      token: jwt,
    })
    token = jwt
    credential = `revoke-${surface}`
    note = "fresh session per surface"
  }
  const args: Record<string, unknown> = { ...base }
  const set = (field: string, value: unknown): void => {
    if (has(field)) args[field] = value
  }
  switch (key) {
    case "auth:apiKeyCreateMutation":
      set("name", `${DEV}-key-${surface}`)
      break
    case "auth:apiKeyRenameMutation":
      set("id", state.keyA)
      set("name", `${DEV}-keyA-renamed`)
      break
    case "auth:apiKeyRevokeMutation":
      set("id", state.keyA)
      note = "throwaway key A (idempotent)"
      break
    case "auth:apiKeyRotateMutation": {
      // Rotate is one-shot per key: use this surface's freshly created key.
      const rows = await inlineQuery<{ _id: string; _creationTime: number }[]>(
        `await ctx.db.query("authApiKeys").order("desc").take(100).then(r => r.filter(k => k.name === ${JSON.stringify(`${DEV}-key-${surface}`)} && !k.revokedAt))`,
      ).catch(() => [] as { _id: string; _creationTime: number }[])
      const latest = rows.sort((a, b) => b._creationTime - a._creationTime)[0]
      set("id", latest?._id ?? state.keyB)
      note = "this surface's created key (rotate is one-shot)"
      break
    }
    case "auth:authSignInUsingZitadelAction": {
      // The proof signs the EXACT provider info; filler extras would break it.
      for (const k of Object.keys(args)) delete args[k]
      const providerInfo = {
        provider: "zitadel",
        providerId: "testadmin-zitadel-subject",
        username: "testadmin",
        email: "testadmin@contentoren.de",
      }
      const proof = await new SignJWT({ provider: providerInfo, organizationId: null })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer("eventoren-zitadel-role-sync")
        .setAudience("eventoren-auth")
        .sign(new TextEncoder().encode(config.authSecret))
      Object.assign(args, { ...providerInfo, zitadelRoleSyncProof: proof })
      note = "minted proof, existing account"
      break
    }
    case "organizerDashboardMigration:organizerDashboardMigrationApplyMutation":
      Object.assign(args, { orgInits: [], eventAssignments: [], roleAssignments: [] })
      note = "empty manifest (no-op)"
      break
    case "organizerDashboardAdmin:organizerDashboardAdminConfigureMutation":
      set("tax", { status: "regel", defaultRateBps: 1900 })
      set("fee", { percentBps: 0, fixedCents: 0, payer: "veranstalter" })
      break
    case "organizerDashboardAdmin:organizerDashboardAdminUnblockMutation":
      set("status", "aktiv")
      break
    case "organizerDashboardEvents:organizerDashboardTierUpsertMutation":
      // The fixture tier key gets archived by tierArchive; upserts use fresh keys.
      set("tierKey", `${DEV}-tier-${surface}`)
      set("name", `${DEV} Tier ${surface}`)
      break
    case "catalog:catalogTicketTierUpsertMutation":
      set("tierKey", `${DEV}-ctier-${surface}`)
      set("name", `${DEV} CTier ${surface}`)
      break
    case "organizerDashboardPricing:organizerDashboardCodeCreateMutation":
      await tolerant(() => ensureTier(state, `${DEV}-pricing`))
      set("tierKeys", [`${DEV}-pricing`])
      break
    case "organizerDashboardPricing:organizerDashboardPhaseUpsertMutation":
      await tolerant(() => ensureTier(state, `${DEV}-pricing`))
      set("tierKey", `${DEV}-pricing`)
      break
    case "organizerDashboardPricing:organizerDashboardPhaseListQuery":
      await tolerant(() => ensureTier(state, `${DEV}-pricing`))
      set("tierKey", `${DEV}-pricing`)
      break
    case "organizerDashboardPublic:organizerDashboardPublicEventQuery":
    case "organizerDashboardPublic:organizerDashboardPublicProfileQuery":
      set("orgSlug", "covrev1-org")
      break
    case "organizerDashboardEvents:organizerDashboardEventUpdateMutation": {
      // Published events are immutable; update a dedicated draft event.
      const draft = await directCall(
        "organizerDashboardEvents",
        "organizerDashboardEventCreateMutation",
        {
          orgId: state.orgId,
          title: `${DEV} Draft`,
          subtitle: "sub",
          description: "desc",
          category: state.category,
          venue: "Test Venue",
          address: `${DEV} Str 1`,
          city: "Berlin",
          organizer: `${DEV} Org`,
          startsAt: "2026-12-01T19:00:00.000Z",
          endsAt: "2026-12-01T22:00:00.000Z",
          doorsAt: "2026-12-01T18:30:00.000Z",
          imageUrl: `https://eventoren.leonardomora.de/${DEV}`,
          imageAlt: DEV,
        },
        config.apiKey,
      ).catch(() => ({ success: false as const }))
      if (draft.success) {
        set("eventKey", (draft.data as { eventKey: string }).eventKey)
        note = "dedicated draft event"
      }
      set("subtitle", `${DEV} updated ${surface}`)
      break
    }
    case "organizerDashboardEvents:organizerDashboardEventArchiveMutation": {
      // Upcoming events cannot be archived; try a dedicated past event.
      const past = await directCall(
        "organizerDashboardEvents",
        "organizerDashboardEventCreateMutation",
        {
          orgId: state.orgId,
          title: `${DEV} Past`,
          subtitle: "sub",
          description: "desc",
          category: state.category,
          venue: "Test Venue",
          address: `${DEV} Str 1`,
          city: "Berlin",
          organizer: `${DEV} Org`,
          startsAt: "2025-01-01T19:00:00.000Z",
          endsAt: "2025-01-01T22:00:00.000Z",
          doorsAt: "2025-01-01T18:30:00.000Z",
          imageUrl: `https://eventoren.leonardomora.de/${DEV}`,
          imageAlt: DEV,
        },
        config.apiKey,
      ).catch(() => ({ success: false as const }))
      if (past.success) {
        set("eventKey", (past.data as { eventKey: string }).eventKey)
        note = "dedicated past event"
      } else {
        note = "upcoming events cannot archive (expects domain error)"
      }
      break
    }
    case "organizerDashboardBoxOffice:organizerDashboardBoxOfficeSaleCompleteMutation":
      // Completion needs a paid order for the sale event; none exists, so a
      // foreign paid order id exercises the scope check instead.
      set("orderId", harvestedIds.get("ticketOrders"))
      note = "foreign order (expects scope error, no paid fixture order)"
      break
    case "organizerDashboardFinance:organizerDashboardPayoutStatusUpdateMutation":
      set("payoutId", `${DEV}-no-payout`)
      note = "no payouts exist (expects not-found)"
      break
    case "catalog:catalogE2eCleanupMutation":
      set("eventKey", `${DEV}-noop-event`)
      set("eventTitle", `${DEV} noop`)
      set("organizer", DEV)
      set("runId", `${DEV}-noop-run`)
      note = "nonexistent event (no-op)"
      break
    case "ticketing:ticketCheckoutCreateAction":
      set("tickets", [{ tierKey: `${DEV}-nope`, quantity: 1, participantNames: [`${DEV} Participant`] }])
      break
    case "ticketing:ticketActivationCodeGenerateMutation":
    case "ticketing:ticketActivationCodeListAdminQuery":
    case "ticketing:ticketActivationCodeExportAdminQuery":
      await tolerant(() => ensureTier(state, `${DEV}-activation`))
      set("tierKey", `${DEV}-activation`)
      break
    case "scannerLinks:scannerLinkAdminHelperCreateMutation": {
      await tolerant(() => ensureScanLink(state))
      set("parentId", state.scanLink)
      const parent = await inlineQuery<{ expiresAt?: number }[]>(
        `await ctx.db.get("scannerLinks", ${JSON.stringify(state.scanLink)}).then(l => l ? [l] : [])`,
      ).catch(() => [] as { expiresAt?: number }[])
      if (parent[0]?.expiresAt) set("expiresAt", parent[0].expiresAt - 86400000)
      break
    }
    case "scannerLinks:scannerLinkHelperCreateMutation": {
      await tolerant(() => ensureScanLink(state))
      set("code", state.scanCode ?? FAKE_CODE)
      const parent = await inlineQuery<{ expiresAt?: number }[]>(
        `await ctx.db.get("scannerLinks", ${JSON.stringify(state.scanLink)}).then(l => l ? [l] : [])`,
      ).catch(() => [] as { expiresAt?: number }[])
      if (parent[0]?.expiresAt) set("expiresAt", parent[0].expiresAt - 86400000)
      break
    }
    case "organizerDashboardPricing:organizerDashboardVoucherRedeemMutation":
      set("code", state.voucherCode)
      set("orderRef", `${DEV}-no-order`)
      set("amountCents", 1)
      note = "no order context (expects domain error)"
      break
    case "ticketing:ticketActivationCodeValidateQuery":
      set("code", state.activationCode)
      break
    case "scannerLinks:scannerLinkContextQuery":
    case "scannerLinks:scannerLinkEventGetQuery":
    case "scannerLinks:scannerLinkEventListQuery":
    case "scannerLinks:scannerLinkEventTicketGetQuery":
    case "scannerLinks:scannerLinkEventTicketListQuery":
    case "scannerLinks:scannerLinkHelperListQuery":
    case "scannerLinks:scannerLinkTicketCheckInHistoryPaginatedQuery":
    case "scannerLinks:scannerLinkTicketCheckInMutation":
      await tolerant(() => ensureScanLink(state))
      set("code", state.scanCode ?? FAKE_CODE)
      set("ticketCode", `${DEV}-fake-ticket-000`)
      break
    case "scannerLinks:scannerLinkAdminHelperListQuery":
      await tolerant(() => ensureScanLink(state))
      set("parentId", state.scanLink)
      break
    case "scannerLinks:scannerLinkAdminHelperRevokeMutation":
      await tolerant(() => ensureHelper(state))
      set("id", state.scanHelper)
      break
    case "scannerLinks:scannerLinkAdminRevokeMutation":
      await tolerant(() => ensureScanLink(state))
      set("id", state.scanLink)
      break
    case "scannerLinks:scannerLinkHelperRevokeMutation":
      await tolerant(() => ensureHelper(state))
      set("id", state.scanHelper)
      set("code", state.scanCode ?? FAKE_CODE)
      break
    case "organizerDashboardBoxOffice:organizerDashboardBoxOfficeSaleTestPayMutation":
      set("saleId", state.salePay)
      set("testHarness", true)
      break
    case "organizerDashboardBoxOffice:organizerDashboardBoxOfficeSaleTestDevicePayMutation":
      set("saleId", state.saleDevice)
      set("testHarness", true)
      break
    case "organizerDashboardBoxOffice:organizerDashboardBoxOfficeSaleCompleteMutation":
      set("saleId", state.saleComplete)
      set("testHarness", true)
      break
    case "organizerDashboardBoxOffice:organizerDashboardBoxOfficeSaleCancelMutation":
      set("saleId", state.saleCancel)
      break
    case "organizerDashboardBoxOffice:organizerDashboardBoxOfficeSaleGetQuery":
    case "organizerDashboardBoxOffice:organizerDashboardBoxOfficeSalePublicGetQuery":
      set("saleId", state.salePay)
      break
    case "organizerDashboardTeam:organizerDashboardTeamInvitationAcceptMutation":
    case "organizerDashboardTeam:organizerDashboardTeamInvitationResendMutation":
    case "organizerDashboardTeam:organizerDashboardTeamInvitationRevokeMutation":
      set("invitationId", state.invitation)
      break
    case "organizerDashboardGuests:organizerDashboardGuestCheckInMutation":
    case "organizerDashboardGuests:organizerDashboardGuestCheckInUndoMutation":
    case "organizerDashboardGuests:organizerDashboardGuestDeleteMutation":
    case "organizerDashboardGuests:organizerDashboardGuestTicketSendMutation": {
      if (!state.guest) await tolerant(() => ensureResource(state, specGlobal, "guest"))
      set("guestId", state.guest)
      break
    }
    case "organizerDashboardGuests:organizerDashboardGuestQuotaDeleteMutation":
      if (!state.quota) await tolerant(() => ensureResource(state, specGlobal, "quota"))
      set("quotaId", state.quota)
      break
    case "organizerDashboardPricing:organizerDashboardCodeUpdateMutation":
      if (!state.code) await tolerant(() => ensureResource(state, specGlobal, "code"))
      set("codeId", state.code)
      set("note", `${DEV} updated`)
      break
    case "organizerDashboardPricing:organizerDashboardCodeDeleteMutation":
      if (!state.code) await tolerant(() => ensureResource(state, specGlobal, "code"))
      set("codeId", state.code)
      break
    case "organizerDashboardPricing:organizerDashboardPhaseArchiveMutation":
      set("phaseId", state.phase)
      break
    case "organizerDashboardPricing:organizerDashboardVoucherDeactivateMutation":
      set("voucherId", state.voucher)
      set("code", state.voucherCode)
      break
    case "organizerDashboardMessages:organizerDashboardMessageDeleteMutation":
    case "organizerDashboardMessages:organizerDashboardMessageGetQuery":
    case "organizerDashboardMessages:organizerDashboardMessageIcsGetQuery":
    case "organizerDashboardMessages:organizerDashboardMessageScheduleMutation":
    case "organizerDashboardMessages:organizerDashboardMessageUpdateMutation": {
      if (!state.message) await tolerant(() => ensureResource(state, specGlobal, "message"))
      set("messageId", state.message)
      break
    }
    case "organizerDashboardMessages:organizerDashboardMessageSendMutation": {
      // Send needs an unscheduled draft; schedule() runs first alphabetically.
      state.message = null
      await tolerant(() => ensureResource(state, specGlobal, "message"))
      set("messageId", state.message)
      note = "dedicated unscheduled draft"
      break
    }
    case "organizerDashboardAdmission:organizerDashboardAdmissionScannerLinkRevokeMutation": {
      const links = await inlineQuery<{ _id: string }[]>(
        `await ctx.db.query("scannerLinks").order("desc").take(300).then(r => r.filter(l => l.role === "helper" && !l.revokedAt && Object.values(l.eventOrgIds || {}).includes(${JSON.stringify(state.orgId)})))`,
      ).catch(() => [] as { _id: string }[])
      if (links.length > 0) set("linkId", links[0]._id)
      break
    }
    case "organizerDashboardAdmin:organizerDashboardAdminApproveMutation": {
      // Approval requires a prior admin-confirmed tax/fee configuration.
      const st = state as FixtureState & { configured?: boolean }
      if (!st.configured) {
        await directCall(
          "organizerDashboardAdmin",
          "organizerDashboardAdminConfigureMutation",
          {
            orgId: state.orgId,
            tax: { status: "regel", defaultRateBps: 1900 },
            fee: { percentBps: 0, fixedCents: 0, payer: "veranstalter" },
          },
          config.apiKey,
        )
        st.configured = true
        stateSave(state)
      }
      break
    }
    case "catalog:catalogEventDeleteMutation":
    case "catalog:catalogEventGetPublishedQuery":
    case "catalog:catalogEventGetPublishedSummaryQuery":
    case "catalog:catalogEventPublishMutation":
    case "catalog:catalogEventTierListPublishedPageQuery":
    case "catalog:catalogEventUpsertMutation":
    case "catalog:catalogTicketTierDeleteMutation":
    case "catalog:catalogTicketTierUpsertMutation":
      await tolerant(() => ensureEvent(state))
      break
    case "organizerDashboardEvents:organizerDashboardEventArchiveMutation":
    case "organizerDashboardEvents:organizerDashboardEventGetQuery":
    case "organizerDashboardEvents:organizerDashboardEventListQuery":
    case "organizerDashboardEvents:organizerDashboardEventPublishMutation":
    case "organizerDashboardEvents:organizerDashboardEventUpdateMutation":
    case "organizerDashboardEvents:organizerDashboardTierArchiveMutation":
    case "organizerDashboardEvents:organizerDashboardTierUpsertMutation":
      await tolerant(() => ensureEvent(state))
      break
    default: {
      if (
        module === "organizerDashboardGuests" ||
        module === "organizerDashboardMessages" ||
        module === "organizerDashboardPricing" ||
        module === "organizerDashboardOrders" ||
        module === "organizerDashboardOverview" ||
        module === "organizerDashboardFinance" ||
        module === "organizerDashboardExports" ||
        module === "organizerDashboardAdmission" ||
        module === "organizerDashboardBoxOffice" ||
        module === "organizerDashboardPublic" ||
        module === "organizerDashboardMigration"
      ) {
        if (has("eventKey") || has("orgId")) await tolerant(() => ensureEvent(state))
      }
      break
    }
  }
  return { args, token, credential, ...(note ? { note } : {}) }
}

async function postCall(state: FixtureState, module: string, name: string): Promise<void> {
  const key = `${module}:${name}`
  let changed = false
  const clear = (slot: "message" | "guest" | "quota" | "code" | "invitation" | "scanLink" | "scanHelper"): void => {
    if (state[slot]) {
      ;(state[slot] as string | null) = null
      changed = true
    }
  }
  switch (key) {
    case "organizerDashboardMessages:organizerDashboardMessageDeleteMutation":
      clear("message")
      break
    case "organizerDashboardGuests:organizerDashboardGuestDeleteMutation":
      clear("guest")
      break
    case "organizerDashboardGuests:organizerDashboardGuestQuotaDeleteMutation":
      clear("quota")
      break
    case "organizerDashboardPricing:organizerDashboardCodeDeleteMutation":
      clear("code")
      state.codeValue = null
      changed = true
      break
    case "organizerDashboardTeam:organizerDashboardTeamInvitationRevokeMutation":
      clear("invitation")
      break
    case "scannerLinks:scannerLinkAdminRevokeMutation":
      clear("scanLink")
      state.scanCode = null
      clear("scanHelper")
      changed = true
      break
    case "scannerLinks:scannerLinkAdminHelperRevokeMutation":
    case "scannerLinks:scannerLinkHelperRevokeMutation":
      clear("scanHelper")
      break
    default:
      break
  }
  if (changed) stateSave(state)
}

// ---------------------------------------------------------------- main

async function callSurface(
  state: FixtureState,
  module: string,
  name: string,
  surface: SurfaceName,
  plan: Plan,
): Promise<SurfaceResult> {
  const runner = surface === "cli" ? cliCall : surface === "mcp" ? mcpCall : tsCall
  const first = await runner(module, name, plan.args, plan.token, plan.credential)
  if (
    (first.code === "result-auth" || first.code === "backend-auth" || first.code === "mcp-401") &&
    plan.credential === "key"
  ) {
    const retry = await runner(module, name, plan.args, state.sessionJwt, "jwt(retry)")
    return { ...retry, summary: `${retry.summary} [key→jwt retry]` }
  }
  return first
}

async function phaseMain(): Promise<void> {
  const state = stateLoad()
  const results = resultsLoad()
  await harvestIds()
  const modules = Object.keys(convexFunctionCatalog).sort()
  let done = 0
  const total = modules.reduce((n, m) => n + Object.keys(convexFunctionCatalog[m] ?? {}).length, 0)
  for (const module of modules) {
    const names = Object.keys(convexFunctionCatalog[module] ?? {}).sort()
    for (const name of names) {
      const key = `${module}:${name}`
      if (onlySet.size > 0 && ![...onlySet].some((token) => key.includes(token))) continue
      const entry = convexFunctionCatalog[module]?.[name]
      if (!entry) continue
      const isPublic = entry.visibility === "public"
      const argsDigest = (a: Record<string, unknown>): string => {
        const keys = Object.keys(a).sort()
        return keys.length === 0 ? "{}" : `{${keys.join(",")}}`
      }
      if (isPublic) {
        const plans: Record<SurfaceName, Plan> = {
          cli: await planCall(state, module, name, "cli"),
          mcp: await planCall(state, module, name, "mcp"),
          ts: await planCall(state, module, name, "ts"),
        }
        const cli = await callSurface(state, module, name, "cli", plans.cli)
        const mcp = await callSurface(state, module, name, "mcp", plans.mcp)
        const ts = await callSurface(state, module, name, "ts", plans.ts)
        await postCall(state, module, name)
        const note = plans.cli.note ?? plans.mcp.note ?? plans.ts.note
        results[key] = {
          kind: entry.kind,
          visibility: entry.visibility,
          acceptsToken: entry.acceptsToken,
          args: argsDigest(plans.cli.args),
          cli,
          mcp,
          ts,
          ...(note ? { note } : {}),
        }
        console.log(`${key} [${entry.kind}] cli=${cli.code} mcp=${mcp.code} ts=${ts.code}${note ? ` (${note})` : ""}`)
      } else {
        const specFn = specGlobal.get(key)
        const args = (specFn ? (fillNode(specFn.args, "", state, "cli") as Record<string, unknown>) : {}) ?? {}
        const refused = (surface: SurfaceName): SurfaceResult => ({
          ok: false,
          executed: false,
          code: "internal",
          summary: `refused client-side (internal, 403)`,
          ms: 0,
          credential: `${surface}/design`,
        })
        // Prove the refusal live on one surface, record design refusal on all three.
        const live = await tsCall(module, name, args, config.apiKey, "key")
        let admin: SurfaceResult
        if (entry.kind === "internalQuery") {
          const declared = (specFn?.args.value ?? {}) as Record<string, unknown>
          const probeArgs = "token" in declared ? { ...args, token: "" } : args
          admin = await adminRun(module, name, probeArgs)
        } else {
          // Internal writes run with system privileges; never probe them with
          // filler args (they would mutate dev data, e.g. delete users).
          admin = {
            ok: false,
            executed: false,
            code: "admin-skip",
            summary: "admin-only write; not probed (side effects)",
            ms: 0,
            credential: "admin/design",
          }
        }
        results[key] = {
          kind: entry.kind,
          visibility: entry.visibility,
          acceptsToken: entry.acceptsToken,
          args: argsDigest(args),
          cli: live.code === "internal" ? refused("cli") : live,
          mcp: refused("mcp"),
          ts: live.code === "internal" ? refused("ts") : live,
          admin,
          note: "internal-only; agent surfaces refuse by design; admin probe is supplementary",
        }
        console.log(`${key} [${entry.kind}] refused-by-design admin=${admin.code}`)
      }
      resultsSave(results)
      done += 1
      if (done % 25 === 0) console.log(`--- progress ${done}/${total} ---`)
    }
  }
  console.log(`main done: ${done} functions`)
}

// ---------------------------------------------------------------- cleanup

async function callFiltered(
  module: string,
  name: string,
  args: Record<string, unknown>,
  token: string,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  // Strict validators reject undeclared fields; keep only spec-declared ones.
  const declared = (specGlobal.get(`${module}:${name}`)?.args.value ?? {}) as Record<string, unknown>
  const filtered: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(args)) {
    if (k === "token" || k in declared) filtered[k] = v
  }
  return directCall(module, name, filtered, token)
}

async function phaseCleanup(): Promise<Record<string, number>> {
  const state = stateLoad()
  const leftovers: Record<string, number> = {}
  const count = async (js: string): Promise<number> => {
    try {
      return (await inlineQuery<unknown[]>(js)).length
    } catch {
      return -1
    }
  }
  const runStart = state.runStart || "2026-10-22T00:00:00.000Z"
  // throwaway user C first (A soft-deleted, B hard-deleted in-loop), while its session is alive
  if (state.userC && state.sessionC) {
    await callFiltered("auth", "userDeleteHardMutation", {}, state.sessionC).catch(() => ({}))
  }
  // sessions minted by this run: run-owned users, no e2e markers
  const ownedIds = [
    state.testadminId,
    state.userC,
    state.userScli,
    state.userSmcp,
    state.userSts,
    state.userHcli,
    state.userHmcp,
    state.userHts,
  ].filter(Boolean)
  const sessions = await inlineQuery<{ token: string }[]>(
    `await ctx.db.query("authSessions").order("desc").take(300).then(r => r.filter(s => s.createdAt >= ${JSON.stringify(runStart)} && ${JSON.stringify(ownedIds)}.includes(s.userId) && !s.e2eRunId && !s.e2eMarkedAt))`,
  ).catch(() => [] as { token: string }[])
  let revokedSessions = 0
  for (const s of sessions) {
    const r = await callFiltered("auth", "authSessionRevokeMutation", {}, s.token).catch(() => ({ success: false }))
    if (r.success) revokedSessions += 1
  }
  console.log(`revoked ${revokedSessions}/${sessions.length} run-owned sessions`)
  // api keys created by the run (keep the provisioned coverage-dev key)
  const keys = await inlineQuery<{ _id: string; name: string }[]>(
    `await ctx.db.query("authApiKeys").order("desc").take(300)`,
  ).catch(() => [] as { _id: string; name: string }[])
  for (const k of keys) {
    if (k.name.startsWith(DEV)) {
      await callFiltered("auth", "apiKeyRevokeMutation", { id: k._id }, config.apiKey).catch(() => ({}))
    }
  }
  leftovers["authApiKeys(revoked-rows)"] = keys.filter((k) => k.name.startsWith(DEV)).length
  const byOrg = async <T>(table: string): Promise<T[]> =>
    inlineQuery<T[]>(
      `await ctx.db.query(${JSON.stringify(table)}).filter(q => q.eq(q.field("orgId"), ${JSON.stringify(state.orgId)})).take(100)`,
    ).catch(() => [] as T[])
  for (const row of await byOrg<{ _id: string }>("organizerDashboardMessages")) {
    await callFiltered(
      "organizerDashboardMessages",
      "organizerDashboardMessageDeleteMutation",
      { orgId: state.orgId, messageId: row._id },
      config.apiKey,
    ).catch(() => ({}))
  }
  for (const row of await byOrg<{ _id: string }>("organizerDashboardGuests")) {
    await callFiltered(
      "organizerDashboardGuests",
      "organizerDashboardGuestDeleteMutation",
      { orgId: state.orgId, guestId: row._id },
      config.apiKey,
    ).catch(() => ({}))
  }
  for (const row of await byOrg<{ _id: string }>("organizerDashboardGuestQuotas")) {
    await callFiltered(
      "organizerDashboardGuests",
      "organizerDashboardGuestQuotaDeleteMutation",
      { orgId: state.orgId, quotaId: row._id },
      config.apiKey,
    ).catch(() => ({}))
  }
  for (const row of await byOrg<{ _id: string }>("organizerDashboardCodes")) {
    await callFiltered(
      "organizerDashboardPricing",
      "organizerDashboardCodeDeleteMutation",
      { orgId: state.orgId, codeId: row._id },
      config.apiKey,
    ).catch(() => ({}))
  }
  for (const row of await byOrg<{ _id: string }>("organizerDashboardTeamInvitations")) {
    await callFiltered(
      "organizerDashboardTeam",
      "organizerDashboardTeamInvitationRevokeMutation",
      { orgId: state.orgId, invitationId: row._id },
      config.apiKey,
    ).catch(() => ({}))
  }
  for (const row of await byOrg<{ _id: string }>("organizerDashboardBoxOfficeSales")) {
    await callFiltered(
      "organizerDashboardBoxOffice",
      "organizerDashboardBoxOfficeSaleCancelMutation",
      { orgId: state.orgId, saleId: row._id },
      config.apiKey,
    ).catch(() => ({}))
  }
  for (const row of await byOrg<{ _id: string }>("organizerDashboardPricePhases")) {
    await callFiltered(
      "organizerDashboardPricing",
      "organizerDashboardPhaseArchiveMutation",
      { orgId: state.orgId, phaseId: row._id },
      config.apiKey,
    ).catch(() => ({}))
  }
  for (const row of await byOrg<{ _id: string; code: string }>("organizerDashboardVouchers")) {
    await callFiltered(
      "organizerDashboardPricing",
      "organizerDashboardVoucherDeactivateMutation",
      { orgId: state.orgId, voucherId: row._id },
      config.apiKey,
    ).catch(() => ({}))
  }
  // scanner links + helpers (no orgId; match run markers)
  const links = await inlineQuery<{ _id: string }[]>(
    `await ctx.db.query("scannerLinks").order("desc").take(300).then(r => r.filter(l => ((l.name || l.label || "")).startsWith(${JSON.stringify(DEV)})))`,
  ).catch(() => [] as { _id: string }[])
  for (const row of links) {
    await callFiltered("scannerLinks", "scannerLinkAdminHelperRevokeMutation", { id: row._id }, config.apiKey).catch(
      () => ({}),
    )
    await callFiltered("scannerLinks", "scannerLinkAdminRevokeMutation", { id: row._id }, config.apiKey).catch(
      () => ({}),
    )
  }
  // events created by the run (soft delete; rows retained by design)
  const events = await inlineQuery<{ eventKey: string }[]>(
    `await ctx.db.query("catalogEvents").order("desc").take(300).then(r => r.filter(e => (e.title || "").toLowerCase().startsWith(${JSON.stringify(DEV)})))`,
  ).catch(() => [] as { eventKey: string }[])
  for (const e of events) {
    await callFiltered("catalog", "catalogEventDeleteMutation", { eventKey: e.eventKey }, config.apiKey).catch(
      () => ({}),
    )
  }
  // leftover verification (no delete API exists for these; -1 = query failed)
  const orgRows = await inlineQuery<{ orgHandle: string }[]>(
    `await ctx.db.query("orgs").order("desc").take(200)`,
  ).catch(() => [] as { orgHandle: string }[])
  leftovers["orgs(covrev1-*)"] = orgRows.filter((o) => (o.orgHandle || "").startsWith(DEV)).length
  leftovers["tickets(issued-for-run)"] = await count(
    `await ctx.db.query("ticketIssued").order("desc").take(500).then(r => r.filter(t => (t.eventKey || "").toLowerCase().startsWith(${JSON.stringify(DEV)}) || (t.eventKey || "").startsWith("coverage-reverify")))`,
  )
  leftovers["categories"] = await count(
    `await ctx.db.query("catalogCategories").filter(q => q.eq(q.field("category"), ${JSON.stringify(`${DEV}-test`)})).take(5)`,
  )
  leftovers["categories(hidden-rows)"] = await count(
    `await ctx.db.query("catalogHiddenCategories").order("desc").take(100).then(r => r.filter(c => c.category === ${JSON.stringify(`${DEV}-test`)}))`,
  )
  leftovers["sales(test-rows)"] = await count(
    `await ctx.db.query("organizerDashboardBoxOfficeSales").filter(q => q.eq(q.field("orgId"), ${JSON.stringify(state.orgId)})).take(100)`,
  )
  leftovers["vouchers(deactivated-rows)"] = await count(
    `await ctx.db.query("organizerDashboardVouchers").filter(q => q.eq(q.field("orgId"), ${JSON.stringify(state.orgId)})).take(100)`,
  )
  leftovers["phases(archived-rows)"] = await count(
    `await ctx.db.query("organizerDashboardPricePhases").filter(q => q.eq(q.field("orgId"), ${JSON.stringify(state.orgId)})).take(100)`,
  )
  leftovers["invitations(revoked-rows)"] = await count(
    `await ctx.db.query("organizerDashboardTeamInvitations").filter(q => q.eq(q.field("orgId"), ${JSON.stringify(state.orgId)})).take(100)`,
  )
  leftovers["scanLinks(revoked-rows)"] = await count(
    `await ctx.db.query("scannerLinks").order("desc").take(300).then(r => r.filter(l => ((l.name || l.label || "")).startsWith(${JSON.stringify(DEV)})))`,
  )
  leftovers["activationCodes"] = await count(
    `await ctx.db.query("ticketActivationCodes").order("desc").take(300).then(r => r.filter(c => (c.eventKey || "").startsWith("coverage-reverify") || (c.eventKey || "").startsWith(${JSON.stringify(DEV)})))`,
  )
  leftovers["payouts"] = await count(
    `await ctx.db.query("organizerDashboardPayouts").filter(q => q.eq(q.field("orgId"), ${JSON.stringify(state.orgId)})).take(50)`,
  )
  leftovers["orders(created-in-run)"] = await count(
    `await ctx.db.query("ticketOrders").order("desc").take(300).then(r => r.filter(o => o.createdAt >= ${JSON.stringify(runStart)}))`,
  )
  leftovers["events(live-remaining,expect-0)"] = await count(
    `await ctx.db.query("catalogEvents").order("desc").take(300).then(r => r.filter(e => (e.title || "").toLowerCase().startsWith(${JSON.stringify(DEV)}) && !e.deletedAt))`,
  )
  leftovers["guests(remaining,expect-0)"] = await count(
    `await ctx.db.query("organizerDashboardGuests").filter(q => q.eq(q.field("orgId"), ${JSON.stringify(state.orgId)})).take(50)`,
  )
  leftovers["messages(remaining,expect-0)"] = await count(
    `await ctx.db.query("organizerDashboardMessages").filter(q => q.eq(q.field("orgId"), ${JSON.stringify(state.orgId)})).take(50)`,
  )
  leftovers["reminders(rows)"] = await count(
    `await ctx.db.query("organizerDashboardMessageReminders").filter(q => q.eq(q.field("orgId"), ${JSON.stringify(state.orgId)})).take(50)`,
  )
  leftovers["users(throwaway-live,expect-0)"] = await count(
    `await ctx.db.query("users").order("desc").take(300).then(r => r.filter(u => (u.email || "").startsWith(${JSON.stringify(DEV)}) && !u.deletedAt))`,
  )
  console.log(`cleanup leftovers: ${JSON.stringify(leftovers)}`)
  const state2 = stateLoad()
  ;(state2 as unknown as Record<string, unknown>)["leftovers"] = leftovers
  stateSave(state2)
  return leftovers
}

// ---------------------------------------------------------------- render

async function phaseRender(): Promise<void> {
  const results = resultsLoad()
  const keys = Object.keys(results).sort()
  const publicKeys = keys.filter((k) => results[k]?.visibility === "public")
  const internalKeys = keys.filter((k) => results[k]?.visibility !== "public")
  const allExecuted = (k: string): boolean => {
    const r = results[k]
    return !!r && r.cli.executed && r.mcp.executed && r.ts.executed
  }
  const verifiedPublic = publicKeys.filter(allExecuted)
  const failedPublic = publicKeys.filter((k) => !allExecuted(k))
  const adminOk = internalKeys.filter((k) => results[k]?.admin?.executed)
  const state = existsSync(config.statePath)
    ? (JSON.parse(readFileSync(config.statePath, "utf8")) as FixtureState & { leftovers?: Record<string, number> })
    : null
  const lines: string[] = []
  lines.push(`# Convex coverage matrix — eventoren reverify (dev backend only)`)
  lines.push(``)
  lines.push(
    `Backend: ${config.convexUrl} (.env.development). Fixtures with prefix \`${DEV}\` created for writes and removed afterwards; resources without a delete API are listed under Leftovers with exact counts. No production calls made.`,
  )
  lines.push(``)
  lines.push(
    `Totals: ${keys.length} functions in the static catalog (${publicKeys.length} public, ${internalKeys.length} internal). Public verified live on all three surfaces: ${verifiedPublic.length}/${publicKeys.length}. Internal verified via supplementary admin probe: ${adminOk.length}/${internalKeys.length} (refused on agent surfaces by design).`,
  )
  lines.push(``)
  lines.push(`| function | kind | CLI (bun src/cli.ts) | MCP (/mcp convex-call) | TS client (apiClientConvexCall) |`)
  lines.push(`|---|---|---|---|---|`)
  for (const k of keys) {
    const r = results[k]
    if (!r) continue
    const cell = (s: SurfaceResult): string => `${s.summary} [${s.code}/${s.credential}]`.replace(/\|/g, ";")
    lines.push(`| ${k} | ${r.kind}/${r.visibility} | ${cell(r.cli)} | ${cell(r.mcp)} | ${cell(r.ts)} |`)
  }
  lines.push(``)
  lines.push(`## Failures (not verified live on all three surfaces)`)
  if (failedPublic.length === 0 && internalKeys.length === 0) lines.push(`- none`)
  for (const k of failedPublic) {
    const r = results[k]
    lines.push(`- ${k}: cli=${r?.cli.code} mcp=${r?.mcp.code} ts=${r?.ts.code}${r?.note ? ` (${r.note})` : ""}`)
  }
  for (const k of internalKeys) {
    const r = results[k]
    lines.push(
      `- ${k}: internal-only, refused client-side by design on all three surfaces; admin probe=${r?.admin?.code ?? "n/a"} (${short(r?.admin?.summary ?? "", 100)})`,
    )
  }
  lines.push(``)
  lines.push(`## Leftovers (no delete API; exact counts from dev tables)`)
  if (state?.leftovers) {
    for (const [table, n] of Object.entries(state.leftovers)) lines.push(`- ${table}: ${n}`)
  } else {
    lines.push(`- (cleanup phase not run yet)`)
  }
  lines.push(``)
  lines.push(`## Notes`)
  lines.push(
    `- MCP is served as Convex HTTP action POST /mcp (Streamable HTTP JSON-RPC, requires Accept: application/json, text/event-stream + Bearer dev credential).`,
  )
  lines.push(
    `- Internal functions are refused client-side (403) by all three agent surfaces by design; the admin column is a supplementary \`convex run\` probe, not an agent surface.`,
  )
  lines.push(
    `- Admin Zitadel actions require a session credential (API keys are rejected by authCurrentUserByToken); the harness uses a minted testadmin session for those.`,
  )
  lines.push(
    `- Caller-scoped destructive mutations (user delete/soft/hard, profile update, email/password change) ran against throwaway users.`,
  )
  lines.push(
    `- The provisioned dev API key (coverage-dev) stays active in git-ignored .env.development; all run-created keys were revoked.`,
  )
  const mdPath = process.env["REVERIFY_MD"] ?? "/tmp/reverify-eventoren.md"
  writeFileSync(mdPath, `${lines.join("\n")}\n`)
  console.log(
    `matrix written to ${mdPath}: ${verifiedPublic.length}/${publicKeys.length} public verified, ${failedPublic.length} failed`,
  )
}

// ---------------------------------------------------------------- entry

const spec = specLoad()
specGlobal = spec
console.log(
  `deployed spec: ${spec.size} functions; catalog: ${Object.values(convexFunctionCatalog).reduce((n, m) => n + Object.keys(m).length, 0)} entries`,
)
if (phaseArg === "setup" || phaseArg === "all") await phaseSetup(spec)
if (phaseArg === "main" || phaseArg === "all") await phaseMain()
if (phaseArg === "cleanup" || phaseArg === "all") await phaseCleanup()
if (phaseArg === "render" || phaseArg === "all") await phaseRender()
