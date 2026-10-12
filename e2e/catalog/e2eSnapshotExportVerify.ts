import { createResult, createResultError } from "#result"

export type SnapshotExportVerifyEvent = Record<string, unknown>

export type SnapshotExportVerifyPage = {
  version: number
  events: SnapshotExportVerifyEvent[]
  isDone: boolean
  continueCursor: string | null
}

export type SnapshotExportVerifyReadResult = {
  success: boolean
  errorMessage?: string
  data?: SnapshotExportVerifyPage | null
}

export type SnapshotExportVerifyRead = (args: {
  version: number
  cursor: string | null
}) => Promise<SnapshotExportVerifyReadResult>

export type SnapshotActiveVerifyReadResult = {
  success: boolean
  errorMessage?: string
  data?: number
}

export type SnapshotActiveVerifyRead = () => Promise<SnapshotActiveVerifyReadResult>

const technicalCheckoutKey = "technischer-checkout-test-keine-veranstaltung-e879ab05"
const readinessKey = "readiness-technical-draft-20260914"
const legacyMismatchKey = "native-auth-a844f1f7-5c21-469f-bc8b-fe721ec05ec0"
const legacyMismatchTitle = "[native-auth-e2e:muwdpyqv-49622e87-f4ee-4cf8-a487-26c874d1283b] lifecycle edited"
const ticketRunPattern = /^[0-9a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u
const nativeTitlePattern =
  /^\[native-auth-e2e:([^:\[\]]+)(:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})?\] lifecycle (draft|edited)$/
const fictitiousPattern = /fiktiv|fictitious|keine veranstaltung|kein echt|test|technisch/i
const readinessPattern = /synchron|technisch|technical|readiness|\bsync\b/i

/**
 * Exact known fixture markers for a denormalized snapshot export event,
 * mirroring the backend ownership proofs. A generic e2e substring never
 * establishes ownership. Returns the fixture kind or null for genuine rows.
 */
export function snapshotExportFixtureKindFor(event: Record<string, unknown>): string | null {
  const eventKey = event["eventKey"]
  if (typeof eventKey !== "string" || eventKey.length === 0) return null
  if (eventKey === technicalCheckoutKey) {
    const description = event["description"]
    if (typeof description === "string" && fictitiousPattern.test(description)) return "technical-checkout"
    return null
  }
  if (eventKey === readinessKey) {
    const description = event["description"]
    const imageUrl = event["imageUrl"]
    if (typeof imageUrl === "string" && imageUrl.includes("readiness-technical-draft")) return "readiness"
    if (typeof description === "string" && readinessPattern.test(description)) return "readiness"
    return null
  }
  if (eventKey === legacyMismatchKey && event["title"] === legacyMismatchTitle) return "native-auth"
  if (eventKey.startsWith("native-auth-")) {
    const title = event["title"]
    if (typeof title !== "string") return null
    if (!nativeTitlePattern.test(title)) return null
    if (!/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.test(title)) return null
    return "native-auth"
  }
  if (eventKey.startsWith("ticket-e2e-")) {
    const runId = eventKey.slice("ticket-e2e-".length)
    if (!ticketRunPattern.test(runId)) return null
    if (event["title"] !== `Ticket E2E ${runId}`) return null
    if (event["organizer"] !== `Eventoren Ticket E2E ${runId}`) return null
    return "ticket-e2e"
  }
  return null
}

/**
 * Bounded poll of the existing catalog sync snapshot export for the current
 * active version. A null page means the version is still building, never
 * absence: refresh the current active version via the authenticated readonly
 * reader and restart the export when it legitimately advanced. Drains the
 * full ready export and refuses when any exact known fixture marker remains;
 * genuine consistency (string event keys plus a post-drain active refresh)
 * is verified alongside the marker scan, never inferred from version
 * equality alone. Bounded by deadline/pages with injectable clock/sleep so
 * unit tests use fakes instead of real waits or network.
 */
export async function e2eSnapshotExportVerify(input: {
  activeVersion: number
  readExportPage: SnapshotExportVerifyRead
  readActiveVersion: SnapshotActiveVerifyRead
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  deadlineMs?: number
  pollIntervalMs?: number
  maxExportPages?: number
}) {
  const op = "e2eSnapshotExportVerify"
  const now = input.now ?? Date.now
  const sleep = input.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const deadlineMs = input.deadlineMs ?? 30_000
  const pollIntervalMs = input.pollIntervalMs ?? 500
  const maxExportPages = input.maxExportPages ?? 100
  const deadline = now() + deadlineMs
  let version = input.activeVersion

  while (true) {
    if (now() > deadline) return createResultError(op, "Snapshot export not ready before deadline; checkpoint retained")
    const events: SnapshotExportVerifyEvent[] = []
    let cursor: string | null = null
    let pages = 0
    let building = false
    let restarted = false

    while (true) {
      if (pages >= maxExportPages)
        return createResultError(op, "Snapshot export truncated; checkpoint retained for retry")
      const read = await input.readExportPage({ version, cursor })
      if (!read.success) return read
      if (read.data === null || read.data === undefined) {
        building = true
        break
      }
      const page = read.data
      if (typeof page.version !== "number" || page.version !== version) {
        restarted = true
        break
      }
      if (!Array.isArray(page.events))
        return createResultError(op, "Snapshot export payload could not be proven; checkpoint retained")
      for (const event of page.events) {
        if (typeof event !== "object" || event === null || Array.isArray(event))
          return createResultError(op, "Snapshot export payload could not be proven; checkpoint retained")
        events.push(event as Record<string, unknown>)
      }
      if (page.isDone === true) break
      const next = page.continueCursor ?? null
      if (!next || next === cursor)
        return createResultError(op, "Snapshot export truncated; checkpoint retained for retry")
      cursor = next
      pages += 1
      const active = await input.readActiveVersion()
      if (!active.success) return active
      if (typeof active.data === "number" && active.data !== version) {
        version = active.data
        restarted = true
        break
      }
    }

    if (restarted) {
      const active = await input.readActiveVersion()
      if (!active.success) return active
      if (typeof active.data === "number") version = active.data
      continue
    }

    if (building) {
      const active = await input.readActiveVersion()
      if (!active.success) return active
      if (typeof active.data === "number" && active.data !== version) {
        version = active.data
        continue
      }
      if (now() >= deadline)
        return createResultError(op, "Snapshot export not ready before deadline; checkpoint retained")
      await sleep(pollIntervalMs)
      continue
    }

    for (const event of events) {
      const key = event["eventKey"]
      if (typeof key !== "string" || key.length === 0)
        return createResultError(op, "Snapshot export payload could not be proven; checkpoint retained")
    }
    const owned = events.filter((event) => snapshotExportFixtureKindFor(event) !== null)
    if (owned.length > 0) {
      const sample = owned
        .slice(0, 3)
        .map((event) => String(event["eventKey"]))
        .join("; ")
      return createResultError(
        op,
        `Final snapshot export retains owned fixtures; checkpoint retained: ${sample || "unknown"}`,
      )
    }
    const confirm = await input.readActiveVersion()
    if (!confirm.success) return confirm
    if (typeof confirm.data === "number" && confirm.data !== version) {
      version = confirm.data
      if (now() > deadline)
        return createResultError(op, "Snapshot export not ready before deadline; checkpoint retained")
      continue
    }
    return createResult({
      status: "snapshot-export-clean" as const,
      activeVersion: version,
      eventCount: events.length,
    })
  }
}
