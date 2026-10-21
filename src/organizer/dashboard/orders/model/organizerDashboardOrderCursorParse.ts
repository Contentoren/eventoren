import * as v from "valibot"
import { createResult, createResultError } from "#result"
import type { OrganizerDashboardOrderPageScope } from "./organizerDashboardOrderPageScope.ts"

const schema = v.object({
  version: v.literal(1),
  sourceCursor: v.string(),
  scope: v.object({
    kind: v.picklist(["orders", "participants"]),
    userId: v.string(),
    orgId: v.string(),
    eventKey: v.nullable(v.string()),
    status: v.nullable(v.string()),
    search: v.string(),
  }),
})

export function organizerDashboardOrderCursorParse(scope: OrganizerDashboardOrderPageScope, cursor: string | null) {
  const op = "organizerDashboardOrderCursorParse"
  if (cursor === null) return createResult(null)
  if (cursor.length > 32768) return createResultError(op, "Ungültiger Seitencursor")
  let input: unknown
  try {
    input = JSON.parse(cursor)
  } catch {
    return createResultError(op, "Ungültiger Seitencursor")
  }
  const parsed = v.safeParse(schema, input)
  if (
    !parsed.success ||
    Object.entries(scope).some(([key, value]) => parsed.output.scope[key as keyof typeof scope] !== value)
  ) {
    return createResultError(op, "Seitencursor passt nicht zu Organisation, Benutzer und Filtern")
  }
  return createResult(parsed.output.sourceCursor)
}
