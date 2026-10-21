#!/usr/bin/env bun
import { organizerContractDocuments } from "#src/organizer/dashboard/contracts/organizerContractDocuments.ts"
/**
 * LIVE browser E2E: event lifecycle + wizard resumption (Veranstalter dashboard).
 *
 * Runnable local driver (bun, no test runner needed):
 *   bun e2e/dashboard/veranstalterEventsLocalE2e.ts --tag <runTag> --phase guards
 *   bun e2e/dashboard/veranstalterEventsLocalE2e.ts --tag <runTag> --phase setup
 *   bun e2e/dashboard/veranstalterEventsLocalE2e.ts --tag <runTag> --phase ui
 *   bun e2e/dashboard/veranstalterEventsLocalE2e.ts --tag <runTag> --phase verify
 *   bun e2e/dashboard/veranstalterEventsLocalE2e.ts --tag <runTag> --phase all
 *
 * Fail-closed driver gates (literal loopback only, never prod):
 *   frontend http://127.0.0.1:13557, backend http://127.0.0.1:13470.
 * Fixture tokens are read-only via fs from the private 0600 staging file and
 * NEVER printed: every captured CLI output is sanitized before it is stored
 * or reported. Backend writes are limited to the synthetic-org setup
 * (customerCreate + adminConfigure + adminApprove with local-fixture consent
 * flags); the event flow itself goes through the ACTUAL UI. Backend reads are
 * verify-only and print IDs/counts/dates (no PII, no tokens).
 *
 * Owned scope: this file only, plus private artifacts under
 * /tmp/eventoren-dashboard-verification/e2e-events-<tag>/.
 * No app source edits, no git writes, no prod/shared-preview/deploys.
 */

import { spawnSync } from "node:child_process"
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"

const FRONT = "http://127.0.0.1:13557"
const BACKEND = "http://127.0.0.1:13470"
const BACKEND_IDENTITY = "eventoren-local-rehearsal"
const ART_ROOT = "/tmp/eventoren-dashboard-verification"
const WAIT_MS = 30_000

// Stable event fixture (Berlin wall clock; June = CEST = UTC+2).
const EVT = {
  titleBase: "E2E Sommerfest",
  titleUpdated: "aktualisiert",
  category: "Konzert",
  description: "E2E-Lifecycle-Probe, keine echten Tickets.",
  date: "2027-06-01",
  startTime: "20:00",
  startTimeEdited: "20:05",
  endTime: "22:00",
  doorsTime: "19:30",
  venue: "Kulturhalle",
  city: "Berlin",
  address: "Musterweg 1",
  // Existing project public asset: served by the local frontend, no upload.
  imageUrl: `${FRONT}/logo.svg`,
  imageAlt: "E2E Titelbild (Projektlogo)",
  tierName: "Standard",
  tierPrice: "22,50",
  tierCapacity: "20",
  tierDescription: "E2E Tarifzusatz (synthetisch, lokal)",
}

/** Typed backend calls via the generated Convex API (no string function addresses). */
function backendOrgCreate(
  client: ConvexHttpClient,
  args: {
    token: string
    name: string
    slug: string
    kind: string
    contactEmail: string
    imprint: string
    iban: string
    bankHolder: string
    termsRevision: string
    dpaRevision: string
    termsAccepted: boolean
    dpaAccepted: boolean
  },
): Promise<unknown> {
  return client.mutation(api.organizerDashboard.organizerDashboardOrganizationCreateMutation, args)
}

function backendAdminConfigure(
  client: ConvexHttpClient,
  args: {
    token: string
    orgId: Id<"orgs">
    fee: { percentBps: number; fixedCents: number; payer: string }
    tax: { status: string; defaultRateBps: number }
  },
): Promise<unknown> {
  return client.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, args)
}

function backendAdminApprove(client: ConvexHttpClient, args: { token: string; orgId: Id<"orgs"> }): Promise<unknown> {
  return client.mutation(api.organizerDashboardAdmin.organizerDashboardAdminApproveMutation, args)
}

function backendEventGet(
  client: ConvexHttpClient,
  args: { token: string; orgId: Id<"orgs">; eventKey: string },
): Promise<unknown> {
  return client.query(api.organizerDashboardEvents.organizerDashboardEventGetQuery, args)
}

function backendEventList(
  client: ConvexHttpClient,
  args: { token: string; orgId: Id<"orgs">; paginationOpts: { numItems: number; cursor: null } },
): Promise<unknown> {
  return client.query(api.organizerDashboardEvents.organizerDashboardEventListQuery, args)
}

type StepRecord = {
  readonly step: string
  readonly ok: boolean
  readonly detail: string
}

const steps: StepRecord[] = []
let secrets: string[] = []
let artDir = ART_ROOT
let sessionName = "e2e-events"

function sanitize(text: string): string {
  let out = text
  for (const secret of secrets) {
    if (secret && secret.length >= 8) out = out.split(secret).join("[REDACTED]")
  }
  return out
}

function log(step: string, ok: boolean, detail: string): void {
  const clean = sanitize(detail)
  steps.push({ step, ok, detail: clean })
  // eslint-disable-next-line no-console
  console.log(`${ok ? "PASS" : "FAIL"} ${step} :: ${clean}`)
  if (!ok) throw new Error(`blocking failure at ${step}: ${clean}`)
}

function argValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name)
  return idx >= 0 ? process.argv[idx + 1] : undefined
}

function privateFileCheck(path: string): void {
  const st = lstatSync(path)
  if (!st.isFile() || st.isSymbolicLink()) throw new Error(`refused file at ${path}`)
  if (statSync(path).mode & 0o777 & 0o077) throw new Error(`refused permissions at ${path}`)
}

function stateRoot(): string {
  const raw = process.env.LOCAL_REHEARSAL_STATE_ROOT ?? join(homedir(), ".local/state/eventoren/local-rehearsal")
  return raw
}

function readFixtureTokens(): { customerToken: string; adminToken: string } {
  const fixtureFile = join(stateRoot(), "staging/fixture-tokens.json")
  privateFileCheck(fixtureFile)
  const parsed: unknown = JSON.parse(readFileSync(fixtureFile, "utf8"))
  const sessions = (parsed as { sessions?: Array<{ role?: unknown; token?: unknown }> }).sessions
  if (!Array.isArray(sessions)) throw new Error("fixture token shape refused")
  const pick = (role: string): string => {
    const entry = sessions.find((s) => s.role === role)
    const token = typeof entry?.token === "string" ? entry.token : ""
    if (token.length < 16) throw new Error(`fixture token too short for ${role}`)
    return token
  }
  const customerToken = pick("customer")
  const adminToken = pick("admin")
  secrets = [customerToken, adminToken, encodeURIComponent(customerToken), encodeURIComponent(adminToken)]
  return { customerToken, adminToken }
}

// --- agent-browser driver -------------------------------------------------

function ab(args: string[], extraEnv?: Record<string, string>): { code: number; out: string; err: string } {
  const run = spawnSync("agent-browser", args, {
    encoding: "utf8",
    timeout: WAIT_MS + 10_000,
    env: { ...process.env, AGENT_BROWSER_SESSION: sessionName, ...(extraEnv ?? {}) },
  })
  return {
    code: run.status ?? 99,
    out: sanitize((run.stdout ?? "").trim()),
    err: sanitize((run.stderr ?? "").trim()),
  }
}

function abJson(args: string[], extraEnv?: Record<string, string>): unknown {
  const run = ab(args, extraEnv)
  if (run.code !== 0)
    throw new Error(`agent-browser ${args.slice(0, 3).join(" ")} exit ${run.code}: ${run.err || run.out}`.slice(0, 500))
  try {
    return JSON.parse(run.out)
  } catch {
    throw new Error(`non-JSON output from agent-browser ${args.slice(0, 3).join(" ")}: ${run.out.slice(0, 300)}`)
  }
}

type SnapRefs = Record<string, { name?: string; role?: string }>

function snapRefs(): SnapRefs {
  const parsed = abJson(["snapshot", "-i", "--json"]) as { data?: { refs?: SnapRefs } }
  return parsed.data?.refs ?? {}
}

/** Find refs whose accessible name contains `needle` (case-insensitive), optionally role-filtered. */
function findRefs(needle: string, role?: string): string[] {
  const refs = snapRefs()
  const hit: string[] = []
  for (const [ref, meta] of Object.entries(refs)) {
    const name = (meta.name ?? "").toLowerCase()
    if (!name.includes(needle.toLowerCase())) continue
    if (role && meta.role !== role) continue
    hit.push(ref)
  }
  return hit.sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)))
}

function mustRef(needle: string, role?: string): string {
  const hit = findRefsRetry(needle, role)
  if (hit.length === 0) throw new Error(`no element named like "${needle}"${role ? ` (${role})` : ""}`)
  const first = hit[0]
  if (!first) throw new Error(`no element named like "${needle}"${role ? ` (${role})` : ""}`)
  return first
}

/** Bounded re-resolution across Solid re-renders (fresh snapshot per attempt, ~6s budget).
 * When expectCount is set, only an exact match wins: transient duplicate nodes
 * from mid-render snapshots must not shift group indexing. */
function findRefsRetry(needle: string, role?: string, attempts = 8, expectCount?: number): string[] {
  let hit: string[] = []
  for (let attempt = 0; attempt < attempts; attempt++) {
    hit = findRefs(needle, role)
    if (expectCount === undefined ? hit.length > 0 : hit.length === expectCount) return hit
    if (attempt < attempts - 1) ab(["wait", "500"])
  }
  return hit
}

function currentUrl(): string {
  const parsed = abJson(["get", "url", "--json"]) as { data?: unknown }
  const data = (parsed as { data?: { url?: unknown } }).data
  if (typeof data === "string") return data
  if (data && typeof (data as { url?: unknown }).url === "string") return (data as { url: string }).url
  return JSON.stringify(data ?? parsed).slice(0, 300)
}

function inputValue(ref: string): string {
  const parsed = abJson(["get", "value", ref, "--json"]) as { data?: unknown }
  const data = (parsed as { data?: { value?: unknown } }).data
  if (typeof data === "string") return data
  if (data && typeof (data as { value?: unknown }).value === "string") return (data as { value: string }).value
  return sanitize(JSON.stringify(data ?? parsed)).slice(0, 300)
}

function visibleText(ref: string): string {
  const parsed = abJson(["get", "text", ref, "--json"]) as { data?: unknown }
  const data = (parsed as { data?: { text?: unknown } }).data
  if (typeof data === "string") return data
  return sanitize(JSON.stringify(data ?? parsed)).slice(0, 500)
}

function pageText(): string {
  const run = ab(["read"])
  return run.out.slice(0, 8000)
}

function writeArtifacts(tag: string): void {
  mkdirSync(artDir, { recursive: true, mode: 0o700 })
  writeFileSync(join(artDir, "steps.json"), sanitize(JSON.stringify(steps, null, 2)), { mode: 0o600 })
}

// --- phases: guards + setup -----------------------------------------------

async function phaseGuards(): Promise<void> {
  for (const url of [FRONT, BACKEND]) {
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(url)) throw new Error(`loopback gate refused ${url}`)
  }
  const front = await fetch(FRONT, { signal: AbortSignal.timeout(10_000) })
  if (!front.ok) throw new Error(`frontend ${FRONT} status ${front.status}`)
  log("guards.frontend-reachable", true, `${FRONT} -> ${front.status}`)
  const backend = await fetch(BACKEND, { signal: AbortSignal.timeout(10_000) })
  // Convex backend root answers 200/404 depending on route; any HTTP answer proves loopback bind.
  log("guards.backend-reachable", true, `${BACKEND} -> ${backend.status}`)
  const verify = spawnSync("bash", ["ops/convex/local-rehearsal/bootstrap.bash", "verify"], {
    encoding: "utf8",
    timeout: 120_000,
    cwd: process.cwd(),
  })
  if (verify.status !== 0)
    throw new Error(`bootstrap verify refused: ${sanitize(verify.stderr || verify.stdout).slice(0, 400)}`)
  log("guards.bootstrap-verify", true, "sole internal network, 127.0.0.1 binds, pinned digest, live identity ok")
  const fixtureFile = join(stateRoot(), "staging/fixture-tokens.json")
  privateFileCheck(fixtureFile)
  log("guards.fixture-perms", true, "staging/fixture-tokens.json is a 0600 non-symlink")
}

function runTag(): string {
  const tag = argValue("--tag") ?? ""
  if (!/^[a-z0-9-]{4,40}$/.test(tag)) throw new Error("pass --tag <lowercase-alnum-hyphen> (4..40 chars)")
  return tag
}

function runFile(tag: string): string {
  return join(ART_ROOT, `e2e-events-${tag}`, "run.json")
}

async function phaseSetup(tag: string): Promise<string> {
  const { customerToken, adminToken } = readFixtureTokens()
  const client = new ConvexHttpClient(BACKEND)
  const suffix = `${Date.now()
    .toString(36)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]/g, "")}`
  const slug = `e2e-ev-${tag}-${suffix}`.slice(0, 40).replaceAll(/--+/g, "-")
  const name = `E2E Events ${tag}`
  // Local-fixture consent flags only; no legal meaning for this synthetic org.
  const created = (await backendOrgCreate(client, {
    token: customerToken,
    name,
    slug,
    kind: "verein",
    contactEmail: "veranstalter@example.invalid",
    imprint: "E2E-Impressum (synthetisch, lokal)",
    iban: "DE89370400440532013000",
    bankHolder: "E2E Testverein",
    termsRevision: organizerContractDocuments.terms.revision,
    dpaRevision: organizerContractDocuments.dpa.revision,
    termsAccepted: true,
    dpaAccepted: true,
  })) as { success: boolean; data?: { orgId?: unknown }; errorMessage?: string }
  if (!created.success || typeof created.data?.orgId !== "string") {
    throw new Error(`synthetic org create refused: ${sanitize(created.errorMessage ?? "shape")}`.slice(0, 300))
  }
  const orgId = created.data.orgId as string
  log("setup.org-create", true, `orgId=${orgId} slug-shape=ok`)
  const configured = (await backendAdminConfigure(client, {
    token: adminToken,
    orgId: orgId as Id<"orgs">,
    fee: { percentBps: 350, fixedCents: 49, payer: "kaeufer" },
    tax: { status: "regel", defaultRateBps: 700 },
  })) as { success: boolean; errorMessage?: string }
  if (!configured.success)
    throw new Error(`adminConfigure refused: ${sanitize(configured.errorMessage ?? "")}`.slice(0, 300))
  log("setup.admin-configure", true, `fee=3.5%+49c buyer, tax=7% (regel) orgId=${orgId}`)
  const approved = (await backendAdminApprove(client, {
    token: adminToken,
    orgId: orgId as Id<"orgs">,
  })) as { success: boolean; errorMessage?: string }
  if (!approved.success) throw new Error(`adminApprove refused: ${sanitize(approved.errorMessage ?? "")}`.slice(0, 300))
  log("setup.admin-approve", true, `orgId=${orgId} status=aktiv`)
  artDir = join(ART_ROOT, `e2e-events-${tag}`)
  mkdirSync(artDir, { recursive: true, mode: 0o700 })
  writeFileSync(runFile(tag), JSON.stringify({ tag, orgId, createdAt: new Date().toISOString() }, null, 2), {
    mode: 0o600,
  })
  return orgId
}

async function openWizard(orgId: string, extra = ""): Promise<void> {
  const run = ab(["open", `${FRONT}/veranstalter/events/neu?org=${encodeURIComponent(orgId)}${extra}`])
  if (run.code !== 0) throw new Error(`open wizard refused: ${(run.err || run.out).slice(0, 300)}`)
  const wait = ab(["wait", "--text", "Neue Veranstaltung"])
  if (wait.code !== 0) throw new Error(`wizard did not render: ${(wait.err || wait.out).slice(0, 300)}`)
}

async function phaseProbe(tag: string, orgId: string, customerToken: string): Promise<void> {
  artDir = join(ART_ROOT, `e2e-events-${tag}`)
  mkdirSync(artDir, { recursive: true, mode: 0o700 })
  const setCookie = ab(
    [
      "cookies",
      "set",
      "eventoren-session",
      encodeURIComponent(customerToken),
      "--url",
      `${FRONT}/`,
      "--path",
      "/",
      "--sameSite",
      "Lax",
    ],
    { E2E_EVENTS_TOKEN: customerToken },
  )
  if (setCookie.code !== 0) throw new Error(`cookie set refused: ${(setCookie.err || setCookie.out).slice(0, 300)}`)
  await openWizard(orgId)
  const snap = ab(["snapshot", "-i"])
  writeFileSync(join(artDir, "probe-wizard-step0.txt"), snap.out, { mode: 0o600 })
  log("probe.wizard-snapshot", true, `snapshot bytes=${snap.out.length}`)
  writeArtifacts(tag)
}

function wizardUrl(orgId: string, params: { step?: number; entwurf?: string; tier?: string }): string {
  const search = new URLSearchParams({ org: orgId })
  if (params.step !== undefined && params.step !== 0) search.set("step", String(params.step))
  if (params.entwurf !== undefined) search.set("entwurf", params.entwurf)
  if (params.tier !== undefined) search.set("tier", params.tier)
  return `${FRONT}/veranstalter/events/neu?${search.toString()}`
}

function urlParam(url: string, name: string): string | undefined {
  try {
    return new URL(url).searchParams.get(name) ?? undefined
  } catch {
    return undefined
  }
}

function clickRef(ref: string, label: string): void {
  const run = ab(["click", ref])
  if (run.code !== 0) throw new Error(`click "${label}" refused: ${(run.err || run.out).slice(0, 300)}`)
}

function fillRef(ref: string, value: string, label: string): void {
  const run = ab(["fill", ref, value])
  if (run.code !== 0) throw new Error(`fill "${label}" refused: ${(run.err || run.out).slice(0, 300)}`)
}

function selectRef(ref: string, value: string, label: string): void {
  const run = ab(["select", ref, value])
  if (run.code !== 0) throw new Error(`select "${label}" refused: ${(run.err || run.out).slice(0, 300)}`)
}

function waitText(text: string, label: string): void {
  const run = ab(["wait", "--text", text])
  if (run.code !== 0) throw new Error(`wait "${label}" timed out: ${(run.err || run.out).slice(0, 300)}`)
}

/** Sheet save success closes the sheet (URL tier param removed); only a
 * successful save closes, so this URL wait is the save-success proof. */
function waitSheetClosed(label: string): void {
  const run = ab(["wait", "--fn", "new URL(location.href).searchParams.get('tier')===null"])
  if (run.code !== 0) throw new Error(`wait "${label}" timed out: ${(run.err || run.out).slice(0, 300)}`)
}

/** The single tier description field in the open sheet. A missing or
 * ambiguous field fails loudly: silent skips would fake the clear proof. */
function sheetDescriptionRef(): string {
  const refs = findRefsRetry("Beschreibung")
  if (refs.length !== 1) throw new Error(`tier description field missing/ambiguous (found ${refs.length})`)
  const ref = refs[0]
  if (!ref) throw new Error("tier description field missing")
  return ref
}

/** Native date segments + time combobox for one datetime group, in document order (Beginn=0, Ende=1, Einlass=2).
 * The app renders a native date input (Month/Day/Year spinbuttons; fill does not stick, keyboard entry does)
 * plus a time combobox per group. Refs go stale across Solid re-renders, so every control is re-resolved
 * immediately before use (never reuse a ref across interactions). */
function pickGroupRef(needle: string, kind: string, groupIndex: number, role?: string): string {
  const refs = findRefsRetry(needle, role, 8, 3)
  if (refs.length !== 3) throw new Error(`datetime ${kind} refs missing (found ${refs.length})`)
  const ref = refs[groupIndex]
  if (!ref) throw new Error(`datetime ${kind} group ${groupIndex} out of range`)
  return ref
}

/** Snapshot-reported numeric value of Month/Day/Year spinbuttons, in document order. */
function spinValues(kind: "Month Month" | "Day Day" | "Year Year"): Array<number | undefined> {
  const out = ab(["snapshot", "-i"]).out
  const values: Array<number | undefined> = []
  for (const line of out.split("\n")) {
    const match = new RegExp(`spinbutton "${kind}".*:[\\s]*(\\d+)`).exec(line)
    if (match?.[1] !== undefined) values.push(Number(match[1]))
  }
  return values
}

function setDateTime(groupIndex: number, label: string, date: string, time: string): void {
  const [year, month, day] = date.split("-")
  if (!year || !month || !day) throw new Error(`date shape refused for "${label}": ${date}`)
  // Segment refs renumber violently across Solid re-renders (observed
  // e317->e901 on one input within minutes), so numeric-sort indexing can
  // address the wrong group. Entry therefore targets the native date input by
  // stable document order and fires real input/change events; the app path
  // (validation, mutation, backend) stays fully real. Verification below reads
  // the rendered segments in the same document order plus server state.
  const entry = ab([
    "eval",
    `(()=>{const inputs=document.querySelectorAll('input[type=date]');const el=inputs[${groupIndex}];if(!el)return 'missing';el.focus();el.value='${date}';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return el.value})()`,
  ])
  if (entry.code !== 0 || !entry.out.includes(date)) {
    throw new Error(`date entry "${label}" refused: ${(entry.err || entry.out).slice(0, 200)}`)
  }
  const months = spinValues("Month Month")
  const days = spinValues("Day Day")
  const years = spinValues("Year Year")
  if (months[groupIndex] !== Number(month) || days[groupIndex] !== Number(day) || years[groupIndex] !== Number(year)) {
    throw new Error(
      `datetime "${label}" did not stick (m=${months[groupIndex]} d=${days[groupIndex]} y=${years[groupIndex]})`,
    )
  }
  // Re-resolve the combobox immediately before selecting: segment typing re-renders the group.
  const setTime = (): void => {
    selectRef(pickGroupRef("Uhrzeit", "time", groupIndex, "combobox"), time, `${label} Uhrzeit`)
  }
  setTime()
  const back = inputValue(pickGroupRef("Uhrzeit", "time-check", groupIndex, "combobox"))
  if (back !== time) {
    setTime()
    const retry = inputValue(pickGroupRef("Uhrzeit", "time-retry", groupIndex, "combobox"))
    if (retry !== time) throw new Error(`time "${label}" did not stick (got "${retry}")`)
  }
}

function shot(name: string): void {
  const run = ab(["screenshot", join(artDir, name)])
  if (run.code !== 0) throw new Error(`screenshot ${name} refused: ${(run.err || run.out).slice(0, 200)}`)
}

function setViewport(width: number, height: number): void {
  const run = ab(["set", "viewport", String(width), String(height)])
  if (run.code !== 0) throw new Error(`viewport ${width}x${height} refused: ${(run.err || run.out).slice(0, 200)}`)
}

function consoleCapture(name: string): void {
  const run = ab(["console"])
  const text = run.code === 0 ? run.out : `console unavailable: ${run.err || run.out}`
  writeFileSync(join(artDir, name), `${text.slice(0, 20000)}\n`, { mode: 0o600 })
}

async function eventDetailRead(
  orgId: string,
  eventKey: string,
): Promise<{
  status: string
  startsAt: string
  endsAt: string
  title: string
  tiers: Array<{
    tierKey: string
    name: string
    description: string
    priceCents: number
    capacity: number
    archivedAt?: string
  }>
}> {
  const { customerToken } = readFixtureTokens()
  const client = new ConvexHttpClient(BACKEND)
  const raw = (await backendEventGet(client, {
    token: customerToken,
    orgId: orgId as Id<"orgs">,
    eventKey,
  })) as { success: boolean; data?: any; errorMessage?: string }
  if (!raw.success) throw new Error(`eventGet refused: ${sanitize(raw.errorMessage ?? "").slice(0, 200)}`)
  const tiers = ((raw.data?.tiers ?? []) as any[]).map((t) => ({
    tierKey: String(t.tierKey),
    name: String(t.name),
    description: typeof t.description === "string" ? (t.description as string) : "",
    priceCents: Number(t.priceCents),
    capacity: Number(t.capacity),
    ...(t.archivedAt !== undefined ? { archivedAt: String(t.archivedAt) } : {}),
  }))
  return {
    status: String(raw.data?.status),
    startsAt: String(raw.data?.startsAt),
    endsAt: String(raw.data?.endsAt),
    title: String(raw.data?.title),
    tiers,
  }
}

async function phaseUi(tag: string, orgId: string, customerToken: string): Promise<void> {
  const title = `${EVT.titleBase} ${tag}`
  const titleEdited = `${title} ${EVT.titleUpdated}`

  ab(["open", FRONT])
  const setCookie = ab([
    "cookies",
    "set",
    "eventoren-session",
    encodeURIComponent(customerToken),
    "--url",
    `${FRONT}/`,
    "--path",
    "/",
    "--sameSite",
    "Lax",
  ])
  if (setCookie.code !== 0) throw new Error(`session cookie refused: ${(setCookie.err || setCookie.out).slice(0, 200)}`)
  log("ui.session-cookie", true, "eventoren-session cookie set on 127.0.0.1:13557 (value redacted)")

  // A. step 0 base fields ------------------------------------------------
  await openWizard(orgId)
  waitText("Schritt 1 von 3", "wizard step 1 renders")
  fillRef(mustRef("Titel"), title, "Titel")
  fillRef(mustRef("Kategorie"), EVT.category, "Kategorie")
  fillRef(mustRef("Beschreibung"), EVT.description, "Beschreibung")
  setDateTime(0, "Beginn (Europe/Berlin)", EVT.date, EVT.startTime)
  setDateTime(1, "Ende (Europe/Berlin)", EVT.date, EVT.endTime)
  setDateTime(2, "Einlass (Europe/Berlin)", EVT.date, EVT.doorsTime)
  fillRef(mustRef("Veranstaltungsort"), EVT.venue, "Veranstaltungsort")
  fillRef(mustRef("Stadt"), EVT.city, "Stadt")
  fillRef(mustRef("Adresse"), EVT.address, "Adresse")
  fillRef(mustRef("Bild-URL"), EVT.imageUrl, "Bild-URL")
  fillRef(mustRef("Bildbeschreibung"), EVT.imageAlt, "Bildbeschreibung")
  clickRef(mustRef("Weiter zu Tickets"), "Weiter zu Tickets")
  waitText("Schritt 2 von 3", "wizard step 2 renders")
  const step1Url = currentUrl()
  const draftKey = urlParam(step1Url, "entwurf")
  if (!draftKey) throw new Error(`draft key missing in URL: ${sanitize(step1Url).slice(0, 200)}`)
  log("ui.base-next-creates-draft", true, `entwurf=${draftKey} (draft id only)`)
  const created = await eventDetailRead(orgId, draftKey)
  if (created.title !== title) throw new Error(`server title mismatch after create (got "${created.title}")`)
  if (!created.startsAt.startsWith("2027-06-01T18:00")) {
    throw new Error(`Berlin 20:00 must persist as 18:00Z (got ${created.startsAt})`)
  }
  log("ui.server-draft-dates", true, `startsAt=${created.startsAt} endsAt=${created.endsAt}`)

  // B. Back edits title/time, Next persists (update path) -----------------
  clickRef(mustRef("Zurück"), "Zurück zu Schritt 1")
  waitText("Schritt 1 von 3", "back to step 1")
  const titleBack = inputValue(mustRef("Titel"))
  if (titleBack !== title) throw new Error(`title did not survive Back (got "${titleBack}")`)
  log("ui.back-keeps-title", true, "title persisted across Back")
  fillRef(mustRef("Titel"), titleEdited, "Titel edit")
  setDateTime(0, "Beginn (Europe/Berlin)", EVT.date, EVT.startTimeEdited)
  clickRef(mustRef("Weiter zu Tickets"), "Weiter (update path)")
  waitText("Schritt 2 von 3", "step 2 after update")
  const step1bUrl = currentUrl()
  if (urlParam(step1bUrl, "entwurf") !== draftKey) throw new Error("draft key changed across Back/Next")
  const updated = await eventDetailRead(orgId, draftKey)
  if (updated.title !== titleEdited) throw new Error("edited title did not persist server-side")
  if (!updated.startsAt.startsWith("2027-06-01T18:05")) {
    throw new Error(`edited 20:05 must persist as 18:05Z (got ${updated.startsAt})`)
  }
  log("ui.back-edit-persists", true, `title+startsAt updated on draft ${draftKey}`)

  // C. tier save, no duplicate on resave ----------------------------------
  fillRef(mustRef("Tarifname"), EVT.tierName, "Tarifname")
  fillRef(mustRef("Preis in Euro"), EVT.tierPrice, "Preis")
  fillRef(mustRef("Kapazität"), EVT.tierCapacity, "Kapazität")
  clickRef(mustRef("Tarif speichern"), "Tarif speichern")
  waitText("Schritt 3 von 3", "review step renders")
  const step2Url = currentUrl()
  const tierKey = urlParam(step2Url, "tier")
  if (urlParam(step2Url, "entwurf") !== draftKey || !tierKey) {
    throw new Error(`review URL must keep entwurf+tier (got ${sanitize(step2Url).slice(0, 200)})`)
  }
  log("ui.tier-save", true, `tier=${tierKey} (tier id only)`)
  const withTier = await eventDetailRead(orgId, draftKey)
  const createdTier = withTier.tiers[0]
  if (withTier.tiers.length !== 1 || createdTier?.priceCents !== 2250 || createdTier?.capacity !== 20) {
    throw new Error(`server tier mismatch: count=${withTier.tiers.length}`)
  }
  log("ui.server-tier", true, `tiers=1 priceCents=2250 capacity=20`)

  clickRef(mustRef("Zurück"), "Zurück zu Tarifen")
  waitText("Schritt 2 von 3", "back to tier step")
  if (urlParam(currentUrl(), "tier") !== tierKey) throw new Error("tier key lost across review Back")
  const tierNameBack = inputValue(mustRef("Tarifname"))
  if (tierNameBack !== EVT.tierName) throw new Error(`tier name did not survive Back (got "${tierNameBack}")`)
  clickRef(mustRef("Tarif speichern"), "Tarif erneut speichern")
  waitText("Schritt 3 von 3", "review after resave")
  const step2bUrl = currentUrl()
  if (urlParam(step2bUrl, "tier") !== tierKey) throw new Error("tier resave duplicated (tier key changed)")
  const resaved = await eventDetailRead(orgId, draftKey)
  if (resaved.tiers.length !== 1) throw new Error(`tier resave duplicated server-side (count=${resaved.tiers.length})`)
  log("ui.tier-resave-no-duplicate", true, `tier=${tierKey} tiers=1`)

  // D. reload wizard step 2, draft/tier/server count same -----------------
  ab(["open", wizardUrl(orgId, { step: 2, entwurf: draftKey, tier: tierKey })])
  waitText("Schritt 3 von 3", "reloaded review renders")
  const body = pageText()
  if (!body.includes(titleEdited) || !body.includes(EVT.tierName)) {
    throw new Error("reloaded review does not show draft title+tier")
  }
  const reloaded = await eventDetailRead(orgId, draftKey)
  if (reloaded.title !== titleEdited || reloaded.tiers.length !== 1) {
    throw new Error("reload changed draft state")
  }
  log("ui.reload-keeps-draft", true, `title+tier stable, tiers=1`)

  // E. publish via UI (approved org) --------------------------------------
  clickRef(mustRef("Veröffentlichen"), "Veröffentlichen")
  const published = ab(["wait", "--url", "**/veranstalter/events/*"])
  if (published.code !== 0) throw new Error(`publish did not land on detail page`)
  const detailUrl = currentUrl()
  const eventKey = /\/veranstalter\/events\/([^?/]+)/.exec(detailUrl)?.[1] ?? draftKey
  const pub = await eventDetailRead(orgId, eventKey)
  if (pub.status !== "veroeffentlicht" && pub.status !== "published") {
    throw new Error(`event not published (status=${pub.status})`)
  }
  log("ui.publish", true, `eventKey=${eventKey} status=${pub.status}`)
  setViewport(1440, 900)
  shot("wizard-desktop.png")
  setViewport(390, 844)
  shot("wizard-mobile.png")
  setViewport(1440, 900)
  consoleCapture("console-wizard.log")

  // F. public page (never buy) --------------------------------------------
  const opened = ab(["open", `${FRONT}/events/${eventKey}`])
  if (opened.code !== 0) throw new Error(`open public page refused: ${(opened.err || opened.out).slice(0, 200)}`)
  const landed = ab(["wait", "--url", "**/events/*"])
  if (landed.code !== 0) throw new Error(`public page did not land on /events/*`)
  waitText(titleEdited, "public page shows updated title")
  const pubBody = pageText()
  for (const needle of [titleEdited, EVT.tierName, "Berlin"]) {
    if (!pubBody.includes(needle)) throw new Error(`public page missing "${needle}"`)
  }
  if (/kaufen|in den warenkorb/i.test(pubBody)) {
    // Buy affordances may exist; the rule is WE never click them.
  }
  log("ui.public-page", true, "title/date-Berlin/ticket visible, no buy click performed")
  shot("public-desktop.png")

  // G. tier sheet via ?tier=: prefill, description nonempty->empty roundtrip.
  // Sheet save success closes the sheet (URL tier param removed); only a
  // successful save closes, so the URL wait is the success proof. The wizard
  // has no tier description field, so the nonempty value is set here first.
  const sheetUrl = `${FRONT}/veranstalter/events/${eventKey}?org=${encodeURIComponent(orgId)}&tier=${encodeURIComponent(tierKey)}`
  const openSheet = ab(["open", sheetUrl])
  if (openSheet.code !== 0)
    throw new Error(`open tier sheet refused: ${(openSheet.err || openSheet.out).slice(0, 200)}`)
  waitText("Tarif bearbeiten", "tier sheet opens via ?tier=")
  const sheetName = inputValue(mustRef("Tarifname"))
  if (sheetName !== EVT.tierName) throw new Error(`sheet prefill wrong (got "${sheetName}")`)
  log("ui.sheet-prefill", true, `Tarifname=${EVT.tierName}`)
  fillRef(sheetDescriptionRef(), EVT.tierDescription, "Beschreibung setzen")
  clickRef(mustRef("Tarif speichern"), "Tarif speichern (Beschreibung gesetzt)")
  waitSheetClosed("sheet closes after description save")
  const afterDescSet = await eventDetailRead(orgId, eventKey)
  const setTier = afterDescSet.tiers[0]
  if (
    afterDescSet.tiers.length !== 1 ||
    setTier?.tierKey !== tierKey ||
    setTier?.name !== EVT.tierName ||
    setTier?.description !== EVT.tierDescription
  ) {
    throw new Error("sheet description save did not persist")
  }
  log("ui.sheet-desc-set", true, `description set on tier=${tierKey}`)
  const reopenSheet = ab(["open", sheetUrl])
  if (reopenSheet.code !== 0)
    throw new Error(`reopen tier sheet refused: ${(reopenSheet.err || reopenSheet.out).slice(0, 200)}`)
  waitText("Tarif bearbeiten", "sheet reopens for clear")
  const shownDesc = inputValue(sheetDescriptionRef())
  if (shownDesc !== EVT.tierDescription) throw new Error(`sheet did not show saved description (got "${shownDesc}")`)
  fillRef(sheetDescriptionRef(), "", "Beschreibung leeren")
  clickRef(mustRef("Tarif speichern"), "Tarif speichern (Beschreibung leer)")
  waitSheetClosed("sheet closes after description clear")
  const afterSheet = await eventDetailRead(orgId, eventKey)
  const clearedTier = afterSheet.tiers[0]
  if (
    afterSheet.tiers.length !== 1 ||
    clearedTier?.tierKey !== tierKey ||
    clearedTier?.name !== EVT.tierName ||
    (clearedTier?.description ?? "") !== ""
  ) {
    throw new Error("sheet save mutated tier identity/count or description not cleared")
  }
  log("ui.sheet-save", true, "tiers=1, name+key stable, description cleared")

  // H. archive on published events: no nested confirm exists by design; the UI
  // states archiving is unavailable until server-side sale cancellation lands.
  // The safety property holds: Archivieren is a no-op, tiers=1 unarchived.
  ab([
    "open",
    `${FRONT}/veranstalter/events/${eventKey}?org=${encodeURIComponent(orgId)}&tier=${encodeURIComponent(tierKey)}`,
  ])
  waitText("Tarif bearbeiten", "sheet reopens")
  const noticeBody = pageText()
  if (!noticeBody.includes("sichere Stornierung")) {
    throw new Error("published no-archive notice missing")
  }
  log("ui.archive-blocked-notice", true, "published events cannot be archived (notice shown)")
  clickRef(mustRef("Archivieren"), "Archivieren (published: safe no-op)")
  const afterClick = pageText()
  if (/archivieren\?/i.test(afterClick)) throw new Error("unexpected archive confirm on published event")
  const afterDialog = await eventDetailRead(orgId, eventKey)
  if (afterDialog.tiers.length !== 1 || afterDialog.tiers[0]?.archivedAt !== undefined) {
    throw new Error("archive click mutated tier state")
  }
  log("ui.archive-click-no-mutation", true, "tiers=1 unarchived after Archivieren click")
  const cancel = ab(["press", "Escape"])
  if (cancel.code !== 0) throw new Error(`sheet Escape refused`)
  // Archive stays unavailable: the only public tier is kept.
  const final = await eventDetailRead(orgId, eventKey)
  if (final.tiers.length !== 1 || final.tiers[0]?.archivedAt !== undefined) {
    throw new Error("tier state changed after leaving sheet")
  }
  log("ui.archive-left-untouched", true, "tiers=1, only public tier kept")
  shot("detail-desktop.png")
  consoleCapture("console-detail.log")

  // I. readonly roles: NOT COVERED (not a passed step). Team/role UI does not
  // exist yet; a second seeded customer cannot be given a readonly org role
  // through any UI or staged role mutation here. Reported outside the step log
  // so an uncovered area never counts as a pass.
  // eslint-disable-next-line no-console
  console.log("NOT COVERED ui.readonly-roles :: no team UI; second-customer role assignment unavailable")
}

async function phaseVerify(tag: string, orgId: string): Promise<void> {
  // run.json exists only when this tag ran setup; ui/verify on a pre-approved
  // org carry orgId via --org, so its absence must not block verification.
  if (existsSync(runFile(tag))) {
    const runRaw = readFileSync(runFile(tag), "utf8")
    void runRaw
  }
  // Backend read-verify only: IDs/counts/dates, no PII/tokens.
  const { customerToken } = readFixtureTokens()
  const client = new ConvexHttpClient(BACKEND)
  const list = (await backendEventList(client, {
    token: customerToken,
    orgId: orgId as Id<"orgs">,
    paginationOpts: { numItems: 25, cursor: null },
  })) as { success: boolean; data?: any; errorMessage?: string }
  if (!list.success) throw new Error(`eventList refused: ${sanitize(list.errorMessage ?? "").slice(0, 200)}`)
  const items = Array.isArray(list.data?.page) ? list.data.page : []
  log("verify.event-list", true, `events=${items.length}`)
  writeFileSync(
    join(artDir, "verify-summary.md"),
    `# verify ${tag}\n\n- orgId: ${orgId}\n- events: ${items.length}\n- at: ${new Date().toISOString()}\n`,
    { mode: 0o600 },
  )
}

async function main(): Promise<void> {
  const tag = runTag()
  sessionName = `e2e-events-${tag}`
  artDir = join(ART_ROOT, `e2e-events-${tag}`)
  mkdirSync(artDir, { recursive: true, mode: 0o700 })
  const phase = argValue("--phase") ?? "all"
  try {
    if (phase === "guards" || phase === "all") await phaseGuards()
    let orgId = argValue("--org")
    if (phase === "setup" || phase === "all") {
      orgId = await phaseSetup(tag)
    }
    if (phase === "probe") {
      if (!orgId) throw new Error("probe needs --org <orgId>")
      const { customerToken } = readFixtureTokens()
      await phaseProbe(tag, orgId, customerToken)
    }
    if (phase === "ui" || phase === "all") {
      if (!orgId) throw new Error("ui needs --org <orgId> (or run setup first)")
      const { customerToken } = readFixtureTokens()
      await phaseUi(tag, orgId, customerToken)
    }
    if (phase === "verify") {
      if (!orgId) throw new Error("verify needs --org <orgId>")
      readFixtureTokens()
      await phaseVerify(tag, orgId)
    }
  } catch (error) {
    steps.push({
      step: "run.blocked",
      ok: false,
      detail: sanitize(error instanceof Error ? error.message : String(error)).slice(0, 500),
    })
    // eslint-disable-next-line no-console
    console.log(`BLOCKED ${(error instanceof Error ? error.message : String(error)).slice(0, 300)}`)
  } finally {
    writeArtifacts(tag)
  }
  const failed = steps.filter((s) => !s.ok)
  // eslint-disable-next-line no-console
  console.log(`DONE tag=${tag} steps=${steps.length} failed=${failed.length}`)
  if (failed.length > 0) process.exit(1)
}

await main()
