import * as v from "valibot"
import { createResult, createResultError, type Result } from "#result"
import { adminEventReleaseDateTimeToIso } from "#src/admin/adminEventReleaseDateTimeToIso.ts"
import type { OrganizerDashboardEventCreate } from "#src/organizer/dashboard/events/model/organizerDashboardEventCreateSchema.ts"
import { organizerDashboardEventCreateSchema } from "#src/organizer/dashboard/events/model/organizerDashboardEventCreateSchema.ts"

export type VeranstalterDashboardEventBaseForm = {
  readonly title: string
  readonly subtitle: string
  readonly description: string
  readonly category: string
  readonly startsAtLocal: string
  readonly endsAtLocal: string
  readonly doorsAtLocal: string
  readonly bookingOpensAtLocal: string
  readonly venue: string
  readonly city: string
  readonly address: string
  readonly organizer: string
  readonly imageUrl: string
  readonly imageAlt: string
}

export const veranstalterDashboardEventBaseFormEmpty: VeranstalterDashboardEventBaseForm = {
  title: "",
  subtitle: "",
  description: "",
  category: "",
  startsAtLocal: "",
  endsAtLocal: "",
  doorsAtLocal: "",
  bookingOpensAtLocal: "",
  venue: "",
  city: "",
  address: "",
  organizer: "",
  imageUrl: "",
  imageAlt: "",
}

/**
 * Validates Berlin wall-clock form input and converts it to UTC instants.
 * Datetime fields arrive as `YYYY-MM-DDTHH:mm` Europe/Berlin values.
 */
export function veranstalterDashboardEventFormValidate(
  form: VeranstalterDashboardEventBaseForm,
): Result<OrganizerDashboardEventCreate> {
  const op = "veranstalterDashboardEventFormValidate"
  if (form.title.trim().length === 0) return createResultError(op, "Bitte gib einen Veranstaltungstitel ein.")
  if (form.category.trim().length === 0) return createResultError(op, "Bitte gib eine Kategorie ein.")
  if (form.venue.trim().length === 0) return createResultError(op, "Bitte gib einen Veranstaltungsort ein.")
  if (form.city.trim().length === 0) return createResultError(op, "Bitte gib eine Stadt ein.")

  const startsAt = adminEventReleaseDateTimeToIso(form.startsAtLocal.trim())
  if (!startsAt.success) return startsAt
  if (startsAt.data.length === 0)
    return createResultError(op, "Bitte gib Beginn-Datum und Uhrzeit (Europe/Berlin) ein.")
  const endsAt = adminEventReleaseDateTimeToIso(form.endsAtLocal.trim())
  if (!endsAt.success) return endsAt
  if (endsAt.data.length === 0) return createResultError(op, "Bitte gib Ende-Datum und Uhrzeit (Europe/Berlin) ein.")
  const doorsAt = adminEventReleaseDateTimeToIso(form.doorsAtLocal.trim())
  if (!doorsAt.success) return doorsAt
  if (doorsAt.data.length === 0)
    return createResultError(op, "Bitte gib Einlass-Datum und Uhrzeit (Europe/Berlin) ein.")
  if (Date.parse(endsAt.data) <= Date.parse(startsAt.data)) {
    return createResultError(op, "Das Ende muss nach dem Beginn liegen.")
  }
  if (Date.parse(doorsAt.data) > Date.parse(startsAt.data)) {
    return createResultError(op, "Der Einlass darf nicht nach dem Beginn liegen.")
  }

  let bookingOpensAt: string | undefined
  if (form.bookingOpensAtLocal.trim().length > 0) {
    const converted = adminEventReleaseDateTimeToIso(form.bookingOpensAtLocal.trim())
    if (!converted.success) return converted
    bookingOpensAt = converted.data
  }

  const parsed = v.safeParse(organizerDashboardEventCreateSchema, {
    title: form.title.trim(),
    subtitle: form.subtitle,
    description: form.description,
    category: form.category.trim(),
    startsAt: startsAt.data,
    endsAt: endsAt.data,
    doorsAt: doorsAt.data,
    ...(bookingOpensAt === undefined ? {} : { bookingOpensAt }),
    venue: form.venue.trim(),
    city: form.city.trim(),
    address: form.address,
    organizer: form.organizer,
    imageUrl: form.imageUrl,
    imageAlt: form.imageAlt,
  })
  if (!parsed.success) return createResultError(op, parsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
  return createResult(parsed.output)
}
