import type { DatabaseReader } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"

/**
 * Explicit scanner ownership scope binding. Scanner links carry a
 * server-computed per-event ownership snapshot (`eventOrgIds`); Bearer [REDACTED]
 * never set it. Legacy links without a snapshot keep working while their
 * events stay unowned; once an event becomes owned, only a snapshot that
 * matches the canonical owner (for the link AND its parent, when it is a
 * helper) keeps working. Re-binding a stale link requires explicit admin
 * reapproval through the migration manifest, never silent carry-over.
 */

export type OrganizerDashboardMigrationScannerSnapshot = Record<string, Id<"orgs"> | null>

type SnapshotCarrier = {
  readonly eventOrgIds?: OrganizerDashboardMigrationScannerSnapshot | undefined
}

export function organizerDashboardMigrationScannerSnapshotRead(
  link: SnapshotCarrier,
): OrganizerDashboardMigrationScannerSnapshot {
  return { ...(link.eventOrgIds ?? {}) }
}

/**
 * Bounded canonical ownership lookup for at most 50 explicitly selected event
 * keys via the eventKey index (never a catalog scan). Resolves each key to
 * its canonical org id, or null while the event stays unowned.
 */
export async function organizerDashboardMigrationScannerSnapshotCreate(
  db: DatabaseReader,
  eventKeys: readonly string[],
): PromiseResult<OrganizerDashboardMigrationScannerSnapshot> {
  const op = "organizerDashboardMigrationScannerSnapshotCreate"
  const snapshot: OrganizerDashboardMigrationScannerSnapshot = {}
  for (const eventKey of eventKeys) {
    const event = await db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
      .unique()
    if (!event) return createResultError(op, "Event not found")
    snapshot[eventKey] = event.orgId ?? null
  }
  return createResult(snapshot)
}

/**
 * Parent consistency for helper creation: the child inherits the canonical
 * snapshot for its selected keys, and the parent must also approve each key.
 * A legacy parent without a snapshot only covers still-unowned events; any
 * owned event under it needs migration reapproval first.
 */
export function organizerDashboardMigrationScannerParentSnapshotAllowed(args: {
  readonly eventKeys: readonly string[]
  readonly canonical: OrganizerDashboardMigrationScannerSnapshot
  readonly parentSnapshot: OrganizerDashboardMigrationScannerSnapshot | undefined
}): boolean {
  for (const eventKey of args.eventKeys) {
    const canonicalOrgId = args.canonical[eventKey] ?? null
    if (args.parentSnapshot === undefined) {
      if (canonicalOrgId !== null) return false
      continue
    }
    if ((args.parentSnapshot[eventKey] ?? null) !== canonicalOrgId) return false
  }
  return true
}

/**
 * Bearer [REDACTED] ownership gate for one event. Still-unowned canonical events
 * stay accessible to legacy unbound links. Owned canonical events require an
 * exact snapshot match on the link, and additionally on the parent when the
 * link is a helper. Comparisons are per accessed event only: no scan, no
 * revocation fan-out.
 */
export function organizerDashboardMigrationScannerOwnershipAllowed(args: {
  readonly eventKey: string
  readonly canonicalOrgId: Id<"orgs"> | undefined
  readonly linkSnapshot: OrganizerDashboardMigrationScannerSnapshot | undefined
  readonly parentSnapshot: OrganizerDashboardMigrationScannerSnapshot | undefined
  readonly isHelper: boolean
}): boolean {
  if (args.canonicalOrgId === undefined) return true
  if ((args.linkSnapshot?.[args.eventKey] ?? null) !== args.canonicalOrgId) return false
  if (args.isHelper && (args.parentSnapshot?.[args.eventKey] ?? null) !== args.canonicalOrgId) return false
  return true
}
