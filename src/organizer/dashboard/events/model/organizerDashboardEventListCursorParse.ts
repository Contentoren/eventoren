import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardEventListCursorVersion } from "./organizerDashboardEventListCursorCreate.ts"

const op = "organizerDashboardEventListCursorParse"

export async function organizerDashboardEventListCursorParse(args: {
  cursor: string | null
  userId: string
  orgId: string
  status: string | null
  sort: string | null
  search: string
  fromStartsAt: string | null
  toStartsAt: string | null
}): PromiseResult<string | null> {
  if (args.cursor === null) return createResult(null)
  let parsed: unknown
  try {
    parsed = JSON.parse(args.cursor)
  } catch {
    return createResultError(op, "Invalid event page cursor")
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    parsed.version !== organizerDashboardEventListCursorVersion ||
    !("userId" in parsed) ||
    parsed.userId !== args.userId ||
    !("orgId" in parsed) ||
    parsed.orgId !== args.orgId ||
    !("status" in parsed) ||
    parsed.status !== args.status ||
    !("sort" in parsed) ||
    parsed.sort !== args.sort ||
    !("search" in parsed) ||
    parsed.search !== args.search ||
    !("fromStartsAt" in parsed) ||
    parsed.fromStartsAt !== args.fromStartsAt ||
    !("toStartsAt" in parsed) ||
    parsed.toStartsAt !== args.toStartsAt ||
    !("sourceCursor" in parsed) ||
    typeof parsed.sourceCursor !== "string"
  ) {
    return createResultError(op, "Event page cursor does not match the current filters")
  }
  return createResult(parsed.sourceCursor)
}
