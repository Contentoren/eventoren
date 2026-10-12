import { createResult, createResultError } from "#result"

const maxPagesPerScan = 100

const exactSnapshotKinds = new Set(["ticket-e2e", "native-auth", "readiness", "technical-checkout"])

type SnapshotDiscoveryPageData = {
  isDone?: boolean
  continueCursor?: string | null
  scannedSnapshots?: number
  activeVersion?: number
  candidates?: { version?: unknown; kind?: unknown; eventKey?: unknown; chunkCount?: unknown }[]
}

type SnapshotDiscoveryPageFn = (args: {
  cursor: string | null
}) => Promise<{ success: boolean; errorMessage?: string; data?: unknown }>

export type E2eSnapshotDiscoveryCandidate = {
  version: number
  kind: string
  eventKey: string
  chunkCount: number
}

/**
 * Drain read-only pre-deletion snapshot candidate inventory pages before any
 * snapshot deletion mutation. Uses the paged snapshot discovery API (not the
 * bounded full-sweep historical mutation) so large unrelated snapshot caches
 * cannot fail the inventory. Persist the drained versions plus source keys to
 * the cleanup ledger BEFORE the first snapshot deletion so a lost mutation
 * response cannot orphan evidence; the inventory stays independent of the
 * event inventory because primary fixtures may already be gone.
 *
 * Only exact test-bearing versions (same approved markers as live rows, never
 * a generic substring) are reported; ownership proof and deletion stay with
 * the cleanup mutation which re-derives present matches. Fails on truncated
 * or stalled pages and on incoherent active versions, retaining the cleanup
 * phase. Runs even when the event candidate inventory is empty: snapshot-only
 * residue must still be discovered.
 */
export async function e2eSnapshotDiscoveryScan(input: { snapshotPage: SnapshotDiscoveryPageFn }) {
  const op = "e2eSnapshotDiscoveryScan"
  const seen = new Map<string, E2eSnapshotDiscoveryCandidate>()
  let scannedSnapshots = 0
  let snapshotPages = 0
  let activeVersion: number | null = null
  let cursor: string | null = null
  while (true) {
    if (snapshotPages >= maxPagesPerScan)
      return createResultError(op, "Snapshot discovery truncated; checkpoint retained for retry")
    const result = await input.snapshotPage({ cursor })
    if (!result.success) return result
    const data = (result.data ?? {}) as SnapshotDiscoveryPageData
    if (typeof data.activeVersion !== "number" || !Number.isFinite(data.activeVersion) || data.activeVersion < 0)
      return createResultError(op, "Snapshot discovery reported an unknown version state; checkpoint retained")
    if (activeVersion === null) activeVersion = data.activeVersion
    else if (activeVersion !== data.activeVersion)
      return createResultError(op, "Snapshot scheduler version moved during discovery; checkpoint retained")
    if (!Array.isArray(data.candidates))
      return createResultError(op, "Snapshot discovery reported unknown candidate data; checkpoint retained")
    for (const entry of data.candidates) {
      if (
        typeof entry?.version !== "number" ||
        !Number.isInteger(entry.version) ||
        entry.version < 0 ||
        typeof entry.kind !== "string" ||
        !exactSnapshotKinds.has(entry.kind) ||
        typeof entry.eventKey !== "string" ||
        entry.eventKey.length === 0 ||
        typeof entry.chunkCount !== "number" ||
        !Number.isInteger(entry.chunkCount) ||
        entry.chunkCount < 0
      )
        return createResultError(op, "Snapshot discovery reported unknown candidate data; checkpoint retained")
      const key = `${entry.version as number}:${entry.eventKey as string}`
      if (seen.has(key)) continue
      seen.set(key, {
        version: entry.version as number,
        kind: entry.kind as string,
        eventKey: entry.eventKey as string,
        chunkCount: entry.chunkCount as number,
      })
    }
    if (typeof data.scannedSnapshots === "number") {
      if (!Number.isFinite(data.scannedSnapshots) || data.scannedSnapshots < 0)
        return createResultError(op, "Snapshot discovery reported unknown scan counts; checkpoint retained")
      scannedSnapshots += data.scannedSnapshots
    }
    snapshotPages += 1
    if (data.isDone === true) break
    const next = data.continueCursor ?? null
    if (!next || next === cursor)
      return createResultError(op, "Snapshot discovery truncated; checkpoint retained for retry")
    cursor = next
  }
  return createResult({
    candidates: [...seen.values()],
    scannedSnapshots,
    snapshotPages,
    activeVersion: activeVersion ?? 0,
  })
}
