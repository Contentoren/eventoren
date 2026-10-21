import * as v from "valibot"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardEventInstantNormalize } from "#src/organizer/dashboard/events/model/organizerDashboardEventInstantNormalize.ts"
import type { OrganizerDashboardTierUpsert } from "#src/organizer/dashboard/events/model/organizerDashboardTierUpsertSchema.ts"
import { organizerDashboardTierUpsertSchema } from "#src/organizer/dashboard/events/model/organizerDashboardTierUpsertSchema.ts"

const op = "organizerDashboardTierUpsertParse"

export async function organizerDashboardTierUpsertParse(input: unknown): PromiseResult<OrganizerDashboardTierUpsert> {
  const parsed = v.safeParse(organizerDashboardTierUpsertSchema, input)
  if (!parsed.success) return createResultError(op, v.summarize(parsed.issues))
  if (parsed.output.name.trim().length === 0) return createResultError(op, "Tier name is required")

  const normalized: OrganizerDashboardTierUpsert = { ...parsed.output }
  for (const key of ["startsAt", "endsAt"] as const) {
    const value = parsed.output[key]
    if (value === undefined) continue
    const result = await organizerDashboardEventInstantNormalize(value)
    if (!result.success) return result
    normalized[key] = result.data
  }
  if (parsed.output.doorsAt !== undefined && parsed.output.doorsAt.trim().length > 0) {
    const result = await organizerDashboardEventInstantNormalize(parsed.output.doorsAt)
    if (!result.success) return createResultError(op, "Admission time must be a valid date and time")
    normalized.doorsAt = result.data
  }
  if (
    normalized.startsAt !== undefined &&
    normalized.endsAt !== undefined &&
    Date.parse(normalized.endsAt) <= Date.parse(normalized.startsAt)
  ) {
    return createResultError(op, "End time must be after start time")
  }
  return createResult(normalized)
}
