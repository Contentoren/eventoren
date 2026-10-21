#!/usr/bin/env bun
/**
 * LOCAL-ONLY real UI acceptance: contract onboarding, organization isolation,
 * FAQ/schedule persistence, and public rendering. No mocks, provider calls,
 * purchases, deployment, server startup, or cleanup of unrelated data.
 *
 * Run from this worktree (parent owns execution/browser supervision):
 *   bun e2e/dashboard/veranstalterContractsContentLocalE2e.ts --tag <loweralnum> --phase guards
 *   bun e2e/dashboard/veranstalterContractsContentLocalE2e.ts --tag <loweralnum> --phase setup
 *   bun e2e/dashboard/veranstalterContractsContentLocalE2e.ts --tag <loweralnum> --phase ui
 *   bun e2e/dashboard/veranstalterContractsContentLocalE2e.ts --tag <loweralnum> --phase verify
 * Or --phase all. Every live phase repeats bootstrap verify BEFORE token reads.
 * --phase selftest is offline: no tokens, network, browser, or fixture mutations.
 *
 * setup only validates fixture authentication and records baseline org IDs.
 * ui creates BOTH organizations by actual onboarding. Later API writes are
 * explicitly labeled setup: configure/approve synthetic A, create its draft,
 * add one synthetic tier. Content edits and publishing remain actual UI work.
 * A tag is single-use for ui; a failed run is not silently replayed as a pass.
 * Use a new tag after failure. setup/ui/verify share private run state.
 *
 * Documents are OPENED/RENDERED, never claimed to have been read by a human.
 * Internal consent evidence rows are NOT accessible through the normal API;
 * exact current revisions/UTC consent instants are checked via organization-get.
 * The current shell has organization-selection cards, NOT a dropdown. The
 * switch test uses the actual switch link/cards, with no B URL injection.
 * No theme control exists in this shell: screenshots record actual data-theme,
 * without treating a media preference as application dark-mode coverage.
 */
import { spawnSync } from "node:child_process"
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { ConvexHttpClient } from "convex/browser"
import * as v from "valibot"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type Result } from "#result"
import { catalogEventFaqsSchema } from "#src/catalog/catalogEventFaqsSchema.ts"
import { catalogEventScheduleSchema } from "#src/catalog/catalogEventScheduleSchema.ts"
import { organizerContractDocuments } from "#src/organizer/dashboard/contracts/organizerContractDocuments.ts"

const WORKTREE = "/home/leo/.t3code-david/worktrees/eventoren/feature-veranstalter-dashboard"
const FRONT = "http://127.0.0.1:13557"
const BACK = "http://127.0.0.1:13470"
const STATE_ROOT = join(homedir(), ".local/state/eventoren/local-rehearsal")
const FIXTURE = join(STATE_ROOT, "staging/fixture-tokens.json")
const ARTIFACT_ROOT = "/tmp/eventoren-dashboard-continuation/e2e-contract-content"
const TIMEOUT = 30_000
const TERMS_LABEL = "Ich stimme den oben verlinkten Muster-Veranstalter-AGB"
const DPA_LABEL = "Ich stimme der oben verlinkten Muster-AVV"
const IBAN_A = "DE89370400440532013000"
const IBAN_B = "DE02120300000000202051"
const phases = ["guards", "setup", "ui", "verify", "all", "selftest"] as const
const notes = [
  "Synthetic local consent only, no legal representation; documents opened/rendered, not proof of human reading.",
  "Internal immutable consent-table evidence is NOT COVERED: no authorized public evidence-read operation exists.",
  "Organization switch uses the actual switch link and selection cards; this shell has no organization dropdown.",
  "No theme UI discovered in the organizer shell; screenshots record actual application data-theme only.",
  "Fixture auth replaces SSO. No purchase, payment, email, invitations, external images, or provider calls are exercised.",
  "Browser hostname containment is not an OS firewall; parent must preserve the isolated local prod-copy environment.",
]
const syntheticSchema = v.object({
  name: v.string(),
  slug: v.string(),
  email: v.string(),
  phone: v.string(),
  imprint: v.string(),
  iban: v.string(),
  holder: v.string(),
})
type Synthetic = v.InferOutput<typeof syntheticSchema>
const organizationSchema = v.object({
  orgId: v.string(),
  profile: v.object({
    name: v.string(),
    slug: v.string(),
    kind: v.string(),
    contact: v.optional(v.object({ email: v.optional(v.string()), phone: v.optional(v.string()) })),
    imprint: v.optional(v.string()),
  }),
  bank: v.nullable(v.object({ iban: v.string(), holder: v.string() })),
  contracts: v.object({
    current: v.boolean(),
    termsRevision: v.optional(v.string()),
    dpaRevision: v.optional(v.string()),
    termsConsentedAt: v.optional(v.string()),
    dpaConsentedAt: v.optional(v.string()),
  }),
})
type Organization = v.InferOutput<typeof organizationSchema>
const contentSchema = v.object({ faqs: catalogEventFaqsSchema, schedule: catalogEventScheduleSchema })
type Content = v.InferOutput<typeof contentSchema>
const eventSchema = v.object({
  eventKey: v.string(),
  status: v.string(),
  title: v.string(),
  faqs: v.optional(catalogEventFaqsSchema),
  schedule: v.optional(catalogEventScheduleSchema),
})
const runSchema = v.object({
  version: v.literal(1),
  tag: v.string(),
  stamp: v.string(),
  customerId: v.string(),
  baselineIds: v.array(v.string()),
  uiStarted: v.boolean(),
  uiComplete: v.boolean(),
  a: syntheticSchema,
  b: syntheticSchema,
  orgA: v.optional(v.string()),
  orgB: v.optional(v.string()),
  originalA: v.optional(organizationSchema),
  expectedB: v.optional(syntheticSchema),
  eventKey: v.optional(v.string()),
  expectedContent: v.optional(contentSchema),
})
type RunState = v.InferOutput<typeof runSchema>
type Step = { name: string; ok: boolean; detail: string }
type Context = {
  tag: string
  phase: string
  dir: string
  session: string
  secrets: string[]
  steps: Step[]
  artifacts: string[]
  browserStarted: boolean
}

function assert(ok: unknown, message: string): asserts ok {
  // Assertion failures stop an acceptance test; I/O exceptions are caught at the run boundary.
  if (!ok) throw new Error(message)
}
function redact(ctx: Context, text: string): string {
  let result = text
  for (const secret of ctx.secrets) result = result.split(secret).join("[REDACTED]")
  return result
    .replaceAll(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "[REDACTED-JWT]")
    .replaceAll(/(Bearer\s+)[^\s"']+/gi, "$1[REDACTED]")
    .replaceAll(/eventoren-session=[^;\s"']+/g, "eventoren-session=[REDACTED]")
}
function step(ctx: Context, name: string, detail: string): void {
  const clean = redact(ctx, detail)
  ctx.steps.push({ name, ok: true, detail: clean })
  console.log(`PASS ${name}: ${clean}`)
}
function urlCheck(raw: string, origin: string): void {
  const url = new URL(raw)
  assert(
    url.origin === origin && url.hostname === "127.0.0.1" && url.protocol === "http:",
    "Literal loopback origin refused",
  )
  assert(!url.username && !url.password, "URL credentials refused")
}
function environmentCheck(env: NodeJS.ProcessEnv): void {
  for (const key of ["EVENTOREN_E2E_TARGET", "E2E_TARGET", "NODE_ENV", "MODE", "PUBLIC_ENV_MODE"]) {
    assert(!/prod/i.test(env[key] ?? ""), `Production environment refused (${key})`)
  }
  const exact: Record<string, string> = {
    E2E_FRONT_BASE: FRONT,
    E2E_BACKEND_BASE: BACK,
    CONVEX_SELF_HOSTED_URL: BACK,
    PUBLIC_BASE_URL_CONVEX: BACK,
    VITE_CONVEX_URL: BACK,
    CONVEX_URL: BACK,
    PUBLIC_BASE_URL_APP: FRONT,
    LOCAL_REHEARSAL_STATE_ROOT: STATE_ROOT,
    LOCAL_REHEARSAL_CONVEX_PORT: "13470",
    LOCAL_REHEARSAL_API_PORT: "13471",
  }
  for (const [key, expected] of Object.entries(exact)) {
    assert(env[key] === undefined || env[key] === expected, `Target override refused (${key})`)
  }
  for (const key of Object.keys(env)) {
    if (/^(CONVEX_DEPLOYMENT|CONVEX_DEPLOY_KEY|CONVEX_SELF_HOSTED_ADMIN_KEY)$/.test(key)) {
      assert(!env[key], `Deployment/admin credentials refused (${key})`)
    }
    if (/^(AGENT_BROWSER_|HTTP_PROXY$|HTTPS_PROXY$|ALL_PROXY$|http_proxy$|https_proxy$|all_proxy$)/.test(key)) {
      assert(!env[key], `Inherited browser/proxy configuration refused (${key})`)
    }
  }
}
function childEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const key of ["PATH", "HOME", "USER", "LOGNAME", "XDG_RUNTIME_DIR", "DBUS_SESSION_BUS_ADDRESS", "LANG"]) {
    if (process.env[key]) env[key] = process.env[key]
  }
  env.LOCAL_REHEARSAL_STATE_ROOT = STATE_ROOT
  env.LOCAL_REHEARSAL_CONVEX_PORT = "13470"
  env.LOCAL_REHEARSAL_API_PORT = "13471"
  return env
}
function privateMetadataCheck(
  mode: number,
  owner: number,
  currentOwner: number,
  regular: boolean,
  symlink: boolean,
): void {
  assert(regular && !symlink, "Private regular file required")
  assert((mode & 0o7777) === 0o600, "Private file must have exact mode 0600")
  assert(owner === currentOwner, "Private file owner mismatch")
}
function privateFileCheck(path: string): void {
  const stat = lstatSync(path)
  privateMetadataCheck(stat.mode, stat.uid, process.getuid?.() ?? -1, stat.isFile(), stat.isSymbolicLink())
  assert(realpathSync(path) === path, "Private path symlink traversal refused")
}
function privateDirectoryEnsure(path: string): void {
  // Walk from /tmp: reject symlink components before mkdir/chmod/write.
  assert(path === "/tmp" || path.startsWith("/tmp/eventoren-dashboard-continuation"), "Artifact root refused")
  if (path === "/tmp") return
  privateDirectoryEnsure(dirname(path))
  if (!existsSync(path)) mkdirSync(path, { mode: 0o700 })
  const stat = lstatSync(path)
  assert(stat.isDirectory() && !stat.isSymbolicLink() && stat.uid === process.getuid?.(), "Artifact directory refused")
  assert((stat.mode & 0o7777) === 0o700, "Existing artifact directory must be mode 0700")
}
function privateWrite(ctx: Context, name: string, body: string): void {
  assert(/^[a-z0-9.-]+$/.test(name), "Artifact filename refused")
  const path = join(ctx.dir, name)
  if (existsSync(path)) privateFileCheck(path)
  writeFileSync(path, redact(ctx, body), { mode: 0o600, flag: existsSync(path) ? "w" : "wx" })
  chmodSync(path, 0o600)
}
function stateSave(ctx: Context, state: RunState): void {
  privateWrite(ctx, "run.json", JSON.stringify(state, null, 2))
}
function stateRead(ctx: Context): RunState {
  const path = join(ctx.dir, "run.json")
  privateFileCheck(path)
  const state = v.parse(runSchema, JSON.parse(readFileSync(path, "utf8")))
  assert(state.tag === ctx.tag, "Run tag mismatch")
  return state
}
function fixtureRead(ctx: Context) {
  privateFileCheck(FIXTURE)
  const schema = v.object({ sessions: v.array(v.object({ role: v.string(), token: v.string(), userId: v.string() })) })
  const fixture = v.parse(schema, JSON.parse(readFileSync(FIXTURE, "utf8")))
  // Redact ALL fixture sessions, not just the roles used by this driver.
  ctx.secrets = fixture.sessions.flatMap((s) => [s.token, encodeURIComponent(s.token)]).filter(Boolean)
  const pick = (role: string) => {
    const matches = fixture.sessions.filter((s) => s.role === role)
    const entry = matches[0]
    assert(matches.length === 1 && entry && entry.token.length >= 16, `Unique valid ${role} fixture required`)
    return entry
  }
  return { customer: pick("customer"), admin: pick("admin") }
}
function dataParse<T>(schema: v.GenericSchema<unknown, T>, raw: unknown): T {
  const envelope = v.parse(v.object({ success: v.boolean(), data: v.optional(v.unknown()) }), raw)
  // Do not serialize backend errors/raw responses (they may include credentials or copied PII).
  assert(envelope.success, "Authorized backend operation refused; check local deployment/revisions/auth")
  return v.parse(schema, envelope.data)
}
function clientCreate(): ConvexHttpClient {
  const restrictedFetch = Object.assign(
    (input: RequestInfo | URL, init?: RequestInit) => {
      urlCheck(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, BACK)
      return fetch(input, { ...init, redirect: "error", signal: AbortSignal.timeout(TIMEOUT) })
    },
    { preconnect: fetch.preconnect },
  )
  return new ConvexHttpClient(BACK, { logger: false, fetch: restrictedFetch })
}
async function contextRead(client: ConvexHttpClient, token: string) {
  return dataParse(
    v.object({ organizations: v.array(v.object({ id: v.string(), slug: v.string(), name: v.string() })) }),
    await client.query(api.organizerDashboard.organizerDashboardContextQuery, { token }),
  ).organizations
}
async function organizationRead(client: ConvexHttpClient, token: string, orgId: string): Promise<Organization> {
  return dataParse(
    organizationSchema,
    await client.query(api.organizerDashboardProfile.organizerDashboardOrganizationGetQuery, {
      token,
      orgId: orgId as Id<"orgs">,
    }),
  )
}
async function eventRead(client: ConvexHttpClient, token: string, state: RunState) {
  assert(state.orgA && state.eventKey, "Synthetic event state missing")
  return dataParse(
    eventSchema,
    await client.query(api.organizerDashboardEvents.organizerDashboardEventGetQuery, {
      token,
      orgId: state.orgA as Id<"orgs">,
      eventKey: state.eventKey,
    }),
  )
}
function contentRead(event: v.InferOutput<typeof eventSchema>): Content {
  return { faqs: event.faqs ?? [], schedule: event.schedule ?? [] }
}
function contractsCheck(org: Organization): void {
  assert(org.contracts.current === true, "Backend has not accepted the CURRENT contracts (old deployment refused)")
  assert(
    org.contracts.termsRevision === organizerContractDocuments.terms.revision,
    "Exact current AGB revision mismatch",
  )
  assert(org.contracts.dpaRevision === organizerContractDocuments.dpa.revision, "Exact current AVV revision mismatch")
  for (const instant of [org.contracts.termsConsentedAt, org.contracts.dpaConsentedAt]) {
    assert(
      instant && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(instant) && Number.isFinite(Date.parse(instant)),
      "UTC consent instant missing",
    )
  }
}
function organizationCheck(org: Organization, fixture: Synthetic): void {
  assert(
    org.profile.name === fixture.name && org.profile.slug === fixture.slug && org.profile.kind === "unternehmen",
    "Profile identity mismatch",
  )
  assert(
    org.profile.contact?.email === fixture.email && org.profile.contact?.phone === fixture.phone,
    "Contact mismatch",
  )
  assert(
    org.profile.imprint === fixture.imprint && org.bank?.iban === fixture.iban && org.bank.holder === fixture.holder,
    "Imprint/bank mismatch",
  )
  contractsCheck(org)
}
async function guards(ctx: Context): Promise<void> {
  environmentCheck(process.env)
  assert(realpathSync(process.cwd()) === WORKTREE, "Run only in the designated worktree")
  urlCheck(FRONT, FRONT)
  urlCheck(BACK, BACK)
  const verify = spawnSync("bash", ["ops/convex/local-rehearsal/bootstrap.bash", "verify"], {
    cwd: WORKTREE,
    env: childEnvironment(),
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 256 * 1024,
  })
  // Never persist verify stdout/stderr: cli.env/auth errors can contain secrets.
  assert(verify.status === 0 && !verify.error, "bootstrap verify failed; output intentionally withheld")
  for (const marker of [
    "egress=internal-network",
    "binds=127.0.0.1-only",
    "image=pinned-digest",
    "identity=eventoren-local-rehearsal",
    "verify=ok",
  ]) {
    assert(verify.stdout.includes(marker), "bootstrap verify missing required isolation/identity proof")
  }
  step(
    ctx,
    "guards.isolation",
    "Bootstrap verified live identity, sole internal network, pinned image, loopback binds and side-effect credential absence",
  )
  for (const origin of [FRONT, BACK]) {
    const response = await fetch(origin, { redirect: "error", signal: AbortSignal.timeout(10_000) })
    assert(origin !== FRONT || response.ok, "Local frontend not reachable")
    await response.body?.cancel()
  }
  privateFileCheck(FIXTURE) // permissions only, no token load for guards
  step(
    ctx,
    "guards.targets",
    "Literal frontend :13557/backend :13470 only; fixture path regular, owner-matched, exact 0600",
  )
}
function syntheticCreate(tag: string, stamp: string, letter: "a" | "b"): Synthetic {
  const slug = `cc${letter}-${tag}-${stamp}`
  return {
    name: `E2E Synthetic ${letter.toUpperCase()} ${tag} ${stamp}`,
    slug,
    email: `${slug}@example.invalid`,
    phone: letter === "a" ? "+49 30 000001" : "+49 30 000002",
    imprint: `Synthetic local ${letter.toUpperCase()}, Beispielweg ${letter === "a" ? 1 : 2}, 10115 Berlin.`,
    iban: letter === "a" ? IBAN_A : IBAN_B,
    holder: `Synthetic ${letter.toUpperCase()} ${tag}`,
  }
}
async function setup(ctx: Context): Promise<void> {
  assert(!existsSync(join(ctx.dir, "run.json")), "Tag already initialized; use a new unique loweralnum tag")
  const fixture = fixtureRead(ctx)
  const baseline = await contextRead(clientCreate(), fixture.customer.token)
  const stamp = Date.now().toString(36)
  const state: RunState = {
    version: 1,
    tag: ctx.tag,
    stamp,
    customerId: fixture.customer.userId,
    baselineIds: baseline.map((o) => o.id),
    uiStarted: false,
    uiComplete: false,
    a: syntheticCreate(ctx.tag, stamp, "a"),
    b: syntheticCreate(ctx.tag, stamp, "b"),
  }
  stateSave(ctx, state)
  step(
    ctx,
    "setup.auth-and-baseline",
    "Authorized local fixture context checked; private unique synthetic A/B planned; no organizations created by setup",
  )
}

// Only eval --stdin transports secrets. CLI argv/env/logs never carry tokens.
// Output is bounded and never persisted wholesale; no HAR, network, cookie,
// console, or response-body dumps. A fresh named session is closed in finally.
function browser(ctx: Context, args: string[], input?: string): string {
  const result = spawnSync(
    "agent-browser",
    ["--session", ctx.session, "--allowed-domains", "127.0.0.1", "--json", ...args],
    {
      cwd: WORKTREE,
      env: childEnvironment(),
      encoding: "utf8",
      input,
      timeout: TIMEOUT + 15_000,
      maxBuffer: 1024 * 1024,
    },
  )
  assert(result.status === 0 && !result.error, `Browser command failed (${args[0] ?? "unknown"}); output withheld`)
  const envelope = v.parse(v.object({ success: v.boolean(), data: v.optional(v.unknown()) }), JSON.parse(result.stdout))
  assert(envelope.success, `Browser command refused (${args[0] ?? "unknown"}); output withheld`)
  return JSON.stringify(envelope.data ?? null)
}
function evaluate(ctx: Context, source: string): unknown {
  const raw: unknown = JSON.parse(browser(ctx, ["eval", "--stdin"], source))
  if (raw && typeof raw === "object" && "result" in raw) return raw.result
  return raw
}
function condition(ctx: Context, expression: string): void {
  browser(ctx, ["wait", "--fn", expression])
}
function open(ctx: Context, url: string): void {
  urlCheck(url, FRONT)
  browser(ctx, ["open", url])
  condition(ctx, `location.origin === ${JSON.stringify(FRONT)}`)
}
function roleClick(ctx: Context, role: string, name: string): void {
  browser(ctx, ["find", "role", role, "click", "--name", name, "--exact"])
}
function labelFill(ctx: Context, label: string, value: string): void {
  browser(ctx, ["find", "label", label, "fill", value, "--exact"])
}
function fill(ctx: Context, selector: string, value: string): void {
  browser(ctx, ["fill", selector, value])
}
function fieldsWait(ctx: Context, values: Record<string, string>): void {
  condition(
    ctx,
    `Object.entries(${JSON.stringify(values)}).every(([id,value]) => document.getElementById(id)?.value === value)`,
  )
}
function screenshots(ctx: Context, name: string): void {
  for (const [kind, width, height] of [
    ["desktop", 1440, 900],
    ["mobile", 390, 844],
  ] as const) {
    browser(ctx, ["set", "viewport", String(width), String(height)])
    const filename = `${name}-${kind}.png`
    const path = join(ctx.dir, filename)
    assert(!existsSync(path), "Screenshot overwrite refused")
    browser(ctx, ["screenshot", path])
    chmodSync(path, 0o600)
    privateFileCheck(path)
    ctx.artifacts.push(filename)
  }
  browser(ctx, ["set", "viewport", "1440", "900"])
  const theme = evaluate(
    ctx,
    "({theme: document.documentElement.dataset.theme ?? null, darkClass: document.documentElement.classList.contains('dark')})",
  )
  privateWrite(ctx, `${name}-theme.json`, JSON.stringify(theme))
  step(
    ctx,
    `ui.screenshots.${name}`,
    "Desktop 1440x900 + mobile 390x844; actual application theme recorded (no media-preference claim)",
  )
}
function browserFenceScript(): string {
  // A defense-in-depth exact-port fence, installed before application scripts.
  // Does not mock responses or mutate app state. The CLI hostname allowlist
  // additionally contains resources/workers/WebRTC; parent retains OS isolation.
  return `(() => {
    const allowed = new Set(${JSON.stringify([FRONT, BACK, FRONT.replace("http:", "ws:"), BACK.replace("http:", "ws:")])});
    const evidence = { blocked: [], websocketOrigins: [] };
    Object.defineProperty(window, '__ccLocalFence', { value: evidence });
    const check = raw => {
      const url = new URL(typeof raw === 'string' || raw instanceof URL ? raw : raw.url, location.href);
      if (!allowed.has(url.origin)) {
        evidence.blocked.push(url.origin);
        throw new Error('Non-rehearsal origin blocked');
      }
      return url;
    };
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => { check(input); return nativeFetch(input, {...init, redirect:'error'}); };
    const nativeOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) { check(url); return nativeOpen.call(this, method, url, ...rest); };
    for (const key of ['WebSocket', 'EventSource']) {
      const Native = window[key];
      window[key] = new Proxy(Native, { construct(target, args) {
        const url = check(args[0]);
        if (key === 'WebSocket') evidence.websocketOrigins.push(url.origin);
        return Reflect.construct(target, args);
      }});
    }
    const nativeBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, data) => { check(url); return nativeBeacon(url, data); };
  })()`
}
async function sessionBootstrap(ctx: Context, token: string, userId: string): Promise<void> {
  privateWrite(ctx, "loopback-fence.js", browserFenceScript())
  ctx.browserStarted = true
  browser(ctx, ["--init-script", join(ctx.dir, "loopback-fence.js"), "open", `${FRONT}/veranstalter/onboarding`])
  condition(ctx, `location.origin === ${JSON.stringify(FRONT)} && !!window.__ccLocalFence`)
  const probe = `fetch('/api/session', {credentials:'same-origin',cache:'no-store',redirect:'error'}).then(async r => { const b=await r.json(); return {status:r.status,userId:b.session?.profile?.userId ?? null}; })`
  const anonymous = v.parse(v.object({ status: v.number(), userId: v.nullable(v.string()) }), evaluate(ctx, probe))
  assert(anonymous.status === 200 && anonymous.userId === null, "Fresh isolated browser session must be anonymous")
  const cookieSet = evaluate(
    ctx,
    `(() => { document.cookie = ${JSON.stringify(`eventoren-session=${encodeURIComponent(token)}; Path=/; SameSite=Lax`)}; return true; })()`,
  )
  assert(cookieSet === true, "Fixture session cookie setup failed")
  open(ctx, `${FRONT}/veranstalter/onboarding`)
  const authenticated = v.parse(v.object({ status: v.number(), userId: v.nullable(v.string()) }), evaluate(ctx, probe))
  assert(
    authenticated.status === 200 && authenticated.userId === userId,
    "Authenticated browser identity differs from fixture",
  )
  condition(
    ctx,
    `window.__ccLocalFence?.blocked.length === 0 && window.__ccLocalFence.websocketOrigins.includes(${JSON.stringify(BACK.replace("http:", "ws:"))})`,
  )
  step(
    ctx,
    "guards.browser-backend",
    "Pre-navigation exact-port fetch/XHR/WebSocket/EventSource/beacon fence active; real frontend connected to backend :13470",
  )
  step(
    ctx,
    "ui.auth-bootstrap",
    "Anonymous session then exact fixture user observed through same-origin /api/session; token transported over stdin only",
  )
}
function documentOpen(ctx: Context, kind: "terms" | "dpa"): void {
  const doc = organizerContractDocuments[kind]
  const selector = `a[href='/veranstalter-vertraege#${doc.documentId}']`
  condition(ctx, `document.querySelectorAll(${JSON.stringify(selector)}).length === 1`)
  // Actual link click opens target=_blank. Discover the new tab by its exact
  // local URL rather than assuming the CLI automatically focuses new tabs.
  const tabsSchema = v.object({ tabs: v.array(v.object({ tabId: v.string(), url: v.string() })) })
  const before = v.parse(tabsSchema, JSON.parse(browser(ctx, ["tab", "list"])))
  browser(ctx, ["click", selector])
  let tab: { tabId: string; url: string } | undefined
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const after = v.parse(tabsSchema, JSON.parse(browser(ctx, ["tab", "list"])))
    const added = after.tabs.filter((candidate) => !before.tabs.some((old) => old.tabId === candidate.tabId))
    assert(added.length <= 1, "Document link opened multiple tabs")
    const candidate = added[0]
    if (candidate?.url === `${FRONT}/veranstalter-vertraege#${doc.documentId}`) {
      tab = candidate
      break
    }
  }
  assert(tab, "Contract link did not open exactly one tab at the current document URL")
  browser(ctx, ["tab", tab.tabId])
  condition(
    ctx,
    `location.origin === ${JSON.stringify(FRONT)} && document.getElementById(${JSON.stringify(doc.documentId)}) !== null`,
  )
  // Verify exact revision and every frozen heading/body rendered, not reading.
  const rendered = evaluate(
    ctx,
    `(() => { const a=document.getElementById(${JSON.stringify(doc.documentId)}); return !!a && ${JSON.stringify([doc.revision, doc.title, ...doc.sections.flat()])}.every(t => a.innerText.includes(t)); })()`,
  )
  assert(rendered === true, "Current contract article did not render exact complete text")
  browser(ctx, ["tab", "close", tab.tabId])
  condition(ctx, "!!document.getElementById('onboarding-name')")
  step(
    ctx,
    `ui.contract.${kind}.opened-rendered`,
    "Actual onboarding link opened current full article/revision before any consent flag; no human-reading claim",
  )
}
function consentGate(ctx: Context, terms: boolean, dpa: boolean, submittable: boolean): void {
  condition(
    ctx,
    `(() => { const c=[...document.querySelectorAll('form [role=checkbox]')]; const b=document.querySelector('form button[type=submit]'); return c.length===2 && c[0].getAttribute('aria-checked')===${JSON.stringify(String(terms))} && c[1].getAttribute('aria-checked')===${JSON.stringify(String(dpa))} && !!b && b.disabled===${!submittable}; })()`,
  )
}
function consentClick(ctx: Context, text: string): void {
  browser(ctx, ["find", "text", text, "click"])
}
async function onboarding(
  ctx: Context,
  state: RunState,
  client: ConvexHttpClient,
  token: string,
  letter: "a" | "b",
): Promise<string> {
  const org = state[letter]
  if (letter === "b") {
    roleClick(ctx, "link", "Organisation erstellen")
  }
  browser(ctx, ["wait", "--text", "Organisation gründen"])
  fieldsWait(ctx, { "onboarding-name": "", "onboarding-slug": "" })
  for (const [id, value] of Object.entries({
    name: org.name,
    slug: org.slug,
    email: org.email,
    phone: org.phone,
    imprint: org.imprint,
    iban: org.iban,
    holder: org.holder,
  }))
    fill(ctx, `#onboarding-${id}`, value)
  browser(ctx, ["select", "#onboarding-kind", "unternehmen"])
  consentGate(ctx, false, false, false)
  documentOpen(ctx, "terms")
  documentOpen(ctx, "dpa")
  consentGate(ctx, false, false, false)
  consentClick(ctx, TERMS_LABEL)
  consentGate(ctx, true, false, false)
  consentClick(ctx, TERMS_LABEL)
  consentClick(ctx, DPA_LABEL)
  consentGate(ctx, false, true, false)
  consentClick(ctx, TERMS_LABEL)
  consentGate(ctx, true, true, true)
  step(
    ctx,
    `ui.onboarding.${letter}.consent-gates`,
    "Valid full form blocked with neither/AGB-only/AVV-only flags; enabled only with both explicit flags",
  )
  if (letter === "a") screenshots(ctx, "onboarding")
  roleClick(ctx, "button", "Organisation einreichen")
  browser(ctx, ["wait", "--text", "Zum Dashboard"])
  const orgs = await contextRead(client, token)
  const found = orgs.filter((o) => o.slug === org.slug && o.name === org.name)
  assert(found.length === 1 && found[0], "UI-created synthetic organization missing/duplicated")
  const id = found[0].id
  assert(!state.baselineIds.includes(id), "Refusing baseline/non-synthetic organization")
  const detail = await organizationRead(client, token, id)
  organizationCheck(detail, org)
  step(
    ctx,
    `ui.onboarding.${letter}.created-current-revisions`,
    "Real onboarding created unique synthetic org; authorized get proves exact current revisions, UTC instants, profile/bank",
  )
  roleClick(ctx, "link", "Zum Dashboard")
  condition(ctx, `new URL(location.href).searchParams.get('org') === ${JSON.stringify(id)}`)
  return id
}
function settingsFields(org: Synthetic): Record<string, string> {
  return {
    "settings-name": org.name,
    "settings-email": org.email,
    "settings-phone": org.phone,
    "settings-imprint": org.imprint,
    "settings-iban": org.iban,
    "settings-holder": org.holder,
  }
}
async function settings(ctx: Context, state: RunState, client: ConvexHttpClient, token: string): Promise<void> {
  assert(state.orgA && state.orgB, "Both synthetic orgs required")
  open(ctx, `${FRONT}/veranstalter/einstellungen?org=${encodeURIComponent(state.orgA)}`)
  fieldsWait(ctx, settingsFields(state.a))
  state.originalA = await organizationRead(client, token, state.orgA)
  stateSave(ctx, state)
  // Deliberately leave A's unsaved values dirty before the actual scope switch.
  fill(ctx, "#settings-name", `${state.a.name} UNSAVED`)
  fill(ctx, "#settings-holder", `${state.a.holder} UNSAVED`)
  roleClick(ctx, "link", "Organisation wechseln")
  browser(ctx, ["wait", "--text", "Organisation wählen"])
  roleClick(ctx, "link", `${state.b.name} auswählen`)
  condition(ctx, `new URL(location.href).searchParams.get('org') === ${JSON.stringify(state.orgB)}`)
  roleClick(ctx, "link", "Einstellungen")
  fieldsWait(ctx, settingsFields(state.b))
  step(
    ctx,
    "ui.settings.switch-a-to-b",
    "Actual organization switch selection and Settings navigation show B profile/bank, not dirty A; no B URL injected",
  )
  const edited: Synthetic = {
    ...state.b,
    name: `${state.b.name} Edited`,
    email: `edited-${state.b.email}`,
    phone: "+49 30 000003",
    imprint: `${state.b.imprint} Edited.`,
    iban: IBAN_A,
    holder: `${state.b.holder} Edited`,
  }
  for (const [id, value] of Object.entries(settingsFields(edited))) fill(ctx, `#${id}`, value)
  roleClick(ctx, "button", "Speichern")
  browser(ctx, ["wait", "--text", "Gespeichert."])
  organizationCheck(await organizationRead(client, token, state.orgB), edited)
  const afterA = await organizationRead(client, token, state.orgA)
  assert(JSON.stringify(afterA) === JSON.stringify(state.originalA), "Saving B changed A (including contract metadata)")
  state.expectedB = edited
  stateSave(ctx, state)
  browser(ctx, ["reload"])
  fieldsWait(ctx, settingsFields(edited))
  screenshots(ctx, "settings-b")
  step(
    ctx,
    "ui.settings.save-b-isolated",
    "B saved and survived reload; authorized full A projection identical to pre-switch baseline",
  )
}
async function eventSetup(
  ctx: Context,
  state: RunState,
  client: ConvexHttpClient,
  customer: string,
  admin: string,
): Promise<void> {
  assert(state.orgA && !state.baselineIds.includes(state.orgA), "Only newly UI-created synthetic A can be configured")
  organizationCheck(await organizationRead(client, customer, state.orgA), state.a)
  const orgId = state.orgA as Id<"orgs">
  dataParse(
    v.unknown(),
    await client.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
      token: admin,
      orgId,
      fee: { percentBps: 350, fixedCents: 49, payer: "kaeufer" },
      tax: { status: "regel", defaultRateBps: 700 },
    }),
  )
  dataParse(
    v.unknown(),
    await client.mutation(api.organizerDashboardAdmin.organizerDashboardAdminApproveMutation, { token: admin, orgId }),
  )
  step(
    ctx,
    "setup.event-org-configure-approve",
    "API SETUP ONLY (not browser coverage): configure/approve the newly UI-consented synthetic A",
  )
  const created = dataParse(
    v.object({ eventKey: v.string() }),
    await client.mutation(api.organizerDashboardEvents.organizerDashboardEventCreateMutation, {
      token: customer,
      orgId,
      title: `E2E Synthetic Content ${state.tag} ${state.stamp}`,
      subtitle: "",
      description: "Synthetic local content acceptance. No real tickets.",
      category: "Konzert",
      // Berlin 01 June 2027: 19:30 doors, 20:00 start, 22:00 end, stored UTC.
      startsAt: "2027-06-01T18:00:00.000Z",
      endsAt: "2027-06-01T20:00:00.000Z",
      doorsAt: "2027-06-01T17:30:00.000Z",
      venue: "Synthetic Halle",
      city: "Berlin",
      address: "Beispielweg 1",
      organizer: state.a.name,
      imageUrl: `${FRONT}/logo.svg`,
      imageAlt: "Synthetic local project logo",
      faqs: [],
      schedule: [],
    }),
  )
  state.eventKey = created.eventKey
  stateSave(ctx, state)
  dataParse(
    v.unknown(),
    await client.mutation(api.organizerDashboardEvents.organizerDashboardTierUpsertMutation, {
      token: customer,
      orgId,
      eventKey: created.eventKey,
      name: "Synthetic Standard",
      description: "Local only",
      priceCents: 1000,
      capacity: 10,
    }),
  )
  step(
    ctx,
    "setup.event-draft-and-tier",
    "API SETUP ONLY: synthetic empty draft plus one tier; no content edit or publish substituted by API",
  )
}
function eventUrl(state: RunState): string {
  assert(state.eventKey && state.orgA, "Event URL state missing")
  return `${FRONT}/veranstalter/events/${encodeURIComponent(state.eventKey)}?org=${encodeURIComponent(state.orgA)}`
}
function contentFieldsCheck(ctx: Context, expected: Content): void {
  const probe = evaluate(
    ctx,
    `(() => { const f=[...document.querySelectorAll('fieldset')]; const faq=f.find(x=>x.querySelector('legend')?.textContent==='FAQ'); const sch=f.find(x=>x.querySelector('legend')?.textContent==='Ablauf (Europe/Berlin)'); if(!faq||!sch)return null; return {faq:[...faq.querySelectorAll('input')].map(x=>x.value),answers:[...faq.querySelectorAll('textarea')].map(x=>x.value),schedule:[...sch.querySelectorAll('input')].map(x=>x.value),details:[...sch.querySelectorAll('textarea')].map(x=>x.value)}; })()`,
  )
  const parsed = v.parse(
    v.object({
      faq: v.array(v.string()),
      answers: v.array(v.string()),
      schedule: v.array(v.string()),
      details: v.array(v.string()),
    }),
    probe,
  )
  assert(
    JSON.stringify(parsed) ===
      JSON.stringify({
        faq: expected.faqs.map((r) => r.question),
        answers: expected.faqs.map((r) => r.answer),
        schedule: expected.schedule.flatMap((r) => [r.time, r.title]),
        details: expected.schedule.map((r) => r.detail ?? ""),
      }),
    "Reloaded real FAQ/schedule fields differ from authorized backend detail",
  )
}
async function contentSaveReload(
  ctx: Context,
  state: RunState,
  client: ConvexHttpClient,
  token: string,
  check: (content: Content) => boolean,
  name: string,
): Promise<Content> {
  roleClick(ctx, "button", "Änderungen speichern")
  // No success toast exists here. Poll authorized detail for the exact expected
  // change before navigation; otherwise reloading could discard an in-flight edit.
  let observed: Content | undefined
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const content = contentRead(await eventRead(client, token, state))
    if (check(content)) {
      observed = content
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  assert(observed, `Content save did not reach backend (${name})`)
  browser(ctx, ["reload"])
  browser(ctx, ["wait", "--text", "Grunddaten (nur Entwurf)"])
  condition(ctx, "!!document.querySelector('fieldset legend') && !!document.querySelector('form button[type=submit]')")
  contentFieldsCheck(ctx, observed)
  assert(
    JSON.stringify(contentRead(await eventRead(client, token, state))) === JSON.stringify(observed),
    "Reload changed persisted content/IDs",
  )
  step(
    ctx,
    `ui.content.${name}`,
    "Actual forms saved; authorized detail matches values/IDs; full reload matches persisted FAQ/schedule controls",
  )
  return observed
}
function contentAdd(ctx: Context, suffix: string): void {
  roleClick(ctx, "button", "Frage hinzufügen")
  labelFill(ctx, "Frage 1", `Synthetic FAQ ${suffix}?`)
  labelFill(ctx, "Antwort", `Synthetic answer ${suffix}.`)
  roleClick(ctx, "button", "Programmpunkt hinzufügen")
  labelFill(ctx, "Uhrzeit 1 (Europe/Berlin, HH:mm)", "19:30")
  labelFill(ctx, "Programmpunkt", `Synthetic doors ${suffix}`)
  labelFill(ctx, "Details (optional)", `Synthetic schedule detail ${suffix}.`)
}
async function contentUi(ctx: Context, state: RunState, client: ConvexHttpClient, token: string): Promise<void> {
  open(ctx, eventUrl(state))
  browser(ctx, ["wait", "--text", "Grunddaten (nur Entwurf)"])
  contentFieldsCheck(ctx, { faqs: [], schedule: [] })
  contentAdd(ctx, ctx.tag)
  const first = await contentSaveReload(
    ctx,
    state,
    client,
    token,
    (c) =>
      c.faqs.length === 1 &&
      c.schedule.length === 1 &&
      c.faqs[0]?.question === `Synthetic FAQ ${ctx.tag}?` &&
      c.faqs[0]?.answer === `Synthetic answer ${ctx.tag}.` &&
      c.schedule[0]?.time === "19:30" &&
      c.schedule[0]?.title === `Synthetic doors ${ctx.tag}` &&
      c.schedule[0]?.detail === `Synthetic schedule detail ${ctx.tag}.`,
    "add-save-reload",
  )
  assert(first.faqs[0]?.id && first.schedule[0]?.id, "Persisted row IDs required")
  labelFill(ctx, "Frage 1", `Synthetic FAQ edited ${ctx.tag}?`)
  labelFill(ctx, "Antwort", `Synthetic answer edited ${ctx.tag}.`)
  labelFill(ctx, "Uhrzeit 1 (Europe/Berlin, HH:mm)", "19:45")
  labelFill(ctx, "Programmpunkt", `Synthetic doors edited ${ctx.tag}`)
  // Optional detail explicitly nonempty -> empty.
  labelFill(ctx, "Details (optional)", "")
  const edited = await contentSaveReload(
    ctx,
    state,
    client,
    token,
    (c) =>
      c.faqs.length === 1 &&
      c.schedule.length === 1 &&
      c.faqs[0]?.id === first.faqs[0]?.id &&
      c.schedule[0]?.id === first.schedule[0]?.id &&
      c.faqs[0]?.question === `Synthetic FAQ edited ${ctx.tag}?` &&
      c.faqs[0]?.answer === `Synthetic answer edited ${ctx.tag}.` &&
      c.schedule[0]?.time === "19:45" &&
      c.schedule[0]?.title === `Synthetic doors edited ${ctx.tag}` &&
      (c.schedule[0]?.detail ?? "") === "",
    "edit-same-ids-clear-detail",
  )
  screenshots(ctx, "content-edited")
  roleClick(ctx, "button", "Frage löschen")
  roleClick(ctx, "button", "Programmpunkt löschen")
  await contentSaveReload(
    ctx,
    state,
    client,
    token,
    (c) => c.faqs.length === 0 && c.schedule.length === 0,
    "delete-rows",
  )
  contentAdd(ctx, `${ctx.tag}clear`)
  await contentSaveReload(
    ctx,
    state,
    client,
    token,
    (c) =>
      c.faqs.length === 1 &&
      c.schedule.length === 1 &&
      c.faqs[0]?.question === `Synthetic FAQ ${ctx.tag}clear?` &&
      c.schedule[0]?.time === "19:30",
    "add-before-clear",
  )
  roleClick(ctx, "button", "Alle Fragen entfernen")
  roleClick(ctx, "button", "Ablauf leeren")
  await contentSaveReload(
    ctx,
    state,
    client,
    token,
    (c) => c.faqs.length === 0 && c.schedule.length === 0,
    "clear-arrays",
  )
  // Restore through actual forms before publishing (published content is read-only).
  contentAdd(ctx, `${ctx.tag}public`)
  const final = await contentSaveReload(
    ctx,
    state,
    client,
    token,
    (c) =>
      c.faqs.length === 1 &&
      c.schedule.length === 1 &&
      c.faqs[0]?.question === `Synthetic FAQ ${ctx.tag}public?` &&
      c.faqs[0]?.answer === `Synthetic answer ${ctx.tag}public.` &&
      c.schedule[0]?.time === "19:30" &&
      c.schedule[0]?.title === `Synthetic doors ${ctx.tag}public` &&
      c.schedule[0]?.detail === `Synthetic schedule detail ${ctx.tag}public.`,
    "restore-for-public",
  )
  assert(
    final.faqs[0]?.id !== edited.faqs[0]?.id && final.schedule[0]?.id !== edited.schedule[0]?.id,
    "Re-added rows must have new IDs",
  )
  state.expectedContent = final
  stateSave(ctx, state)
  roleClick(ctx, "button", "Veröffentlichen")
  browser(ctx, ["wait", "--text", "Öffentliche Ansicht"])
  assert((await eventRead(client, token, state)).status === "published", "Actual UI publish did not persist")
  roleClick(ctx, "link", "Öffentliche Ansicht")
  condition(ctx, `location.pathname === ${JSON.stringify(`/events/${state.eventKey}`)}`)
  const faq = final.faqs[0]
  const schedule = final.schedule[0]
  assert(faq && schedule, "Final content missing")
  browser(ctx, ["wait", "--text", faq.question])
  roleClick(ctx, "button", faq.question)
  condition(ctx, `document.querySelector('#event-faq-panel-0')?.innerText === ${JSON.stringify(faq.answer)}`)
  const expanded = evaluate(ctx, "document.getElementById('event-schedule-button')?.getAttribute('aria-expanded')")
  if (expanded !== "true") browser(ctx, ["click", "#event-schedule-button"])
  condition(
    ctx,
    `(() => { const s=document.getElementById('event-schedule-panel'); return !!s && ${JSON.stringify([schedule.time, schedule.title, schedule.detail ?? ""])}.every(t=>s.innerText.includes(t)); })()`,
  )
  screenshots(ctx, "public-content")
  step(
    ctx,
    "ui.content.public-render",
    "Actual publish and public-view link; expanded FAQ answer and HH:mm schedule title/detail visible; no buy click",
  )
}
async function ui(ctx: Context): Promise<void> {
  const state = stateRead(ctx)
  assert(!state.uiStarted, "UI phase is single-use; prior partial run cannot be silently reused")
  const fixture = fixtureRead(ctx)
  assert(fixture.customer.userId === state.customerId, "Fixture refreshed to a different user; create a new tag")
  const client = clientCreate()
  const now = await contextRead(client, fixture.customer.token)
  assert(
    JSON.stringify(now.map((o) => o.id).sort()) === JSON.stringify([...state.baselineIds].sort()),
    "Baseline organizations changed after setup; use a new tag",
  )
  state.uiStarted = true
  stateSave(ctx, state)
  await sessionBootstrap(ctx, fixture.customer.token, state.customerId)
  browser(ctx, ["set", "viewport", "1440", "900"])
  state.orgA = await onboarding(ctx, state, client, fixture.customer.token, "a")
  stateSave(ctx, state)
  state.orgB = await onboarding(ctx, state, client, fixture.customer.token, "b")
  stateSave(ctx, state)
  await settings(ctx, state, client, fixture.customer.token)
  await eventSetup(ctx, state, client, fixture.customer.token, fixture.admin.token)
  await contentUi(ctx, state, client, fixture.customer.token)
  condition(ctx, "window.__ccLocalFence?.blocked.length === 0")
  state.uiComplete = true
  stateSave(ctx, state)
}
async function verify(ctx: Context): Promise<void> {
  const state = stateRead(ctx)
  assert(
    state.uiComplete && state.orgA && state.orgB && state.originalA && state.expectedB && state.expectedContent,
    "Complete actual UI phase required before final verification",
  )
  const fixture = fixtureRead(ctx)
  assert(fixture.customer.userId === state.customerId, "Verification fixture user changed")
  const client = clientCreate()
  const a = await organizationRead(client, fixture.customer.token, state.orgA)
  const b = await organizationRead(client, fixture.customer.token, state.orgB)
  // Event setup changes administrative configuration, not this projection.
  assert(JSON.stringify(a) === JSON.stringify(state.originalA), "A profile/bank/contracts changed after saving B")
  organizationCheck(b, state.expectedB)
  contractsCheck(a)
  const event = await eventRead(client, fixture.customer.token, state)
  assert(
    event.status === "published" && JSON.stringify(contentRead(event)) === JSON.stringify(state.expectedContent),
    "Final published content or IDs differ from real UI roundtrip",
  )
  const orgs = await contextRead(client, fixture.customer.token)
  const newIds = orgs
    .filter((org) => !state.baselineIds.includes(org.id))
    .map((org) => org.id)
    .sort()
  assert(
    JSON.stringify(newIds) === JSON.stringify([state.orgA, state.orgB].sort()),
    "Expected exactly two new UI-created organizations relative to baseline",
  )
  step(
    ctx,
    "verify.contracts-settings-content",
    "Both exact current revisions; A unchanged by B edits; B saved; published FAQ/schedule values and IDs match actual UI; exactly two new synthetic organizations",
  )
}
function selftest(): void {
  const rejects = (work: () => void) => {
    let rejected = false
    try {
      work()
    } catch {
      rejected = true
    }
    assert(rejected, "Safety regression: forbidden input accepted")
  }
  urlCheck(FRONT, FRONT)
  for (const bad of [
    "https://127.0.0.1:13557",
    "http://localhost:13557",
    "http://127.0.0.1:3210",
    "https://eventoren.de",
    "http://user:pass@127.0.0.1:13557",
  ])
    rejects(() => urlCheck(bad, FRONT))
  environmentCheck({})
  for (const env of [
    { NODE_ENV: "production" },
    { EVENTOREN_E2E_TARGET: "PROD" },
    { E2E_FRONT_BASE: "https://eventoren.de" },
    { CONVEX_DEPLOYMENT: "prod:forbidden" },
    { LOCAL_REHEARSAL_STATE_ROOT: "/tmp/other" },
    { AGENT_BROWSER_PROVIDER: "cloud" },
    { HTTPS_PROXY: "http://proxy.invalid" },
  ])
    rejects(() => environmentCheck(env))
  new Bun.Transpiler({ loader: "js" }).transformSync(browserFenceScript())
  const ctx: Context = {
    tag: "selftest",
    phase: "selftest",
    dir: "",
    session: "",
    secrets: ["synthetic-secret-token"],
    steps: [],
    artifacts: [],
    browserStarted: false,
  }
  assert(!redact(ctx, "synthetic-secret-token").includes("synthetic-secret-token"), "Token redaction regression")
  // Test the actual metadata predicate without looking up/loading fixture files.
  privateMetadataCheck(0o100600, 1000, 1000, true, false)
  for (const mode of [0o400, 0o640, 0o644, 0o660, 0o700, 0o4600, 0o2600])
    rejects(() => privateMetadataCheck(mode, 1000, 1000, true, false))
  rejects(() => privateMetadataCheck(0o600, 1001, 1000, true, false))
  rejects(() => privateMetadataCheck(0o600, 1000, 1000, false, false))
  rejects(() => privateMetadataCheck(0o600, 1000, 1000, true, true))
  console.log(
    "PASS offline safety checks: literal origins, production/override/proxy refusal, token redaction, exact-0600/owner/regular/non-symlink metadata",
  )
}

/** The sole export; imports have no execution/network/token-reading side effects. */
export async function veranstalterContractsContentLocalE2e(): Promise<
  Result<{ phase: string; artifacts: string; steps: Step[] }>
> {
  const op = "veranstalterContractsContentLocalE2e"
  let ctx: Context | undefined
  try {
    const args = process.argv.slice(2)
    assert(args.length % 2 === 0, "Use only --tag <loweralnum> --phase <phase>")
    const options = new Map<string, string>()
    for (let index = 0; index < args.length; index += 2) {
      const key = args[index]
      const value = args[index + 1]
      assert(
        (key === "--tag" || key === "--phase") && value && !options.has(key),
        "Unknown/duplicate/missing CLI option",
      )
      options.set(key, value)
    }
    const phase = options.get("--phase") ?? "all"
    assert(
      phases.some((p) => p === phase),
      "Unknown phase; refusing no-op success",
    )
    if (phase === "selftest") {
      selftest()
      return createResult({ phase, artifacts: "none", steps: [] })
    }
    const tag = options.get("--tag") ?? ""
    assert(/^[a-z0-9]{4,20}$/.test(tag), "--tag must be synthetic lowercase alphanumeric (4..20 chars)")
    environmentCheck(process.env)
    assert(realpathSync(process.cwd()) === WORKTREE, "Run only in the designated worktree")
    const dir = join(ARTIFACT_ROOT, tag)
    privateDirectoryEnsure(dir)
    ctx = {
      tag,
      phase,
      dir,
      session: `cc-${tag}-${Date.now().toString(36)}`,
      secrets: [],
      steps: [],
      artifacts: [],
      browserStarted: false,
    }
    await guards(ctx)
    if (phase === "setup" || phase === "all") await setup(ctx)
    if (phase === "ui" || phase === "all") await ui(ctx)
    if (phase === "verify" || phase === "all") await verify(ctx)
    return createResult({ phase, artifacts: dir, steps: ctx.steps })
  } catch (error) {
    // Valibot errors/SDK errors are intentionally not serialized: may echo input.
    const message =
      error instanceof Error && error.name === "Error" ? error.message : "I/O/schema failure; raw output withheld"
    const safe = ctx ? redact(ctx, message).slice(0, 400) : message.slice(0, 400)
    ctx?.steps.push({ name: "run.blocked", ok: false, detail: safe })
    return createResultError(op, safe)
  } finally {
    if (ctx) {
      if (ctx.browserStarted) {
        try {
          browser(ctx, ["close"])
        } catch {
          ctx.steps.push({
            name: "cleanup.browser-close",
            ok: false,
            detail: "Could not close isolated browser session; parent must close named cc session",
          })
          process.exitCode = 1
        }
      }
      privateWrite(
        ctx,
        `${ctx.phase}-report.json`,
        JSON.stringify(
          { phase: ctx.phase, session: ctx.session, steps: ctx.steps, artifacts: ctx.artifacts, notes },
          null,
          2,
        ),
      )
    }
  }
}
if (import.meta.main) {
  const result = await veranstalterContractsContentLocalE2e()
  if (!result.success) {
    console.error(`BLOCKED ${result.errorMessage}`)
    process.exitCode = 1
  }
  if (result.success)
    console.log(`DONE phase=${result.data.phase} steps=${result.data.steps.length} artifacts=${result.data.artifacts}`)
}
