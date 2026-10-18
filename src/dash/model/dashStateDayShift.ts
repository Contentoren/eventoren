import { adminEventReleaseDateTimeFromIso } from "../../admin/adminEventReleaseDateTimeFromIso.ts"
import { adminEventReleaseDateTimeToIso } from "../../admin/adminEventReleaseDateTimeToIso.ts"
import type { DashState } from "./dashStateSchema.ts"

const dashIsoInstantPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})$/

function dashDayShiftIso(value: string, days: number): string {
  const local = adminEventReleaseDateTimeFromIso(value)
  if (!local) return value
  const base = Date.parse(`${local.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(base)) return value
  const shiftedDay = new Date(base + days * 86_400_000).toISOString().slice(0, 10)
  const converted = adminEventReleaseDateTimeToIso(`${shiftedDay}T${local.slice(11)}`)
  if (!converted.success) return value
  return converted.data
}

function dashDayShiftNode(node: unknown, key: string | null, days: number): unknown {
  if (typeof node === "string") {
    if (
      key !== null &&
      (key === "at" || key === "validFrom" || key === "validUntil" || key.endsWith("At")) &&
      dashIsoInstantPattern.test(node)
    )
      return dashDayShiftIso(node, days)
    return node
  }
  if (Array.isArray(node)) return node.map((item) => dashDayShiftNode(item, null, days))
  if (node !== null && typeof node === "object") {
    const shifted: Record<string, unknown> = {}
    for (const [childKey, child] of Object.entries(node)) shifted[childKey] = dashDayShiftNode(child, childKey, days)
    return shifted
  }
  return node
}

export function dashStateDayShift(state: DashState, days: number): DashState {
  if (days === 0) return state
  return dashDayShiftNode(state, null, days) as DashState
}
