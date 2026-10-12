import { createResult, createResultError } from "#result"

const maxPagesPerScan = 100

type DiscoveryPageData = {
  isDone?: boolean
  continueCursor?: string | null
  candidates?: { eventKey: string; runId?: string; kind?: string }[]
  scannedEvents?: number
  scannedOrders?: number
}

type DiscoveryPageFn = (args: {
  cursor: string | null
}) => Promise<{ success: boolean; errorMessage?: string; data?: unknown }>

/**
 * Drain read-only pre-deletion candidate inventory pages before any deletion
 * mutation. Persist the drained inventory to the cleanup ledger before the
 * first deletion so a lost mutation response cannot orphan provider evidence:
 * the provider scans reuse this inventory even when the deletion receipt is
 * lost. Fails on truncated or stalled pages and retains the cleanup phase.
 */
export async function e2eHistoricalDiscoveryScan(input: { eventPage: DiscoveryPageFn; orphanPage?: DiscoveryPageFn }) {
  const op = "e2eHistoricalDiscoveryScan"
  const seen = new Map<string, { eventKey: string; runId?: string; kind?: string }>()
  let scannedEvents = 0
  let scannedOrders = 0
  let eventPages = 0
  let orphanPages = 0
  let cursor: string | null = null
  while (true) {
    if (eventPages >= maxPagesPerScan)
      return createResultError(op, "Historical discovery truncated; checkpoint retained for retry")
    const result = await input.eventPage({ cursor })
    if (!result.success) return result
    const data = (result.data ?? {}) as DiscoveryPageData
    if (Array.isArray(data.candidates))
      for (const entry of data.candidates) {
        if (!entry?.eventKey || seen.has(entry.eventKey)) continue
        seen.set(entry.eventKey, { eventKey: entry.eventKey, runId: entry.runId, kind: entry.kind })
      }
    if (typeof data.scannedEvents === "number") scannedEvents += data.scannedEvents
    eventPages += 1
    if (data.isDone === true) break
    const next = data.continueCursor ?? null
    if (!next || next === cursor)
      return createResultError(op, "Historical discovery truncated; checkpoint retained for retry")
    cursor = next
  }
  if (input.orphanPage) {
    let orphanCursor: string | null = null
    while (true) {
      if (orphanPages >= maxPagesPerScan)
        return createResultError(op, "Historical orphan discovery truncated; checkpoint retained for retry")
      const result = await input.orphanPage({ cursor: orphanCursor })
      if (!result.success) return result
      const data = (result.data ?? {}) as DiscoveryPageData
      if (Array.isArray(data.candidates))
        for (const entry of data.candidates) {
          if (!entry?.eventKey || seen.has(entry.eventKey)) continue
          seen.set(entry.eventKey, { eventKey: entry.eventKey, runId: entry.runId, kind: entry.kind })
        }
      if (typeof data.scannedOrders === "number") scannedOrders += data.scannedOrders
      orphanPages += 1
      if (data.isDone === true) break
      const next = data.continueCursor ?? null
      if (!next || next === orphanCursor)
        return createResultError(op, "Historical orphan discovery truncated; checkpoint retained for retry")
      orphanCursor = next
    }
  }
  return createResult({
    candidates: [...seen.values()],
    scannedEvents,
    scannedOrders,
    eventPages,
    orphanPages,
  })
}
