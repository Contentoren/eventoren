import { createResult, createResultError } from "#result"

const maxPagesPerScan = 100

const exactSnapshotKinds = new Set(["ticket-e2e", "native-auth", "readiness", "technical-checkout"])

type SnapshotCleanupPageData = {
  isDone?: boolean
  continueCursor?: string | null
  scannedSnapshots?: number
  activeVersion?: number
  cleanedVersions?: {
    version?: unknown
    kinds?: unknown
    eventKeys?: unknown
    chunkCount?: unknown
    action?: unknown
  }[]
  deletedChunks?: number
  skippedVersions?: { version?: unknown; reason?: unknown }[]
}

type SnapshotCleanupPageFn = (args: {
  cursor: string | null
}) => Promise<{ success: boolean; errorMessage?: string; data?: unknown }>

export type E2eSnapshotCleanedVersion = {
  version: number
  kinds: string[]
  eventKeys: string[]
  chunkCount: number
  action: "deleted" | "rebuilt"
}

/**
 * Drain paged snapshot deletions after the event-graph and provider checks.
 * Each snapshot page re-derives present exact matches (same approved markers
 * as live rows, never a generic substring) so a retried cursor stays
 * idempotent. Obsolete test-bearing versions are deleted wholly; an affected
 * active version is emptied for genuine rebuild and rescheduled by the
 * backend. Genuine live rows are never touched: only derived cache rows go,
 * and Stripe financial history is unrelated (reconciled separately).
 *
 * Unparsable snapshots are reported as skippedVersions by the backend and
 * fail here with the checkpoint retained: they are retained, never deleted.
 * Fails on truncated or stalled pages. Runs even when the event candidate
 * inventory is empty: snapshot-only residue must still be drained.
 */
export async function e2eSnapshotCleanupScan(input: { snapshotPage: SnapshotCleanupPageFn }) {
  const op = "e2eSnapshotCleanupScan"
  const cleaned: E2eSnapshotCleanedVersion[] = []
  let deletedChunks = 0
  let scannedSnapshots = 0
  let snapshotPages = 0
  let activeVersion: number | null = null
  let cursor: string | null = null
  while (true) {
    if (snapshotPages >= maxPagesPerScan)
      return createResultError(op, "Snapshot sweep truncated; checkpoint retained for retry")
    const result = await input.snapshotPage({ cursor })
    if (!result.success) return result
    const data = (result.data ?? {}) as SnapshotCleanupPageData
    if (typeof data.activeVersion !== "number" || !Number.isFinite(data.activeVersion) || data.activeVersion < 0)
      return createResultError(op, "Snapshot sweep reported an unknown version state; checkpoint retained")
    if (activeVersion === null) activeVersion = data.activeVersion
    else if (activeVersion !== data.activeVersion)
      return createResultError(op, "Snapshot scheduler version moved during the sweep; checkpoint retained")
    if (data.cleanedVersions !== undefined) {
      if (!Array.isArray(data.cleanedVersions))
        return createResultError(op, "Snapshot sweep reported unknown cleanup data; checkpoint retained")
      for (const entry of data.cleanedVersions) {
        if (
          typeof entry?.version !== "number" ||
          !Number.isInteger(entry.version) ||
          entry.version < 0 ||
          !Array.isArray(entry.kinds) ||
          !entry.kinds.every((kind): kind is string => typeof kind === "string" && exactSnapshotKinds.has(kind)) ||
          !Array.isArray(entry.eventKeys) ||
          !entry.eventKeys.every((key): key is string => typeof key === "string" && key.length > 0) ||
          typeof entry.chunkCount !== "number" ||
          !Number.isInteger(entry.chunkCount) ||
          entry.chunkCount < 0 ||
          (entry.action !== "deleted" && entry.action !== "rebuilt")
        )
          return createResultError(op, "Snapshot sweep reported unknown cleanup data; checkpoint retained")
        cleaned.push({
          version: entry.version,
          kinds: [...entry.kinds],
          eventKeys: [...entry.eventKeys],
          chunkCount: entry.chunkCount,
          action: entry.action,
        })
      }
    }
    if (Array.isArray(data.skippedVersions) && data.skippedVersions.length > 0) {
      const described = data.skippedVersions
        .map((entry) =>
          typeof entry?.version === "number"
            ? `version ${entry.version} (${String(entry.reason ?? "unresolved")})`
            : null,
        )
        .filter((entry): entry is string => entry !== null)
      return createResultError(
        op,
        `Snapshot sweep skipped unproven versions; checkpoint retained: ${described.length > 0 ? described.join("; ") : "unknown versions"}`,
      )
    }
    if (typeof data.deletedChunks === "number") {
      if (!Number.isFinite(data.deletedChunks) || data.deletedChunks < 0)
        return createResultError(op, "Snapshot sweep reported unknown cleanup data; checkpoint retained")
      deletedChunks += data.deletedChunks
    }
    if (typeof data.scannedSnapshots === "number") {
      if (!Number.isFinite(data.scannedSnapshots) || data.scannedSnapshots < 0)
        return createResultError(op, "Snapshot sweep reported unknown scan counts; checkpoint retained")
      scannedSnapshots += data.scannedSnapshots
    }
    snapshotPages += 1
    if (data.isDone === true) break
    const next = data.continueCursor ?? null
    if (!next || next === cursor)
      return createResultError(op, "Snapshot sweep truncated; checkpoint retained for retry")
    cursor = next
  }
  return createResult({
    cleanedVersions: cleaned,
    deletedChunks,
    scannedSnapshots,
    snapshotPages,
    activeVersion: activeVersion ?? 0,
    externalArtifacts: "stripe-imap-pdf-reconciled-separately" as const,
  })
}
