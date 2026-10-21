import { createResult, createResultError, type Result } from "#result"
import type { OrganizerDashboardExportPageScope } from "./organizerDashboardExportCursorCreate.ts"

type ExportCursor = { readonly scope: OrganizerDashboardExportPageScope; readonly sourceCursor: string }

/** Parses an opaque export cursor and rejects cursors from another scope. */
export function organizerDashboardExportCursorParse(
  scope: OrganizerDashboardExportPageScope,
  cursor: string | null,
): Result<string | null> {
  const op = "organizerDashboardExportCursorParse"
  if (cursor === null) return createResult(null)
  let parsed: unknown
  try {
    parsed = JSON.parse(cursor) as unknown
  } catch {
    return createResultError(op, "Ungültiger Seitenzeiger")
  }
  const candidate = parsed as Partial<ExportCursor>
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    (candidate as { version?: unknown }).version !== 1 ||
    typeof candidate.sourceCursor !== "string" ||
    typeof candidate.scope !== "object" ||
    candidate.scope === null
  ) {
    return createResultError(op, "Ungültiger Seitenzeiger")
  }
  const stored = candidate.scope as Partial<OrganizerDashboardExportPageScope>
  if (
    stored.kind !== scope.kind ||
    stored.userId !== scope.userId ||
    stored.orgId !== scope.orgId ||
    stored.eventKey !== scope.eventKey ||
    stored.list !== scope.list ||
    stored.search !== scope.search
  ) {
    return createResultError(op, "Ungültiger Seitenzeiger")
  }
  return createResult(candidate.sourceCursor ?? null)
}
