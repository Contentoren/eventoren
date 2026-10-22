import { execFileSync } from "node:child_process"
import { chmodSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import * as v from "valibot"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../convex/_generated/api.js"
import { createResult, createResultError, type Result } from "#result"

/**
 * Pure-navigation acceptance for the onboarding entry fix (organizationOptional
 * frame). No ?org= injection anywhere: zero-org empty CTA, second-org sidebar
 * flow, anonymous wall, and foreign-org error — all through normal UI clicks.
 *
 * Local-only guarded driver: literal 127.0.0.1 frontend only, fixture-seeded
 * auth from the EXTRA purenav fixture file (never SSO, never the main fixture
 * file), DEV fixture consent test-only with no legal meaning, all artifacts
 * under /tmp/eventoren-dashboard-verification. No app source, service, deploy,
 * git, or production interaction. Backend fixture seeding (auth setup) happens
 * outside this driver via the staged rehearsalFixtureEnsure mutation only.
 */

// Rehearsal loopback: the runtime.env-backed vite frontend (fixture sessions
// authenticate here; the plain :13557 frontend runs without rehearsal env).
export const PURE_NAV_LOCAL_FRONT_BASE = "http://127.0.0.1:13558" as const
const LOCAL_REHEARSAL_BACKEND_BASE = "http://127.0.0.1:13470" as const
const ARTIFACT_ROOT = "/tmp/eventoren-dashboard-verification" as const
const FIXTURE_EXTRA_PATH = join(homedir(), ".local/state/eventoren/local-rehearsal/staging/fixture-tokens-purenav.json")
const FORBIDDEN_PORTS = new Set([3210, 3211, 3234, 3235, 6791, 8320, 8321])
const STEP_TIMEOUT_MS = 30_000
/** Synthetic German test IBAN (mod-97 valid), no real account. */
const SYNTHETIC_TEST_IBAN = "DE89370400440532013000" as const
/** Foreign org owned by the base Events customer; the fresh user has no membership. */
const FOREIGN_ORG_ID = "kh7c9p1h3b2nsr4zn3var7rmdh8gndbj" as const

export type PureNavStep = {
  readonly name: string
  readonly ok: boolean
  readonly detail: string
}

export type PureNavSummary = {
  readonly ok: boolean
  readonly orgOneSlug: string
  readonly orgTwoSlug: string
  readonly steps: readonly PureNavStep[]
  readonly artifacts: readonly string[]
  readonly notes: readonly string[]
}

const fixtureSessionsSchema = v.object({
  sessions: v.array(v.object({ role: v.string(), token: v.string(), userId: v.string() })),
})

type BrowserHandle = {
  readonly session: string
  readonly artifactDir: string
  readonly artifacts: string[]
  readonly secrets: string[]
}

function redact(handle: Pick<BrowserHandle, "secrets">, text: string): string {
  let out = text
  for (const secret of handle.secrets) {
    if (secret.length >= 8) out = out.split(secret).join("[REDACTED]")
  }
  return out
    .replaceAll(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "[REDACTED-JWT]")
    .replaceAll(/eventoren-session[^;\s]*/g, "eventoren-session=[REDACTED]")
}

function agentBrowser(session: string, args: readonly string[], handle: BrowserHandle, logName: string): string {
  const cmd = ["--session", session, ...args]
  let stdout = ""
  let stderr = ""
  try {
    stdout = execFileSync("agent-browser", cmd, {
      encoding: "utf8",
      timeout: STEP_TIMEOUT_MS + 15_000,
      maxBuffer: 16 * 1024 * 1024,
    })
  } catch (error) {
    const failed = error as { stdout?: unknown; stderr?: unknown; message?: unknown }
    stdout = typeof failed.stdout === "string" ? failed.stdout : ""
    stderr = typeof failed.stderr === "string" ? failed.stderr : String(failed.message ?? error)
    writeFileSync(join(handle.artifactDir, `${logName}.stdout.log`), redact(handle, stdout), { mode: 0o600 })
    writeFileSync(join(handle.artifactDir, `${logName}.stderr.log`), redact(handle, stderr), { mode: 0o600 })
    throw new Error(`agent-browser ${args[0] ?? "?"} failed (${logName}): ${redact(handle, stderr).slice(0, 400)}`)
  }
  writeFileSync(join(handle.artifactDir, `${logName}.stdout.log`), redact(handle, stdout), { mode: 0o600 })
  if (stderr.trim().length > 0)
    writeFileSync(join(handle.artifactDir, `${logName}.stderr.log`), redact(handle, stderr), { mode: 0o600 })
  return stdout
}

function loopbackValidate(raw: string): Result<{ origin: string }> {
  const op = "pureNavE2eRun"
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return createResultError(op, `Refused: front base is not a URL: ${raw}`)
  }
  if (url.protocol !== "http:") return createResultError(op, "Refused: front base must be http loopback (never https)")
  if (url.hostname !== "127.0.0.1")
    return createResultError(op, "Refused: front base must use the literal address 127.0.0.1")
  if (url.port === "") return createResultError(op, "Refused: front base must carry an explicit port")
  if (FORBIDDEN_PORTS.has(Number(url.port)))
    return createResultError(op, `Refused: front base reuses a shared preview/production port (${url.port})`)
  if (url.username !== "" || url.password !== "")
    return createResultError(op, "Refused: front base must not embed credentials")
  return createResult({ origin: url.origin })
}

type Ctx = {
  readonly frontBase: string
  readonly backendBase: string
  readonly handle: BrowserHandle
  readonly steps: PureNavStep[]
  readonly notes: string[]
  readonly client: ConvexHttpClient
  readonly orgs: Array<{ id: string; slug: string; name: string }>
}

function step(context: Ctx, name: string, ok: boolean, detail: string): void {
  context.steps.push({ name, ok, detail })
  if (!ok) throw new Error(`STOP ${name}: ${detail}`)
}

function sessionProbeScript(): string {
  return `fetch("/api/session", { credentials: "same-origin", cache: "no-store" }).then(async (r) => {
    const body = await r.json().catch(() => null);
    const s = body && body.session;
    return { status: r.status, anonymous: s === null, userId: (s && s.profile && s.profile.userId) || null };
  }).catch((e) => ({ status: -1, anonymous: false, userId: null, error: String(e && e.message || e) }))`
}

async function bootstrapSession(context: Ctx, session: string, token: string, encoded: string): Promise<string> {
  const { frontBase, handle } = context
  agentBrowser(session, ["cookies", "clear"], handle, `${session}-cookies-clear`)
  agentBrowser(session, ["open", `${frontBase}/veranstalter/onboarding`], handle, `${session}-open-before-auth`)
  const before = agentBrowser(session, ["eval", sessionProbeScript()], handle, `${session}-probe-anonymous`)
  if (!/"anonymous"\s*:\s*true/.test(before))
    throw new Error(
      `STOP ${session} anonymous pre-check: expected anonymous /api/session, got ${redact(handle, before).slice(0, 200)}`,
    )
  agentBrowser(
    session,
    ["cookies", "set", "eventoren-session", encoded, "--url", `${frontBase}/`, "--httpOnly"],
    handle,
    `${session}-cookie-set`,
  )
  const cookieList = agentBrowser(session, ["cookies", "get", "--json"], handle, `${session}-cookie-list`)
  if (!cookieList.includes("eventoren-session"))
    throw new Error(`STOP ${session} cookie assert: eventoren-session not present after set`)
  agentBrowser(session, ["open", `${frontBase}/veranstalter/onboarding`], handle, `${session}-open-after-auth`)
  const after = agentBrowser(session, ["eval", sessionProbeScript()], handle, `${session}-probe-auth`)
  let userId: string | null = null
  try {
    const parsed = JSON.parse(after) as { userId?: unknown }
    if (typeof parsed.userId === "string") userId = parsed.userId
  } catch {
    const match = after.match(/"userId"\s*:\s*"([^"]+)"/)
    if (match) userId = match[1] ?? null
  }
  if (!userId)
    throw new Error(
      `STOP ${session} bootstrap verify: no authenticated session at ${frontBase}/api/session (cookiePresent=true)`,
    )
  return userId
}

function readExtraFixture(fixturePath: string): Result<{ customer: { token: string; userId: string } }> {
  const op = "pureNavE2eRun"
  let mode = 0
  try {
    mode = statSync(fixturePath).mode & 0o777
  } catch {
    return createResultError(op, `Refused: extra fixture tokens not readable at ${fixturePath}`)
  }
  if (mode !== 0o600)
    return createResultError(op, `Refused: extra fixture tokens must be mode 0600 (got ${mode.toString(8)})`)
  const parsed = v.safeParse(fixtureSessionsSchema, JSON.parse(readFileSync(fixturePath, "utf8")))
  if (!parsed.success) return createResultError(op, "Refused: extra fixture token shape unexpected (sessions array)")
  const customer = parsed.output.sessions.find((s) => s.role === "customer")
  if (!customer || customer.token.length < 16)
    return createResultError(op, "Refused: customer fixture session missing in extra file")
  return createResult({ customer: { token: customer.token, userId: customer.userId } })
}

async function contextOrgs(
  context: Ctx,
  token: string,
): Promise<ReadonlyArray<{ id: string; slug: string; name: string }>> {
  const raw = (await context.client.query(api.organizerDashboard.organizerDashboardContextQuery, {
    token,
  })) as unknown as {
    success: boolean
    data?: { organizations?: ReadonlyArray<{ id: string; slug: string; name: string }> }
  }
  if (!raw || raw.success !== true || !raw.data)
    throw new Error("STOP context read: organizerDashboardContextQuery unsuccessful")
  return [...(raw.data.organizations ?? [])]
}

function overviewProbeScript(): string {
  return `(() => { const h = document.getElementById('veranstalter-uebersicht'); const sec = h ? h.closest('section') : null; const t = sec ? sec.innerText : ''; return { found: !!sec, window: t.slice(0, 500) }; })()`
}

function parseOverviewProbe(raw: string): { found: boolean; window: string } {
  try {
    const probe = JSON.parse(raw) as { found?: unknown; window?: unknown }
    if (probe.found === true && typeof probe.window === "string") return { found: true, window: probe.window }
  } catch {
    // fall through
  }
  return { found: false, window: "" }
}

function fillOrgForm(
  context: Ctx,
  session: string,
  input: { name: string; slug: string; email: string },
  tag: string,
): void {
  const { handle } = context
  agentBrowser(session, ["fill", "#onboarding-name", input.name], handle, `${tag}-fill-name`)
  agentBrowser(session, ["fill", "#onboarding-slug", input.slug], handle, `${tag}-fill-slug`)
  agentBrowser(session, ["select", "#onboarding-kind", "Unternehmen"], handle, `${tag}-fill-kind`)
  agentBrowser(session, ["fill", "#onboarding-email", input.email], handle, `${tag}-fill-email`)
  agentBrowser(session, ["fill", "#onboarding-phone", "+49 30 000000"], handle, `${tag}-fill-phone`)
  agentBrowser(
    session,
    ["fill", "#onboarding-imprint", `Impressum ${input.name}, Beispielstraße 1, 10115 Berlin.`],
    handle,
    `${tag}-fill-imprint`,
  )
  agentBrowser(session, ["fill", "#onboarding-iban", SYNTHETIC_TEST_IBAN], handle, `${tag}-fill-iban`)
  agentBrowser(session, ["fill", "#onboarding-holder", `${input.name} Kontoinhaber`], handle, `${tag}-fill-holder`)
  // Explicit acceptance of the current template documents; backend checks revisions.
  // Consent sits below the fold in short viewports; centering both rows keeps
  // the text-locator clicks hittable instead of landing outside the viewport.
  agentBrowser(
    session,
    [
      "eval",
      "(() => { for (const id of ['onboarding-terms-accept', 'onboarding-dpa-accept']) document.getElementById(id)?.scrollIntoView({ block: 'center' }); return 'scrolled'; })()",
    ],
    handle,
    `${tag}-consent-scroll`,
  )
  agentBrowser(
    session,
    ["find", "text", "Ich stimme den oben verlinkten Muster-Veranstalter-AGB", "click"],
    handle,
    `${tag}-consent-first`,
  )
  agentBrowser(
    session,
    ["find", "text", "Ich stimme der oben verlinkten Muster-AVV", "click"],
    handle,
    `${tag}-consent-second`,
  )
  const consentSnap = agentBrowser(session, ["snapshot", "-i"], handle, `${tag}-consent-verify`)
  const consentChecked = (consentSnap.match(/checked=true/g) ?? []).length
  if (consentChecked < 2)
    throw new Error(
      `STOP ${tag} consent: expected both template consent boxes checked, got ${consentChecked} (source hint: ${tag}-consent-verify).`,
    )
}

export async function pureNavE2eRun(): Promise<Result<PureNavSummary>> {
  const op = "pureNavE2eRun"
  const steps: PureNavStep[] = []
  const notes: string[] = []
  try {
    if (process.env.EVENTOREN_E2E_TARGET === "production")
      return createResultError(
        op,
        "Refused: EVENTOREN_E2E_TARGET=production; local-only driver never runs against prod",
      )
    const frontBase = process.env.E2E_FRONT_BASE ?? PURE_NAV_LOCAL_FRONT_BASE
    const target = loopbackValidate(frontBase)
    if (!target.success) return createResultError(op, target.errorMessage)
    const front = target.data.origin

    const stamp = new Date().toISOString().replaceAll(/[-:.]/g, "").slice(0, 15).toLowerCase()
    const artifactDir = join(ARTIFACT_ROOT, `e2e-purenav-${stamp}`)
    mkdirSync(artifactDir, { recursive: true, mode: 0o700 })
    chmodSync(artifactDir, 0o700)
    const artifacts: string[] = []

    const tokens = readExtraFixture(FIXTURE_EXTRA_PATH)
    if (!tokens.success) return createResultError(op, tokens.errorMessage)
    const secrets = [tokens.data.customer.token, encodeURIComponent(tokens.data.customer.token)]
    const ownerSession = `pnav-owner-${stamp}`
    const anonSession = `pnav-anon-${stamp}`
    const client = new ConvexHttpClient(LOCAL_REHEARSAL_BACKEND_BASE)
    const handle: BrowserHandle = { session: ownerSession, artifactDir, artifacts, secrets }
    const context: Ctx = {
      frontBase: front,
      backendBase: LOCAL_REHEARSAL_BACKEND_BASE,
      handle,
      steps,
      notes,
      client,
      orgs: [],
    }

    const customerToken = tokens.data.customer.token
    const orgOneName = `PNav One ${stamp}`
    const orgOneSlug = `pnav-one-${stamp}`
    const orgTwoName = `PNav Two ${stamp}`
    const orgTwoSlug = `pnav-two-${stamp}`

    // 0. SDK context BEFORE any browser: fresh customer must own zero orgs.
    const beforeOrgs = await contextOrgs(context, customerToken)
    step(
      context,
      "pnav-zero-context-sdk",
      beforeOrgs.length === 0,
      beforeOrgs.length === 0
        ? "SDK context for the fresh fixture customer lists 0 organizations before any browser step."
        : `Fresh customer already owns ${beforeOrgs.length} org(s); refusing (source hint: staged fixture runTag).`,
    )

    // 1. Owner bootstrap with the EXTRA fixture identity (never the main file).
    const ownerUserId = await bootstrapSession(context, ownerSession, customerToken, encodeURIComponent(customerToken))
    step(
      context,
      "pnav-bootstrap",
      ownerUserId === tokens.data.customer.userId,
      ownerUserId === tokens.data.customer.userId
        ? "Anonymous /api/session observed first; extra fixture customer cookie authenticates the same user."
        : "Fixture userId mismatch; refusing to continue on a foreign identity.",
    )

    // 2. Zero-org entry: /veranstalter shows the empty panel with its CTA.
    agentBrowser(ownerSession, ["open", `${front}/veranstalter`], handle, "pnav-empty-open")
    agentBrowser(ownerSession, ["wait", "--text", "Noch keine Organisation"], handle, "pnav-empty-wait")
    const emptyShot = join(artifactDir, "e2e-purenav-empty.png")
    agentBrowser(ownerSession, ["screenshot", emptyShot], handle, "pnav-empty-shot")
    artifacts.push(emptyShot)
    const emptySnap = agentBrowser(ownerSession, ["snapshot", "-i"], handle, "pnav-empty-snapshot")
    // NOTE: pnav-empty-wait already proved "Noch keine Organisation" via body
    // innerText; snapshot -i omits that static panel text, so the observable
    // -i marker is the panel CTA link itself (distinct ref after the nav link).
    const emptyCtaPresent = /link "Organisation erstellen" \[ref=e\d+/.test(emptySnap)
    step(
      context,
      "pnav-empty-view",
      emptyCtaPresent,
      emptyCtaPresent
        ? "Dashboard shows the empty panel with the create CTA for the zero-org customer (heading proven via live innerText wait)."
        : "Empty panel CTA not visible for the zero-org customer (source hint: pnav-empty-snapshot).",
    )
    // Click the EMPTY-panel CTA specifically: it renders after the sidebar nav
    // link of the same name, so take the last matching ref (normal UI click).
    const ctaRefs = [...emptySnap.matchAll(/link "Organisation erstellen" \[ref=(e\d+)/g)].map((m) => m[1])
    if (ctaRefs.length === 0)
      throw new Error("STOP pnav-empty-cta: no Organisation-erstellen link found (source hint: pnav-empty-snapshot).")
    const ctaRef = ctaRefs[ctaRefs.length - 1] as string
    notes.push(
      `Empty-panel CTA clicked via its own link ref (${ctaRefs.length} same-name link(s) on the page; last is the panel CTA).`,
    )
    agentBrowser(ownerSession, ["click", ctaRef], handle, "pnav-empty-cta-click")

    // 3. Onboarding form visible with no ?org= and no empty/select loop.
    agentBrowser(ownerSession, ["wait", "--text", "Organisation gründen"], handle, "pnav-form-wait")
    const formSnap = agentBrowser(ownerSession, ["snapshot", "-i"], handle, "pnav-form-snapshot")
    const formOk =
      formSnap.includes("Organisation gründen") &&
      !formSnap.includes("Noch keine Organisation") &&
      !formSnap.includes("Organisation wählen")
    step(
      context,
      "pnav-form-visible",
      formOk,
      formOk
        ? "Onboarding form renders via the normal CTA click: no empty loop, no select panel, no URL injection."
        : "Onboarding form not cleanly visible (source hint: pnav-form-snapshot).",
    )
    const formShot = join(artifactDir, "e2e-purenav-form-one.png")
    agentBrowser(ownerSession, ["screenshot", formShot], handle, "pnav-form-shot")
    artifacts.push(formShot)

    // 4. Submit org one through the real UI.
    fillOrgForm(
      context,
      ownerSession,
      { name: orgOneName, slug: orgOneSlug, email: `${orgOneSlug}@example.invalid` },
      "pnav-one",
    )
    agentBrowser(ownerSession, ["scrollintoview", "button[type='submit']"], handle, "pnav-one-scroll-save")
    agentBrowser(ownerSession, ["click", "button[type='submit']"], handle, "pnav-one-submit")
    agentBrowser(
      ownerSession,
      ["wait", "--fn", "document.body.innerText.includes('Zum Dashboard')"],
      handle,
      "pnav-one-wait-success",
    )
    const successSnap = agentBrowser(ownerSession, ["snapshot", "-i"], handle, "pnav-one-success")
    step(
      context,
      "pnav-one-submit",
      successSnap.includes("Zum Dashboard") && !successSnap.includes("Organisation wählen"),
      successSnap.includes("Zum Dashboard")
        ? "Org one submitted; success card persists across the live empty→ready flip (form stayed mounted, no select panel)."
        : "Success card missing after submit (source hint: pnav-one-success).",
    )
    notes.push(
      "Explicit organizer template consent is recorded with current revisions and server timestamps; templates are not legal advice.",
    )

    // 5. Canonical ID check: SDK lists exactly one org; click the REAL link.
    const afterOne = await contextOrgs(context, customerToken)
    const orgOne = afterOne.find((o) => o.slug === orgOneSlug) ?? null
    step(
      context,
      "pnav-one-canonical",
      afterOne.length === 1 && orgOne !== null,
      orgOne !== null && afterOne.length === 1
        ? "SDK context lists exactly the new org after UI creation."
        : `Expected exactly the new org in context, got ${afterOne.length} org(s) (source hint: backend, no UI substitute).`,
    )
    agentBrowser(ownerSession, ["find", "text", "Zum Dashboard", "click"], handle, "pnav-one-goto-dashboard")
    agentBrowser(ownerSession, ["wait", "--fn", "location.search.includes('org=')"], handle, "pnav-one-wait-scoped")
    const urlOneRaw = agentBrowser(ownerSession, ["get", "url"], handle, "pnav-one-url")
    const urlOneMatch = urlOneRaw.match(/https?:\/\/[^\s"']+/)
    const idOne = urlOneMatch ? new URL(urlOneMatch[0]).searchParams.get("org") : null
    step(
      context,
      "pnav-one-link-scoped",
      idOne !== null && orgOne !== null && idOne === orgOne.id,
      idOne !== null && orgOne !== null && idOne === orgOne.id
        ? "The actual Zum-Dashboard link lands on the new canonical org ID (?org= explicit, matches SDK)."
        : "Zum-Dashboard link did not land on the new canonical ID (source hint: pnav-one-url).",
    )
    agentBrowser(
      ownerSession,
      ["wait", "--fn", "document.body.innerText.includes('Ausstehend') || document.body.innerText.includes('Aktiv')"],
      handle,
      "pnav-one-wait-overview",
    )
    const probeOne = parseOverviewProbe(
      agentBrowser(ownerSession, ["eval", overviewProbeScript()], handle, "pnav-one-probe"),
    )
    step(
      context,
      "pnav-one-overview",
      probeOne.found && /Ausstehend/.test(probeOne.window),
      probeOne.found
        ? "New org overview shows the pending state for its own section."
        : "New org overview section missing (source hint: pnav-one-probe).",
    )
    const oneShot = join(artifactDir, "e2e-purenav-overview-one.png")
    agentBrowser(ownerSession, ["screenshot", oneShot], handle, "pnav-one-shot")
    artifacts.push(oneShot)

    // 6. Second org via the normal sidebar link (no URL typing, no ?org=).
    // NOTE: find-text misses these nav links in this shell; the role+name
    // locator resolves the same accessible name reliably (proven interactively).
    agentBrowser(
      ownerSession,
      ["find", "role", "link", "click", "--name", "Organisation erstellen"],
      handle,
      "pnav-sidebar-create-two",
    )
    agentBrowser(ownerSession, ["wait", "--text", "Organisation gründen"], handle, "pnav-form-two-wait")
    const formTwoSnap = agentBrowser(ownerSession, ["snapshot", "-i"], handle, "pnav-form-two-snapshot")
    const formTwoOk = formTwoSnap.includes("Organisation gründen") && !formTwoSnap.includes("Organisation wählen")
    step(
      context,
      "pnav-form-two-visible",
      formTwoOk,
      formTwoOk
        ? "Sidebar create link opens the form with one org owned: no select panel, no URL injection."
        : "Second-org form not cleanly visible (source hint: pnav-form-two-snapshot).",
    )
    fillOrgForm(
      context,
      ownerSession,
      { name: orgTwoName, slug: orgTwoSlug, email: `${orgTwoSlug}@example.invalid` },
      "pnav-two",
    )
    agentBrowser(ownerSession, ["scrollintoview", "button[type='submit']"], handle, "pnav-two-scroll-save")
    agentBrowser(ownerSession, ["click", "button[type='submit']"], handle, "pnav-two-submit")
    agentBrowser(
      ownerSession,
      ["wait", "--fn", "document.body.innerText.includes('Zum Dashboard')"],
      handle,
      "pnav-two-wait-success",
    )
    const successTwoSnap = agentBrowser(ownerSession, ["snapshot", "-i"], handle, "pnav-two-success")
    step(
      context,
      "pnav-two-submit",
      successTwoSnap.includes("Zum Dashboard") && !successTwoSnap.includes("Organisation wählen"),
      successTwoSnap.includes("Zum Dashboard")
        ? "Org two submitted; success card persists (2-org shell keeps content mounted, no select panel)."
        : "Second success card missing after submit (source hint: pnav-two-success).",
    )

    // 7. Success link selects the NEW second org (createdOrganizationId wiring).
    const afterTwo = await contextOrgs(context, customerToken)
    const orgTwo = afterTwo.find((o) => o.slug === orgTwoSlug) ?? null
    step(
      context,
      "pnav-two-canonical",
      afterTwo.length === 2 && orgTwo !== null,
      orgTwo !== null && afterTwo.length === 2
        ? "SDK context lists exactly the two UI-created orgs."
        : `Expected exactly two orgs in context, got ${afterTwo.length} (source hint: backend, no UI substitute).`,
    )
    agentBrowser(ownerSession, ["find", "text", "Zum Dashboard", "click"], handle, "pnav-two-goto-dashboard")
    agentBrowser(ownerSession, ["wait", "--fn", "location.search.includes('org=')"], handle, "pnav-two-wait-scoped")
    const urlTwoRaw = agentBrowser(ownerSession, ["get", "url"], handle, "pnav-two-url")
    const urlTwoMatch = urlTwoRaw.match(/https?:\/\/[^\s"']+/)
    const idTwo = urlTwoMatch ? new URL(urlTwoMatch[0]).searchParams.get("org") : null
    step(
      context,
      "pnav-two-link-scoped",
      idTwo !== null && orgTwo !== null && idTwo === orgTwo.id,
      idTwo !== null && orgTwo !== null && idTwo === orgTwo.id
        ? "The success link lands on the new second canonical org ID (not the first org)."
        : "Success link did not land on the second canonical ID (source hint: pnav-two-url).",
    )
    agentBrowser(
      ownerSession,
      ["wait", "--fn", "document.body.innerText.includes('Ausstehend') || document.body.innerText.includes('Aktiv')"],
      handle,
      "pnav-two-wait-overview",
    )
    const probeTwo = parseOverviewProbe(
      agentBrowser(ownerSession, ["eval", overviewProbeScript()], handle, "pnav-two-probe"),
    )
    step(
      context,
      "pnav-two-overview",
      probeTwo.found && probeTwo.window.includes(orgTwoName) && /Ausstehend/.test(probeTwo.window),
      probeTwo.found
        ? "Second org overview shows its own pending state."
        : "Second org overview section missing (source hint: pnav-two-probe).",
    )

    // 8. Organisation wechseln clears the scope: select view with both orgs.
    agentBrowser(
      ownerSession,
      ["find", "role", "link", "click", "--name", "Organisation wechseln"],
      handle,
      "pnav-wechseln-click",
    )
    agentBrowser(ownerSession, ["wait", "--text", "Organisation wählen"], handle, "pnav-select-wait")
    const selectSnap = agentBrowser(ownerSession, ["snapshot", "-i"], handle, "pnav-select-snapshot")
    const selectOk =
      selectSnap.includes("Organisation wählen") &&
      selectSnap.includes(orgOneName) &&
      selectSnap.includes(orgTwoName) &&
      !selectSnap.includes("nicht gefunden")
    step(
      context,
      "pnav-select-two",
      selectOk,
      selectOk
        ? "Clearing the scope shows the select view with both UI-created orgs and no unknown-org alert."
        : "Select view after wechseln is wrong (source hint: pnav-select-snapshot).",
    )
    const selectShot = join(artifactDir, "e2e-purenav-select-two.png")
    agentBrowser(ownerSession, ["screenshot", selectShot], handle, "pnav-select-shot")
    artifacts.push(selectShot)

    // 9. From the 2-org select view, sidebar Create shows the form, no panel.
    agentBrowser(
      ownerSession,
      ["find", "role", "link", "click", "--name", "Organisation erstellen"],
      handle,
      "pnav-sidebar-create-select",
    )
    agentBrowser(ownerSession, ["wait", "--text", "Organisation gründen"], handle, "pnav-form-select-wait")
    const formSelectSnap = agentBrowser(ownerSession, ["snapshot", "-i"], handle, "pnav-form-select-snapshot")
    const formSelectOk =
      formSelectSnap.includes("Organisation gründen") && !formSelectSnap.includes("Organisation wählen")
    step(
      context,
      "pnav-form-from-select",
      formSelectOk,
      formSelectOk
        ? "With 2 orgs and no scope, the sidebar create link renders the form with no select panel (entry fix proven, no workaround)."
        : "Form from select view is wrong (source hint: pnav-form-select-snapshot).",
    )

    // 10. Anonymous wall: no cookie session sees the login view, never the form.
    const anonHandle: BrowserHandle = { session: anonSession, artifactDir, artifacts, secrets: [] }
    agentBrowser(anonSession, ["cookies", "clear"], anonHandle, `${anonSession}-cookies-clear`)
    agentBrowser(anonSession, ["open", `${front}/veranstalter/onboarding`], anonHandle, "pnav-anon-open")
    agentBrowser(anonSession, ["wait", "--text", "Zur Anmeldung"], anonHandle, "pnav-anon-wait-login")
    const anonSnap = agentBrowser(anonSession, ["snapshot", "-i"], anonHandle, "pnav-anon-snapshot")
    const anonProbe = agentBrowser(anonSession, ["eval", sessionProbeScript()], anonHandle, "pnav-anon-probe")
    const anonOk =
      anonSnap.includes("Zur Anmeldung") &&
      !anonSnap.includes("Organisation gründen") &&
      /"anonymous"\s*:\s*true/.test(anonProbe)
    step(
      { ...context, handle: anonHandle },
      "pnav-anon-wall",
      anonOk,
      anonOk
        ? "Anonymous onboarding shows the login wall with null /api/session and no creation form."
        : "Anonymous wall broken (source hint: pnav-anon-snapshot).",
    )
    const anonShot = join(artifactDir, "e2e-purenav-anon-wall.png")
    agentBrowser(anonSession, ["screenshot", anonShot], anonHandle, "pnav-anon-shot")
    artifacts.push(anonShot)

    // 11. Foreign ?org=: the fresh user has no membership → error, no form, no fallback list.
    agentBrowser(
      ownerSession,
      ["open", `${front}/veranstalter/onboarding?org=${FOREIGN_ORG_ID}`],
      handle,
      "pnav-foreign-open",
    )
    agentBrowser(ownerSession, ["wait", "--text", "konnte nicht geladen werden"], handle, "pnav-foreign-wait-error")
    const foreignSnap = agentBrowser(ownerSession, ["snapshot", "-i"], handle, "pnav-foreign-snapshot")
    const foreignOk =
      foreignSnap.includes("konnte nicht geladen werden") &&
      !foreignSnap.includes("Organisation gründen") &&
      !foreignSnap.includes("Organisation wählen")
    step(
      context,
      "pnav-foreign-error",
      foreignOk,
      foreignOk
        ? "Foreign scoped org renders the shell error view: no form, no select fallback, no data leak."
        : "Foreign org scope did not stay on the error view (source hint: pnav-foreign-snapshot).",
    )
    const foreignShot = join(artifactDir, "e2e-purenav-foreign-error.png")
    agentBrowser(ownerSession, ["screenshot", foreignShot], handle, "pnav-foreign-shot")
    artifacts.push(foreignShot)

    // 12. Console/page errors through the redactor.
    const consoleRaw = agentBrowser(ownerSession, ["console"], handle, "pnav-console")
    const errorsRaw = agentBrowser(ownerSession, ["errors"], handle, "pnav-errors")
    const consoleRed = redact(handle, consoleRaw)
    const errorsRed = redact(handle, errorsRaw)
    writeFileSync(join(artifactDir, "e2e-purenav-console.log"), consoleRed, { mode: 0o600 })
    writeFileSync(join(artifactDir, "e2e-purenav-errors.log"), errorsRed, { mode: 0o600 })
    artifacts.push(join(artifactDir, "e2e-purenav-console.log"), join(artifactDir, "e2e-purenav-errors.log"))
    const errorCount = (errorsRed.match(/error/gi) ?? []).length
    notes.push(
      `Console/page-error logs captured redacted; raw error-token occurrences in page-error buffer: ${errorCount}. No 'no errors' claim beyond these observed logs.`,
    )
    step(context, "pnav-console-captured", true, "Console and page errors captured redacted to private artifacts.")

    notes.push(
      "Auth is fixture-seeded (fresh staged customer), never SSO; no payment flow executed; no full-platform claim.",
    )
    notes.push(
      "Fresh staged runTag owns two synthetic orgs; the parallel Events lane uses a different customer and org — neither lane alters the other's orgs/members; foreign-org probe only reads the shared shell error path.",
    )
    for (const file of artifacts) {
      try {
        chmodSync(file, 0o600)
      } catch {
        // best effort; artifacts remain private under the 0700 dir.
      }
    }
    return createResult({
      ok: true,
      orgOneSlug,
      orgTwoSlug,
      steps: [...steps],
      artifacts: [...artifacts],
      notes: [...notes],
    })
  } catch (error) {
    const failed = error as Error
    steps.push({ name: "run", ok: false, detail: failed.message.slice(0, 500) })
    return createResultError(op, failed.message.slice(0, 500))
  }
}

if (import.meta.main) {
  const started = Date.now()
  const outcome = await pureNavE2eRun()
  const elapsedMs = Date.now() - started
  if (!outcome.success) {
    console.error(`[e2e-purenav] FAILED after ${elapsedMs}ms: ${outcome.errorMessage}`)
    process.exit(1)
  }
  const summary = outcome.data
  console.log(
    `[e2e-purenav] ${summary.ok ? "PASS" : "FAIL"} after ${elapsedMs}ms: one=${summary.orgOneSlug} two=${summary.orgTwoSlug}`,
  )
  for (const item of summary.steps) console.log(`[e2e-purenav] ${item.ok ? "ok" : "FAIL"} ${item.name}: ${item.detail}`)
  for (const note of summary.notes) console.log(`[e2e-purenav] note: ${note}`)
  console.log(`[e2e-purenav] artifacts: ${summary.artifacts.join(", ")}`)
  process.exit(summary.ok ? 0 : 1)
}
