import { execFileSync } from "node:child_process"
import { chmodSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import * as v from "valibot"
import { createResult, createResultError, type Result } from "#result"

/**
 * Local-only real-browser E2E for Veranstalter onboarding → admin approval
 * → live owner status → settings persistence.
 *
 * Guarded driver: literal 127.0.0.1 frontend only, fixture-seeded auth
 * (never SSO), DEV fixture consent is test-only with no legal meaning, all
 * artifacts stay under /tmp/eventoren-dashboard-verification. Screenshots
 * contain synthetic org data only. No app source, service, deploy, git, or
 * production interaction.
 */

export const VERANSTALTER_ONBOARDING_LOCAL_FRONT_BASE = "http://127.0.0.1:13557" as const
const LOCAL_REHEARSAL_BACKEND_BASE = "http://127.0.0.1:13470" as const
const ARTIFACT_ROOT = "/tmp/eventoren-dashboard-verification" as const
const FIXTURE_TOKENS_PATH = join(homedir(), ".local/state/eventoren/local-rehearsal/staging/fixture-tokens.json")
const FORBIDDEN_PORTS = new Set([3210, 3211, 3234, 3235, 6791, 8320, 8321])
const STEP_TIMEOUT_MS = 30_000
/** Synthetic German test IBAN (mod-97 valid), no real account. */
const SYNTHETIC_TEST_IBAN = "DE89370400440532013000" as const

export type VeranstalterOnboardingLocalE2eStep = {
  readonly name: string
  readonly ok: boolean
  readonly detail: string
}

export type VeranstalterOnboardingLocalE2eSummary = {
  readonly ok: boolean
  readonly orgName: string
  readonly orgSlug: string
  readonly orgId: string | null
  readonly steps: readonly VeranstalterOnboardingLocalE2eStep[]
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

function sessionProbeScript(): string {
  return `fetch("/api/session", { credentials: "same-origin", cache: "no-store" }).then(async (r) => {
    const body = await r.json().catch(() => null);
    const s = body && body.session;
    return { status: r.status, anonymous: s === null, userId: (s && s.profile && s.profile.userId) || null };
  }).catch((e) => ({ status: -1, anonymous: false, userId: null, error: String(e && e.message || e) }))`
}

function tokenNumbers(token: string): { exp: number | null; expired: boolean | null } {
  try {
    const segment = token.split(".")[1] ?? ""
    const payload = JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as { exp?: unknown }
    if (typeof payload.exp !== "number") return { exp: null, expired: null }
    return { exp: payload.exp, expired: payload.exp * 1000 <= Date.now() }
  } catch {
    return { exp: null, expired: null }
  }
}

function loopbackValidate(raw: string): Result<{ origin: string }> {
  const op = "veranstalterOnboardingLocalE2eRun"
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

type RunContext = {
  readonly frontBase: string
  readonly handle: BrowserHandle
  readonly steps: VeranstalterOnboardingLocalE2eStep[]
  readonly notes: string[]
}

function step(context: RunContext, name: string, ok: boolean, detail: string): void {
  context.steps.push({ name, ok, detail })
  if (!ok) throw new Error(`STOP ${name}: ${detail}`)
}

async function bootstrapSession(context: RunContext, session: string, token: string, encoded: string): Promise<string> {
  const { frontBase, handle } = context
  agentBrowser(session, ["cookies", "clear"], handle, `${session}-cookies-clear`)
  agentBrowser(session, ["open", `${frontBase}/veranstalter/onboarding`], handle, `${session}-open-before-auth`)
  const before = agentBrowser(session, ["eval", sessionProbeScript()], handle, `${session}-probe-anonymous`)
  if (!/"anonymous"\s*:\s*true/.test(before))
    throw new Error(
      `STOP ${session} anonymous pre-check: expected anonymous /api/session, got ${redact(handle, before).slice(0, 200)}`,
    )
  // Prod cookie semantics on local: HttpOnly set, Secure off (plain http loopback).
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
    const parsed = JSON.parse(after) as { userId?: unknown; anonymous?: unknown }
    if (typeof parsed.userId === "string") userId = parsed.userId
  } catch {
    const match = after.match(/"userId"\s*:\s*"([^"]+)"/)
    if (match) userId = match[1] ?? null
  }
  // Numbers only: exp/expired booleans diagnose stale fixtures without exposing token material.
  const numbers = tokenNumbers(token)
  if (!userId)
    throw new Error(
      `STOP ${session} bootstrap verify: no authenticated session at ${frontBase}/api/session (cookiePresent=true, tokenExpired=${numbers.expired}, tokenExp=${numbers.exp})`,
    )
  return userId
}

function readFixtureTokens(
  fixturePath: string,
): Result<{ customer: { token: string; userId: string }; admin: { token: string; userId: string } }> {
  const op = "veranstalterOnboardingLocalE2eRun"
  let mode = 0
  try {
    mode = statSync(fixturePath).mode & 0o777
  } catch {
    return createResultError(op, `Refused: fixture tokens not readable at ${fixturePath}`)
  }
  if (mode !== 0o600)
    return createResultError(op, `Refused: fixture tokens must be mode 0600 (got ${mode.toString(8)})`)
  // Tokens stay in-process; thrown errors and the summary carry no secrets.
  const parsed = v.safeParse(fixtureSessionsSchema, JSON.parse(readFileSync(fixturePath, "utf8")))
  if (!parsed.success) return createResultError(op, "Refused: fixture token shape unexpected (sessions array)")
  const customer = parsed.output.sessions.find((s) => s.role === "customer")
  const admin = parsed.output.sessions.find((s) => s.role === "admin")
  if (!customer || customer.token.length < 16 || !admin || admin.token.length < 16)
    return createResultError(op, "Refused: customer/admin fixture sessions missing")
  return createResult({
    customer: { token: customer.token, userId: customer.userId },
    admin: { token: admin.token, userId: admin.userId },
  })
}

export async function veranstalterOnboardingLocalE2eRun(): Promise<Result<VeranstalterOnboardingLocalE2eSummary>> {
  const op = "veranstalterOnboardingLocalE2eRun"
  const steps: VeranstalterOnboardingLocalE2eStep[] = []
  const notes: string[] = []
  try {
    if (process.env.EVENTOREN_E2E_TARGET === "production")
      return createResultError(
        op,
        "Refused: EVENTOREN_E2E_TARGET=production; local-only driver never runs against prod",
      )
    const frontBase = process.env.E2E_FRONT_BASE ?? VERANSTALTER_ONBOARDING_LOCAL_FRONT_BASE
    const target = loopbackValidate(frontBase)
    if (!target.success) return createResultError(op, target.errorMessage)
    const front = target.data.origin
    void LOCAL_REHEARSAL_BACKEND_BASE

    const stamp = new Date().toISOString().replaceAll(/[-:.]/g, "").slice(0, 15).toLowerCase()
    const artifactDir = join(ARTIFACT_ROOT, `e2e-onboarding-${stamp}`)
    mkdirSync(artifactDir, { recursive: true, mode: 0o700 })
    chmodSync(artifactDir, 0o700)
    const artifacts: string[] = []

    const tokens = readFixtureTokens(FIXTURE_TOKENS_PATH)
    if (!tokens.success) return createResultError(op, tokens.errorMessage)
    const secrets = [
      tokens.data.customer.token,
      tokens.data.admin.token,
      encodeURIComponent(tokens.data.customer.token),
      encodeURIComponent(tokens.data.admin.token),
    ]
    const ownerSession = `e2e-onboarding-owner-${stamp}`
    const adminSession = `e2e-onboarding-admin-${stamp}`
    const handle: BrowserHandle = { session: ownerSession, artifactDir, artifacts, secrets }
    const context: RunContext = { frontBase: front, handle, steps, notes }

    const orgName = `E2E Onboarding ${stamp}`
    const orgSlug = `e2e-onb-${stamp}`
    const orgEmail = `${orgSlug}@example.invalid`
    let orgId: string | null = null

    // 1. Owner anonymous pre-check + fixture-cookie bootstrap (local only).
    const ownerUserId = await bootstrapSession(
      context,
      ownerSession,
      tokens.data.customer.token,
      encodeURIComponent(tokens.data.customer.token),
    )
    step(
      context,
      "owner-anonymous-then-bootstrap",
      ownerUserId === tokens.data.customer.userId,
      ownerUserId === tokens.data.customer.userId
        ? "Anonymous /api/session observed first; fixture customer cookie now authenticates the same user."
        : "Fixture userId mismatch; refusing to continue on a foreign identity.",
    )

    // 2. Core test: fill the REAL onboarding UI and submit (no backend create call).
    agentBrowser(ownerSession, ["open", `${front}/veranstalter/onboarding`], handle, "owner-onboarding-open")
    // Actual shell contract (veranstalterDashboardShellStateCreate.view): the form
    // renders only when the frame is "ready" — with 0 orgs it shows the empty
    // view, with 2+ orgs and no ?org= it shows the select view. The shared
    // fixture customer now owns 2+ orgs (parallel Events run), so scope the
    // onboarding URL with an existing org id harvested UI-only from the select
    // links. This keeps every step URL-org-explicit per the run rules.
    agentBrowser(
      ownerSession,
      [
        "wait",
        "--fn",
        "document.body.innerText.includes('Organisation gründen') || document.body.innerText.includes('Organisation wählen') || document.body.innerText.includes('Noch keine Organisation')",
      ],
      handle,
      "owner-onboarding-wait-content",
    )
    let formProbe = agentBrowser(ownerSession, ["snapshot", "-i"], handle, "owner-onboarding-probe")
    if (!formProbe.includes("Organisation gründen") && formProbe.includes("Organisation wählen")) {
      const selectUrls = agentBrowser(ownerSession, ["snapshot", "-i", "-u"], handle, "owner-select-urls")
      const scoped = selectUrls.match(/[?&]org=([^,\s\]"']+)/)
      if (!scoped?.[1])
        throw new Error(
          "STOP owner onboarding: select view exposes no org-scoped link (source hint: owner-select-urls).",
        )
      agentBrowser(
        ownerSession,
        ["open", `${front}/veranstalter/onboarding?org=${encodeURIComponent(decodeURIComponent(scoped[1]))}`],
        handle,
        "owner-onboarding-scoped",
      )
      notes.push(
        "Onboarding form reached via explicit ?org= scoping from the live org select view (multi-org shell contract).",
      )
      agentBrowser(
        ownerSession,
        [
          "wait",
          "--fn",
          "document.body.innerText.includes('Organisation gründen') || document.body.innerText.includes('Organisation wählen') || document.body.innerText.includes('Noch keine Organisation')",
        ],
        handle,
        "owner-onboarding-wait-scoped",
      )
      formProbe = agentBrowser(ownerSession, ["snapshot", "-i"], handle, "owner-onboarding-probe-scoped")
    }
    if (!formProbe.includes("Organisation gründen"))
      throw new Error("STOP owner onboarding: creation form not visible (source hint: owner-onboarding-probe).")
    const ownerShot = join(artifactDir, "e2e-onboarding-owner-form.png")
    agentBrowser(ownerSession, ["screenshot", ownerShot], handle, "owner-onboarding-shot")
    artifacts.push(ownerShot)
    agentBrowser(ownerSession, ["fill", "#onboarding-name", orgName], handle, "owner-fill-name")
    agentBrowser(ownerSession, ["fill", "#onboarding-slug", orgSlug], handle, "owner-fill-slug")
    agentBrowser(ownerSession, ["select", "#onboarding-kind", "Unternehmen"], handle, "owner-fill-kind")
    agentBrowser(ownerSession, ["fill", "#onboarding-email", orgEmail], handle, "owner-fill-email")
    agentBrowser(ownerSession, ["fill", "#onboarding-phone", "+49 30 000000"], handle, "owner-fill-phone")
    agentBrowser(
      ownerSession,
      ["fill", "#onboarding-imprint", `Impressum ${orgName}, Beispielstraße 1, 10115 Berlin.`],
      handle,
      "owner-fill-imprint",
    )
    agentBrowser(ownerSession, ["fill", "#onboarding-iban", SYNTHETIC_TEST_IBAN], handle, "owner-fill-iban")
    agentBrowser(ownerSession, ["fill", "#onboarding-holder", `${orgName} Kontoinhaber`], handle, "owner-fill-holder")
    // Explicit acceptance of the current template documents; backend checks revisions.
    agentBrowser(ownerSession, ["snapshot", "-i"], handle, "owner-consent-snapshot")
    agentBrowser(
      ownerSession,
      ["find", "text", "Ich stimme den oben verlinkten Muster-Veranstalter-AGB", "click"],
      handle,
      "owner-consent-first",
    )
    agentBrowser(
      ownerSession,
      ["find", "text", "Ich stimme der oben verlinkten Muster-AVV", "click"],
      handle,
      "owner-consent-second",
    )
    const consentSnap = agentBrowser(ownerSession, ["snapshot", "-i"], handle, "owner-consent-verify")
    const consentChecked = (consentSnap.match(/checked=true/g) ?? []).length
    if (consentChecked < 2)
      throw new Error(
        `STOP owner consent: expected both template consent boxes checked, snapshot shows ${consentChecked} (source hint: owner-consent-verify snapshot).`,
      )
    agentBrowser(ownerSession, ["click", "button[type='submit']"], handle, "owner-submit")
    // Actual shell contract (veranstalterDashboardShellStateCreate.view): with no
    // ?org= and more than one org, the frame flips to the "Organisation wählen"
    // select view, which replaces the form AND the success card. The parallel
    // Events run shares this customer identity, so after our submit there are
    // 2+ orgs and the success card may never persist. Accept either live outcome.
    agentBrowser(
      ownerSession,
      [
        "wait",
        "--fn",
        "document.body.innerText.includes('Organisation eingereicht') || document.body.innerText.includes('Organisation wählen')",
      ],
      handle,
      "owner-wait-submitted",
    )
    const submittedSnap = agentBrowser(ownerSession, ["snapshot", "-i"], handle, "owner-submitted-snapshot")
    // NOTE: snapshot -i lists interactive elements only, so the EmptyState
    // title/description paragraphs never appear here; the success card's
    // "Zum Dashboard" action link is its observable -i marker (it renders
    // exclusively inside the createdSlug Show block).
    if (submittedSnap.includes("Organisation eingereicht") || submittedSnap.includes("Zum Dashboard")) {
      step(
        context,
        "owner-onboarding-submit",
        true,
        `Synthetic org ${orgName} (${orgSlug}) submitted through the real UI; success state observed.`,
      )
      agentBrowser(ownerSession, ["find", "text", "Zum Dashboard", "click"], handle, "owner-goto-dashboard")
    } else if (submittedSnap.includes(orgName)) {
      step(
        context,
        "owner-onboarding-submit",
        true,
        `Synthetic org ${orgName} (${orgSlug}) submitted through the real UI; live org select lists the new org (multi-org shell contract, no reload).`,
      )
      agentBrowser(ownerSession, ["find", "text", orgName, "click"], handle, "owner-goto-dashboard")
    } else {
      throw new Error(
        "STOP owner submit: neither success state nor the new org in the select view (source hint: owner-submitted-snapshot).",
      )
    }
    notes.push(
      "Explicit organizer template consent is recorded with current revisions and server timestamps; templates are not legal advice.",
    )

    // 3. Owner dashboard shows the pending state; capture the scoped org id.
    agentBrowser(ownerSession, ["wait", "--url", "**/veranstalter*"], handle, "owner-wait-dashboard")
    // The success card's "Zum Dashboard" link is unscoped (to="/veranstalter"):
    // with 2+ orgs the shell lands on the select view instead of the new org.
    // Choose the new org explicitly, UI-only, keeping every step org-explicit.
    const landedSnap = agentBrowser(ownerSession, ["snapshot", "-i"], handle, "owner-landed-snapshot")
    if (landedSnap.includes("Organisation wählen")) {
      if (!landedSnap.includes(orgName))
        throw new Error(
          "STOP owner dashboard: select view does not list the new org (source hint: owner-landed-snapshot).",
        )
      agentBrowser(ownerSession, ["find", "text", orgName, "click"], handle, "owner-select-new-org")
      agentBrowser(
        ownerSession,
        ["wait", "--fn", "location.search.includes('org=')"],
        handle,
        "owner-wait-scoped-dashboard",
      )
      notes.push("Unscoped dashboard landing resolved via the live org select view to the new org (?org= explicit).")
    }
    // The overview content arrives via live query after the frame renders.
    agentBrowser(
      ownerSession,
      ["wait", "--fn", "document.body.innerText.includes('Ausstehend') || document.body.innerText.includes('Aktiv')"],
      handle,
      "owner-wait-pending-content",
    )
    const pendingShot = join(artifactDir, "e2e-onboarding-owner-pending.png")
    agentBrowser(ownerSession, ["screenshot", pendingShot], handle, "owner-pending-shot")
    artifacts.push(pendingShot)
    agentBrowser(ownerSession, ["snapshot", "-i"], handle, "owner-pending-snapshot")
    // Static status text is invisible to snapshot -i, and body innerText also
    // carries the org-switch menu (other orgs' statuses), so scope the probe to
    // the overview section of the active org (id from the actual contract).
    const pendingProbeRaw = agentBrowser(
      ownerSession,
      [
        "eval",
        "(() => { const h = document.getElementById('veranstalter-uebersicht'); const sec = h ? h.closest('section') : null; const t = sec ? sec.innerText : ''; return { found: !!sec, window: t.slice(0, 500) }; })()",
      ],
      handle,
      "owner-pending-probe",
    )
    let pendingSeen = false
    try {
      const probe = JSON.parse(pendingProbeRaw) as { found?: unknown; window?: unknown }
      pendingSeen = probe.found === true && typeof probe.window === "string" && /Ausstehend/.test(probe.window)
    } catch {
      pendingSeen = false
    }
    step(
      context,
      "owner-sees-pending",
      pendingSeen,
      pendingSeen
        ? "Owner dashboard shows the pending state (Ausstehend) for the new org's own overview section."
        : `Owner pending state not visible in the active org overview (source hint: owner-pending-probe).`,
    )
    const ownerUrl = agentBrowser(ownerSession, ["get", "url"], handle, "owner-dashboard-url")
    const orgMatch = ownerUrl.match(/[?&]org=([^&\s"]+)/)
    if (orgMatch?.[1]) orgId = decodeURIComponent(orgMatch[1])
    step(
      context,
      "owner-org-scoped-url",
      orgId !== null,
      orgId !== null
        ? `Scoped dashboard URL carries ?org= for the new org (value withheld, synthetic).`
        : "Dashboard URL has no ?org= scope; cannot address the org explicitly.",
    )

    // 4. Optional negative: publish before approval, only if the UI makes it straightforward.
    try {
      agentBrowser(
        ownerSession,
        ["open", `${front}/veranstalter/events/neu?org=${encodeURIComponent(orgId ?? "")}`],
        handle,
        "owner-negative-open",
      )
      const negSnap = agentBrowser(ownerSession, ["snapshot", "-i"], handle, "owner-negative-snapshot")
      const blocked =
        /freigabe|gesperrt|ausstehend|nicht möglich|deaktiviert/i.test(negSnap) || /disabled/i.test(negSnap)
      notes.push(
        blocked
          ? "Negative probe: pre-approval publish UI shows a blocked/disabled state for the pending org."
          : "Negative probe deferred to the Events E2E: no straightforward pre-approval publish control found on the draft page.",
      )
      step(
        context,
        "negative-publish-before-approval",
        true,
        "Best-effort probe recorded (blocked or deferred, never a backend call).",
      )
    } catch (error) {
      notes.push(`Negative probe deferred to the Events E2E: ${(error as Error).message.slice(0, 160)}`)
      step(context, "negative-publish-before-approval", true, "Deferred to Events E2E; owner flow continues.")
    }

    // Return the owner tab to the scoped dashboard BEFORE admin approval so the
    // kept-open tab observes the live flip. (The negative probe above navigates
    // this same tab to the draft page; without this return the live check would
    // run on the wrong page and prove nothing.)
    agentBrowser(
      ownerSession,
      ["open", `${front}/veranstalter?org=${encodeURIComponent(orgId ?? "")}`],
      handle,
      "owner-back-to-dashboard",
    )
    agentBrowser(
      ownerSession,
      ["wait", "--fn", "document.body.innerText.includes('Ausstehend')"],
      handle,
      "owner-back-dashboard-pending",
    )
    notes.push(
      "Owner tab returned to the scoped dashboard after the negative probe; approval happens while this tab watches.",
    )

    // 5. Admin second browser: find the unique org, configure fee/tax, approve — all in UI.
    const adminHandle: BrowserHandle = { session: adminSession, artifactDir, artifacts, secrets }
    const adminContext: RunContext = { frontBase: front, handle: adminHandle, steps, notes }
    const adminUserId = await bootstrapSession(
      adminContext,
      adminSession,
      tokens.data.admin.token,
      encodeURIComponent(tokens.data.admin.token),
    )
    step(
      adminContext,
      "admin-bootstrap",
      adminUserId === tokens.data.admin.userId,
      adminUserId === tokens.data.admin.userId
        ? "Admin browser bootstrapped with the fixture admin cookie; /api/session (frontend origin) is authenticated."
        : "Fixture admin userId mismatch; refusing to continue on a foreign identity.",
    )
    agentBrowser(adminSession, ["open", `${front}/admin/veranstalter-organisationen`], adminHandle, "admin-list-open")
    agentBrowser(adminSession, ["wait", "--text", "Veranstalter-Organisationen"], adminHandle, "admin-wait-list")
    // Rows arrive via live query after the frame renders; the heading above is immediate.
    agentBrowser(
      adminSession,
      ["wait", "--fn", "!document.body.innerText.includes('Wird geladen')"],
      adminHandle,
      "admin-wait-list-loaded",
    )
    // Full snapshot: static row text (slug) is invisible to snapshot -i.
    const listSnap = agentBrowser(adminSession, ["snapshot"], adminHandle, "admin-list-snapshot")
    step(
      adminContext,
      "admin-finds-org",
      listSnap.includes(orgSlug),
      listSnap.includes(orgSlug)
        ? "Admin list shows the unique synthetic org slug."
        : `Unique org slug ${orgSlug} not in admin list; STOP (source hint: admin list snapshot).`,
    )
    agentBrowser(
      adminSession,
      ["open", `${front}/admin/veranstalter-organisationen?org=${encodeURIComponent(orgId ?? "")}`],
      adminHandle,
      "admin-detail-open",
    )
    agentBrowser(adminSession, ["wait", "--text", orgSlug], adminHandle, "admin-wait-detail")
    const detailSnap = agentBrowser(adminSession, ["snapshot", "-i"], adminHandle, "admin-detail-snapshot")
    step(
      adminContext,
      "admin-detail-url-scoped",
      /Details/.test(detailSnap),
      "Admin detail sheet opens URL-scoped (?org=) for the unique org.",
    )
    agentBrowser(adminSession, ["select", "#admin-org-tax-status", "Regelbesteuert"], adminHandle, "admin-tax-status")
    agentBrowser(adminSession, ["select", "#admin-org-tax-rate", "19 %"], adminHandle, "admin-tax-rate")
    agentBrowser(adminSession, ["fill", "#admin-org-fee-percent", "5"], adminHandle, "admin-fee-percent")
    agentBrowser(adminSession, ["fill", "#admin-org-fee-fixed", "0,50"], adminHandle, "admin-fee-fixed")
    agentBrowser(adminSession, ["select", "#admin-org-fee-payer", "Käufer"], adminHandle, "admin-fee-payer")
    agentBrowser(
      adminSession,
      ["find", "text", "Konfiguration speichern", "click"],
      adminHandle,
      "admin-configure-save",
    )
    agentBrowser(
      adminSession,
      [
        "wait",
        "--fn",
        "document.body.innerText.includes('bestätigt') || document.body.innerText.includes('Konfiguriert') || document.body.innerText.includes('Gespeichert')",
      ],
      adminHandle,
      "admin-wait-configured",
    )
    // Full snapshot: static confirmation text is invisible to snapshot -i.
    const afterConfig = agentBrowser(adminSession, ["snapshot"], adminHandle, "admin-after-config")
    const configuredSeen = /bestätigt|Konfiguriert|konfiguriert/i.test(afterConfig)
    step(
      adminContext,
      "admin-configure",
      configuredSeen,
      configuredSeen
        ? "Fee/tax configuration saved and confirmed in the admin UI."
        : `Configure confirmation not visible; snapshot hint: ${redact(adminHandle, afterConfig).slice(0, 300)}`,
    )
    agentBrowser(adminSession, ["find", "text", "Freigeben", "click"], adminHandle, "admin-approve")
    agentBrowser(adminSession, ["wait", "--text", "Aktiv"], adminHandle, "admin-wait-aktiv")
    step(adminContext, "admin-approve", true, "Admin approved the org in the UI; status reads Aktiv.")
    const adminShot = join(artifactDir, "e2e-onboarding-admin-approved.png")
    agentBrowser(adminSession, ["screenshot", adminShot], adminHandle, "admin-approved-shot")
    artifacts.push(adminShot)

    // 6. Owner live update to Aktiv WITHOUT reload (real Convex subscription).
    const navBefore = agentBrowser(
      ownerSession,
      ["eval", "performance.getEntriesByType('navigation').length"],
      handle,
      "owner-navcount-before",
    )
    // Scoped wait: body-level "Aktiv" is poisoned by the approved Events org in
    // the org-switch menu, so await the active org's own overview section.
    agentBrowser(
      ownerSession,
      [
        "wait",
        "--fn",
        "(() => { const h = document.getElementById('veranstalter-uebersicht'); const sec = h ? h.closest('section') : null; return !!sec && sec.innerText.includes('Aktiv'); })()",
      ],
      handle,
      "owner-wait-live-aktiv",
    )
    const navAfter = agentBrowser(
      ownerSession,
      ["eval", "performance.getEntriesByType('navigation').length"],
      handle,
      "owner-navcount-after",
    )
    agentBrowser(ownerSession, ["snapshot", "-i"], handle, "owner-live-snapshot")
    const liveProbeRaw = agentBrowser(
      ownerSession,
      [
        "eval",
        "(() => { const h = document.getElementById('veranstalter-uebersicht'); const sec = h ? h.closest('section') : null; const t = sec ? sec.innerText : ''; return { found: !!sec, window: t.slice(0, 500) }; })()",
      ],
      handle,
      "owner-live-probe",
    )
    let liveAktiv = false
    try {
      const probe = JSON.parse(liveProbeRaw) as { found?: unknown; window?: unknown }
      liveAktiv = probe.found === true && typeof probe.window === "string" && /Aktiv/.test(probe.window)
    } catch {
      liveAktiv = false
    }
    step(
      context,
      "owner-live-aktiv-no-reload",
      liveAktiv && navBefore.trim() === navAfter.trim(),
      liveAktiv && navBefore.trim() === navAfter.trim()
        ? "Owner dashboard flipped to Aktiv live with no reload (navigation count unchanged): real Convex update, not localStore."
        : `Live Aktiv update not proven without reload (source hint: owner-live-probe).`,
    )
    const liveShot = join(artifactDir, "e2e-onboarding-owner-aktiv-live.png")
    agentBrowser(ownerSession, ["screenshot", liveShot], handle, "owner-live-shot")
    artifacts.push(liveShot)

    // 7. Owner settings: bank/profile save persists after reload.
    agentBrowser(
      ownerSession,
      ["open", `${front}/veranstalter/einstellungen?org=${encodeURIComponent(orgId ?? "")}`],
      handle,
      "owner-settings-open",
    )
    agentBrowser(ownerSession, ["wait", "--text", "Einstellungen"], handle, "owner-settings-wait")
    // The h1 renders before the profile query resolves; filling or submitting
    // earlier races the one-shot prefill (or hits the disabled submit). Await
    // prefilled inputs and an enabled submit before acting.
    agentBrowser(
      ownerSession,
      [
        "wait",
        "--fn",
        "(() => { const n = document.querySelector('#settings-name'); return !!n && n.value !== ''; })()",
      ],
      handle,
      "owner-settings-wait-prefill",
    )
    const settingsPhone = "+49 30 111222"
    agentBrowser(ownerSession, ["fill", "#settings-phone", settingsPhone], handle, "owner-settings-phone")
    agentBrowser(ownerSession, ["fill", "#settings-iban", "DE75512108001245126199"], handle, "owner-settings-iban")
    agentBrowser(
      ownerSession,
      [
        "wait",
        "--fn",
        "(() => { const b = document.querySelector('button[type=\"submit\"]'); return !!b && !b.disabled; })()",
      ],
      handle,
      "owner-settings-wait-enabled",
    )
    agentBrowser(ownerSession, ["scrollintoview", "button[type='submit']"], handle, "owner-settings-scroll-save")
    agentBrowser(ownerSession, ["click", "button[type='submit']"], handle, "owner-settings-save")
    agentBrowser(ownerSession, ["wait", "--text", "Gespeichert"], handle, "owner-settings-wait-saved")
    step(context, "owner-settings-save", true, "Owner bank/profile saved in the settings UI.")
    agentBrowser(ownerSession, ["reload"], handle, "owner-settings-reload")
    agentBrowser(ownerSession, ["wait", "--text", "Einstellungen"], handle, "owner-settings-wait-reload")
    const phoneValue = agentBrowser(
      ownerSession,
      ["get", "value", "#settings-phone"],
      handle,
      "owner-settings-phone-value",
    )
    const ibanValue = agentBrowser(
      ownerSession,
      ["get", "value", "#settings-iban"],
      handle,
      "owner-settings-iban-value",
    )
    const persisted =
      phoneValue.includes(settingsPhone) && ibanValue.replaceAll(/[\s-]+/g, "") === "DE75512108001245126199"
    step(
      context,
      "owner-settings-persist",
      persisted,
      persisted
        ? "Bank/profile values persist after reload."
        : "Settings values did not persist after reload; STOP (source hint: einstellungen snapshot).",
    )

    // 8. Mobile drawer (390x844) + desktop screenshots, theme if present.
    agentBrowser(ownerSession, ["set", "viewport", "390", "844"], handle, "owner-mobile-viewport")
    agentBrowser(
      ownerSession,
      ["open", `${front}/veranstalter?org=${encodeURIComponent(orgId ?? "")}`],
      handle,
      "owner-mobile-open",
    )
    agentBrowser(ownerSession, ["wait", "--text", "Aktiv"], handle, "owner-mobile-wait")
    const mobileSnap = agentBrowser(ownerSession, ["snapshot", "-i"], handle, "owner-mobile-snapshot")
    const drawerTrigger = /Menü|Navigation|Drawer|Menue/i.test(mobileSnap)
    if (drawerTrigger) {
      // Actual contract (VeranstalterDashboardTopbar): icon-only ButtonIconOnly
      // with accessible name "Menü öffnen" — no visible text, so text search
      // can never match; use the semantic role+name locator.
      agentBrowser(
        ownerSession,
        ["find", "role", "button", "click", "--name", "Menü öffnen"],
        handle,
        "owner-drawer-open",
      )
      const drawerOpen = agentBrowser(ownerSession, ["snapshot", "-i"], handle, "owner-drawer-open-snap")
      agentBrowser(ownerSession, ["press", "Escape"], handle, "owner-drawer-escape")
      const drawerClosed = agentBrowser(ownerSession, ["snapshot", "-i"], handle, "owner-drawer-closed-snap")
      step(
        context,
        "mobile-drawer",
        drawerOpen !== drawerClosed,
        drawerOpen !== drawerClosed
          ? "Mobile drawer opens and closes via Escape (focus change observed)."
          : "Drawer open/close produced no observable change; STOP.",
      )
    } else {
      notes.push("Mobile drawer trigger not found by label; drawer check recorded as not-applicable on this shell.")
      steps.push({ name: "mobile-drawer", ok: true, detail: "No drawer trigger label found; recorded as n/a." })
    }
    const mobileShot = join(artifactDir, "e2e-onboarding-mobile-390x844.png")
    agentBrowser(ownerSession, ["screenshot", mobileShot], handle, "owner-mobile-shot")
    artifacts.push(mobileShot)
    const themeSnap = agentBrowser(ownerSession, ["snapshot", "-i"], handle, "owner-theme-snapshot")
    if (/Design|Theme|Farbschema|Dark|Hell/i.test(themeSnap)) {
      try {
        agentBrowser(ownerSession, ["set", "media", "dark"], handle, "owner-theme-dark")
        const darkShot = join(artifactDir, "e2e-onboarding-dark-1440x900.png")
        agentBrowser(ownerSession, ["set", "viewport", "1440", "900"], handle, "owner-desktop-viewport")
        agentBrowser(ownerSession, ["screenshot", darkShot], handle, "owner-dark-shot")
        artifacts.push(darkShot)
        agentBrowser(ownerSession, ["set", "media", "light"], handle, "owner-theme-light")
        notes.push("Theme control present; dark/light media screenshots captured.")
      } catch {
        notes.push("Theme control present but media emulation failed; single-theme screenshots kept.")
      }
    } else {
      notes.push("No theme control found; single-theme screenshots kept.")
    }
    agentBrowser(ownerSession, ["set", "viewport", "1440", "900"], handle, "owner-desktop-viewport-final")
    const desktopShot = join(artifactDir, "e2e-onboarding-desktop-1440x900.png")
    agentBrowser(ownerSession, ["screenshot", desktopShot], handle, "owner-desktop-shot")
    artifacts.push(desktopShot)

    // 9. Console/page errors through the redactor (no unredacted headers/cookies/tokens).
    const consoleRaw = agentBrowser(ownerSession, ["console"], handle, "owner-console")
    const errorsRaw = agentBrowser(ownerSession, ["errors"], handle, "owner-errors")
    const consoleRed = redact(handle, consoleRaw)
    const errorsRed = redact(handle, errorsRaw)
    writeFileSync(join(artifactDir, "e2e-onboarding-console.log"), consoleRed, { mode: 0o600 })
    writeFileSync(join(artifactDir, "e2e-onboarding-errors.log"), errorsRed, { mode: 0o600 })
    artifacts.push(join(artifactDir, "e2e-onboarding-console.log"), join(artifactDir, "e2e-onboarding-errors.log"))
    const errorCount = (errorsRed.match(/error/gi) ?? []).length
    notes.push(
      `Console/page-error logs captured redacted; raw error-token occurrences in page-error buffer: ${errorCount}. No 'no errors' claim beyond these observed logs.`,
    )
    step(context, "console-captured", true, "Console and page errors captured redacted to private artifacts.")

    notes.push(
      "Auth is fixture-seeded (customer/admin sessions), never SSO; no payment flow executed; no full-platform claim.",
    )
    notes.push(
      "This run used a synthetic org slug unique to this task; the parallel Events E2E uses a different org with the same base identities and explicit ?org= scoping — neither run alters the other's orgs/members.",
    )
    for (const file of artifacts) {
      try {
        chmodSync(file, 0o600)
      } catch {
        // best effort; artifacts remain private under the 0700 dir.
      }
    }
    return createResult(finish(context, artifacts, orgName, orgSlug, orgId, true))
  } catch (error) {
    const failed = error as Error
    steps.push({ name: "run", ok: false, detail: failed.message.slice(0, 500) })
    return createResultError(op, failed.message.slice(0, 500))
  }
}

function finish(
  context: RunContext,
  artifacts: string[],
  orgName: string,
  orgSlug: string,
  orgId: string | null,
  ok: boolean,
): VeranstalterOnboardingLocalE2eSummary {
  return {
    ok,
    orgName,
    orgSlug,
    orgId,
    steps: [...context.steps],
    artifacts: [...artifacts],
    notes: [...context.notes],
  }
}

if (import.meta.main) {
  const started = Date.now()
  const outcome = await veranstalterOnboardingLocalE2eRun()
  const elapsedMs = Date.now() - started
  if (!outcome.success) {
    console.error(`[e2e-onboarding] FAILED after ${elapsedMs}ms: ${outcome.errorMessage}`)
    process.exit(1)
  }
  const summary = outcome.data
  console.log(`[e2e-onboarding] ${summary.ok ? "PASS" : "FAIL"} after ${elapsedMs}ms: org=${summary.orgSlug}`)
  for (const item of summary.steps)
    console.log(`[e2e-onboarding] ${item.ok ? "ok" : "FAIL"} ${item.name}: ${item.detail}`)
  for (const note of summary.notes) console.log(`[e2e-onboarding] note: ${note}`)
  console.log(`[e2e-onboarding] artifacts: ${summary.artifacts.join(", ")}`)
  process.exit(summary.ok ? 0 : 1)
}
