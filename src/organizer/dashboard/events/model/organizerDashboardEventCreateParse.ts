import * as v from "valibot"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { OrganizerDashboardEventCreate } from "#src/organizer/dashboard/events/model/organizerDashboardEventCreateSchema.ts"
import { organizerDashboardEventCreateSchema } from "#src/organizer/dashboard/events/model/organizerDashboardEventCreateSchema.ts"
import { organizerDashboardEventInstantNormalize } from "#src/organizer/dashboard/events/model/organizerDashboardEventInstantNormalize.ts"

const op = "organizerDashboardEventCreateParse"

export async function organizerDashboardEventCreateParse(input: unknown): PromiseResult<OrganizerDashboardEventCreate> {
  const parsed = v.safeParse(organizerDashboardEventCreateSchema, input)
  if (!parsed.success) return createResultError(op, v.summarize(parsed.issues))
  if (parsed.output.title.trim().length === 0) return createResultError(op, "Title is required")
  if (parsed.output.category.trim().length === 0) return createResultError(op, "Category is required")
  if (parsed.output.venue.trim().length === 0) return createResultError(op, "Venue is required")
  if (parsed.output.city.trim().length === 0) return createResultError(op, "City is required")

  const startsAt = await organizerDashboardEventInstantNormalize(parsed.output.startsAt)
  if (!startsAt.success) return startsAt
  const endsAt = await organizerDashboardEventInstantNormalize(parsed.output.endsAt)
  if (!endsAt.success) return endsAt
  const doorsAt = await organizerDashboardEventInstantNormalize(parsed.output.doorsAt)
  if (!doorsAt.success) return doorsAt
  let bookingOpensAt: string | undefined
  if (parsed.output.bookingOpensAt !== undefined) {
    const normalized = await organizerDashboardEventInstantNormalize(parsed.output.bookingOpensAt)
    if (!normalized.success) return normalized
    bookingOpensAt = normalized.data
  }

  if (Date.parse(endsAt.data) <= Date.parse(startsAt.data)) {
    return createResultError(op, "End time must be after start time")
  }
  if (Date.parse(doorsAt.data) > Date.parse(startsAt.data)) {
    return createResultError(op, "Admission time must not be after start time")
  }
  return createResult({
    ...parsed.output,
    startsAt: startsAt.data,
    endsAt: endsAt.data,
    doorsAt: doorsAt.data,
    ...(bookingOpensAt === undefined ? {} : { bookingOpensAt }),
  })
}
