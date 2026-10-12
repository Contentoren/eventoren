import { createResult, createResultError } from "#result"

export const e2eHistoricalStaleAfterMs = 0
const maxPagesPerScan = 100

const ticketE2ePrefix = "ticket-e2e-"
const readinessKey = "readiness-technical-draft-20260914"
const technicalCheckoutKey = "technischer-checkout-test-keine-veranstaltung-e879ab05"
const nativeAuthPattern = /^native-auth-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

type HistoricalCleanedEntry = { eventKey: string; runId?: string; kind?: string }

type HistoricalSkippedEntry = { eventKey: string; reason: string }

type HistoricalPageFn = (args: {
  cursor: string | null
  staleAfterMs: number
}) => Promise<{ success: boolean; errorMessage?: string; data?: unknown }>

type HistoricalEventDrain = {
  cleaned: HistoricalCleanedEntry[]
  skipped: HistoricalSkippedEntry[]
  scannedEvents: number
  pages: number
}

type HistoricalOrphanDrain = {
  scannedOrders: number
  orphanOrdersDeleted: number
  orphanTicketsDeleted: number
  pages: number
}

type HistoricalPageControl = {
  truncated?: boolean
  isDone?: boolean
  continueCursor?: string | null
}

/**
 * Drain paged historical fixture sweeps after the whole-invocation success
 * barrier. Both the catalog-event sweep and the orphan-order sweep run with
 * staleAfterMs 0 so current, recent and legacy fixtures (ticket-e2e markers,
 * native-auth drafts including archived rows, the readiness draft and the
 * approved live technical-checkout graph) are all in scope. The caller repeats
 * with continueCursor until isDone; a truncated or stalled page fails and
 * retains the cleanup phase. Skipped identifiable candidates fail instead of
 * being silently left behind; rows without any E2E marker (for example a
 * generic test title alone) are reported as retained outside the ownership
 * classification, never deleted.
 */
export async function e2eHistoricalCleanupScan(input: {
  staleAfterMs: number
  eventPage: HistoricalPageFn
  orphanPage?: HistoricalPageFn
}) {
  const op = "e2eHistoricalCleanupScan"
  if (input.staleAfterMs !== e2eHistoricalStaleAfterMs)
    return createResultError(op, "Historical sweep requires staleAfterMs 0 after the success barrier")

  const events = await e2eHistoricalEventPagesDrain(input.eventPage)
  if (!events.success) return events
  const orphans = input.orphanPage ? await e2eHistoricalOrphanPagesDrain(input.orphanPage) : null
  if (orphans && !orphans.success) return orphans

  const cleaned = events.data.cleaned
  const skipped = events.data.skipped
  const identifiable = skipped.filter((entry) => e2eHistoricalIdentifiableKey(entry.eventKey))
  if (identifiable.length > 0)
    return createResultError(
      op,
      `Historical sweep skipped identifiable candidates; checkpoint retained: ${identifiable
        .map((entry) => `${entry.eventKey} (${entry.reason})`)
        .join("; ")}`,
    )

  return createResult({
    scannedEvents: events.data.scannedEvents,
    eventPages: events.data.pages,
    cleaned,
    skipped,
    retainedOutsideOwnership:
      "Events without an exact ticket-e2e run marker, native-auth attempt marker or approved legacy key (for example a generic test title alone) are outside the E2E ownership classification and are retained by design",
    orphanPages: orphans?.data.pages ?? 0,
    scannedOrders: orphans?.data.scannedOrders ?? 0,
    orphanOrdersDeleted: orphans?.data.orphanOrdersDeleted ?? 0,
    orphanTicketsDeleted: orphans?.data.orphanTicketsDeleted ?? 0,
    externalArtifacts: "stripe-imap-pdf-reconciled-separately" as const,
  })
}

function e2eHistoricalIdentifiableKey(eventKey: string): boolean {
  if (eventKey.startsWith(ticketE2ePrefix)) return true
  if (eventKey === readinessKey) return true
  if (eventKey === technicalCheckoutKey) return true
  if (nativeAuthPattern.test(eventKey)) return true
  return false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function finiteCount(value: unknown): number | null {
  if (value === undefined) return 0
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) return null
  return value
}

function historicalPageControl(value: unknown): HistoricalPageControl | null {
  if (value === undefined) return {}
  if (!isRecord(value)) return null
  const control: HistoricalPageControl = {}
  if (value["truncated"] !== undefined) {
    if (typeof value["truncated"] !== "boolean") return null
    control.truncated = value["truncated"]
  }
  if (value["isDone"] !== undefined) {
    if (typeof value["isDone"] !== "boolean") return null
    control.isDone = value["isDone"]
  }
  if (value["continueCursor"] !== undefined) {
    const cursor: unknown = value["continueCursor"]
    if (cursor !== null && typeof cursor !== "string") return null
    control.continueCursor = cursor
  }
  return control
}

function historicalCleanedEntries(value: unknown): HistoricalCleanedEntry[] | null {
  if (value === undefined) return []
  if (!Array.isArray(value)) return null
  const entries: HistoricalCleanedEntry[] = []
  for (const entry of value) {
    if (!isRecord(entry)) return null
    const eventKey: unknown = entry["eventKey"]
    if (typeof eventKey !== "string" || eventKey.length === 0) return null
    const runId: unknown = entry["runId"]
    const kind: unknown = entry["kind"]
    if (runId !== undefined && typeof runId !== "string") return null
    if (kind !== undefined && typeof kind !== "string") return null
    entries.push({
      eventKey,
      ...(typeof runId === "string" ? { runId } : {}),
      ...(typeof kind === "string" ? { kind } : {}),
    })
  }
  return entries
}

function historicalSkippedEntries(value: unknown): HistoricalSkippedEntry[] | null {
  if (value === undefined) return []
  if (!Array.isArray(value)) return null
  const entries: HistoricalSkippedEntry[] = []
  for (const entry of value) {
    if (!isRecord(entry)) return null
    const eventKey: unknown = entry["eventKey"]
    if (typeof eventKey !== "string" || eventKey.length === 0) return null
    const reason: unknown = entry["reason"]
    if (reason !== undefined && typeof reason !== "string") return null
    entries.push({ eventKey, reason: typeof reason === "string" && reason.length > 0 ? reason : "unresolved" })
  }
  return entries
}

async function e2eHistoricalEventPagesDrain(page: HistoricalPageFn) {
  const op = "e2eHistoricalCleanupScan"
  const cleaned: HistoricalCleanedEntry[] = []
  const skipped: HistoricalSkippedEntry[] = []
  let scannedEvents = 0
  let pages = 0
  let cursor: string | null = null
  while (true) {
    if (pages >= maxPagesPerScan)
      return createResultError(op, "Historical catalog sweep truncated; checkpoint retained for retry")
    const result = await page({ cursor, staleAfterMs: e2eHistoricalStaleAfterMs })
    if (result.success !== true)
      return createResultError(
        op,
        typeof result.errorMessage === "string" && result.errorMessage.length > 0
          ? result.errorMessage
          : "Historical catalog sweep unavailable; checkpoint retained",
      )
    const raw: unknown = result.data ?? {}
    if (!isRecord(raw))
      return createResultError(op, "Historical catalog sweep returned malformed data; checkpoint retained")
    const control = historicalPageControl({
      ...(raw["truncated"] !== undefined ? { truncated: raw["truncated"] } : {}),
      ...(raw["isDone"] !== undefined ? { isDone: raw["isDone"] } : {}),
      ...(raw["continueCursor"] !== undefined ? { continueCursor: raw["continueCursor"] } : {}),
    })
    if (!control) return createResultError(op, "Historical catalog sweep returned malformed data; checkpoint retained")
    if (control.truncated === true)
      return createResultError(op, "Historical catalog sweep truncated; checkpoint retained for retry")
    const pageCleaned = historicalCleanedEntries(raw["cleaned"])
    if (!pageCleaned)
      return createResultError(op, "Historical catalog sweep returned malformed data; checkpoint retained")
    cleaned.push(...pageCleaned)
    const pageSkipped = historicalSkippedEntries(raw["skipped"])
    if (!pageSkipped)
      return createResultError(op, "Historical catalog sweep returned malformed data; checkpoint retained")
    skipped.push(...pageSkipped)
    const pageScanned = finiteCount(raw["scannedEvents"])
    if (pageScanned === null)
      return createResultError(op, "Historical catalog sweep returned malformed data; checkpoint retained")
    scannedEvents += pageScanned
    pages += 1
    if (control.truncated === false && control.isDone === undefined) break
    if (control.isDone === true) break
    const next = control.continueCursor ?? null
    if (!next || next === cursor)
      return createResultError(op, "Historical catalog sweep truncated; checkpoint retained for retry")
    cursor = next
  }
  return createResult({ cleaned, skipped, scannedEvents, pages })
}

async function e2eHistoricalOrphanPagesDrain(page: HistoricalPageFn) {
  const op = "e2eHistoricalCleanupScan"
  let scannedOrders = 0
  let orphanOrdersDeleted = 0
  let orphanTicketsDeleted = 0
  let pages = 0
  let cursor: string | null = null
  while (true) {
    if (pages >= maxPagesPerScan)
      return createResultError(op, "Historical orphan-order sweep truncated; checkpoint retained for retry")
    const result = await page({ cursor, staleAfterMs: e2eHistoricalStaleAfterMs })
    if (result.success !== true)
      return createResultError(
        op,
        typeof result.errorMessage === "string" && result.errorMessage.length > 0
          ? result.errorMessage
          : "Historical orphan-order sweep unavailable; checkpoint retained",
      )
    const raw: unknown = result.data ?? {}
    if (!isRecord(raw))
      return createResultError(op, "Historical orphan-order sweep returned malformed data; checkpoint retained")
    const control = historicalPageControl({
      ...(raw["truncated"] !== undefined ? { truncated: raw["truncated"] } : {}),
      ...(raw["isDone"] !== undefined ? { isDone: raw["isDone"] } : {}),
      ...(raw["continueCursor"] !== undefined ? { continueCursor: raw["continueCursor"] } : {}),
    })
    if (!control)
      return createResultError(op, "Historical orphan-order sweep returned malformed data; checkpoint retained")
    if (control.truncated === true)
      return createResultError(op, "Historical orphan-order sweep truncated; checkpoint retained for retry")
    const pageScanned = finiteCount(raw["scannedOrders"])
    const pageOrdersDeleted = finiteCount(raw["orphanOrdersDeleted"])
    const pageTicketsDeleted = finiteCount(raw["orphanTicketsDeleted"])
    if (pageScanned === null || pageOrdersDeleted === null || pageTicketsDeleted === null)
      return createResultError(op, "Historical orphan-order sweep returned malformed data; checkpoint retained")
    scannedOrders += pageScanned
    orphanOrdersDeleted += pageOrdersDeleted
    orphanTicketsDeleted += pageTicketsDeleted
    pages += 1
    if (control.truncated === false && control.isDone === undefined) break
    if (control.isDone === true) break
    const next = control.continueCursor ?? null
    if (!next || next === cursor)
      return createResultError(op, "Historical orphan-order sweep truncated; checkpoint retained for retry")
    cursor = next
  }
  return createResult({ scannedOrders, orphanOrdersDeleted, orphanTicketsDeleted, pages })
}
