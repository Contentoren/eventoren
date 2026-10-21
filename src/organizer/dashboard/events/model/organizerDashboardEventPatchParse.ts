import * as v from "valibot"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardEventInstantNormalize } from "#src/organizer/dashboard/events/model/organizerDashboardEventInstantNormalize.ts"
import type { OrganizerDashboardEventPatch } from "#src/organizer/dashboard/events/model/organizerDashboardEventPatchSchema.ts"
import { organizerDashboardEventPatchSchema } from "#src/organizer/dashboard/events/model/organizerDashboardEventPatchSchema.ts"

const op = "organizerDashboardEventPatchParse"

export async function organizerDashboardEventPatchParse(input: unknown): PromiseResult<OrganizerDashboardEventPatch> {
  const parsed = v.safeParse(organizerDashboardEventPatchSchema, input)
  if (!parsed.success) return createResultError(op, v.summarize(parsed.issues))
  if (parsed.output.title !== undefined && parsed.output.title.trim().length === 0) {
    return createResultError(op, "Title is required")
  }
  if (parsed.output.category !== undefined && parsed.output.category.trim().length === 0) {
    return createResultError(op, "Category is required")
  }
  if (parsed.output.venue !== undefined && parsed.output.venue.trim().length === 0) {
    return createResultError(op, "Venue is required")
  }
  if (parsed.output.city !== undefined && parsed.output.city.trim().length === 0) {
    return createResultError(op, "City is required")
  }

  const normalized: OrganizerDashboardEventPatch = { ...parsed.output }
  for (const key of ["startsAt", "endsAt", "doorsAt", "bookingOpensAt"] as const) {
    const value = parsed.output[key]
    if (value === undefined) continue
    const result = await organizerDashboardEventInstantNormalize(value)
    if (!result.success) return result
    normalized[key] = result.data
  }
  if (
    normalized.startsAt !== undefined &&
    normalized.endsAt !== undefined &&
    Date.parse(normalized.endsAt) <= Date.parse(normalized.startsAt)
  ) {
    return createResultError(op, "End time must be after start time")
  }
  if (
    normalized.startsAt !== undefined &&
    normalized.doorsAt !== undefined &&
    Date.parse(normalized.doorsAt) > Date.parse(normalized.startsAt)
  ) {
    return createResultError(op, "Admission time must not be after start time")
  }
  return createResult(normalized)
}
