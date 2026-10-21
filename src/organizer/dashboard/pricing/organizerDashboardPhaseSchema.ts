import * as v from "valibot"

export const organizerDashboardPhaseNameSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "Name erforderlich"),
  v.maxLength(80, "Name maximal 80 Zeichen"),
)

export const organizerDashboardPhasePriceSchema = v.pipe(
  v.number(),
  v.integer("Preis in ganzen Cent"),
  v.minValue(0, "Preis darf nicht negativ sein"),
)

const isoInstant = v.pipe(v.string(), v.isoTimestamp("Zeitpunkt als ISO-UTC erforderlich"))

const eventKey = v.pipe(v.string(), v.trim(), v.minLength(1, "Cannot be empty"), v.maxLength(200))

const tierKey = v.pipe(v.string(), v.trim(), v.minLength(1, "Cannot be empty"), v.maxLength(200))

const phaseKey = v.pipe(v.string(), v.trim(), v.minLength(1, "Cannot be empty"), v.maxLength(100))

/** One automatic price phase: ends at `endsAt` or after `quota` sales, whichever comes first. */
export const organizerDashboardPhaseSchema = v.strictObject({
  eventKey,
  tierKey,
  phaseKey,
  name: organizerDashboardPhaseNameSchema,
  priceCents: organizerDashboardPhasePriceSchema,
  endsAt: v.optional(isoInstant),
  quota: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1, "Kontingent mindestens 1"))),
  soldCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  sortOrder: v.pipe(v.number(), v.integer(), v.minValue(0)),
})

export type OrganizerDashboardPhase = v.InferOutput<typeof organizerDashboardPhaseSchema>

export const organizerDashboardPhaseUpsertSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
  phaseId: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1))),
  eventKey,
  tierKey,
  name: organizerDashboardPhaseNameSchema,
  priceCents: organizerDashboardPhasePriceSchema,
  endsAt: v.optional(isoInstant),
  quota: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1, "Kontingent mindestens 1"))),
  soldCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  sortOrder: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
})

export type OrganizerDashboardPhaseUpsert = v.InferOutput<typeof organizerDashboardPhaseUpsertSchema>

export const organizerDashboardPhaseArchiveSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
  phaseId: v.pipe(v.string(), v.trim(), v.minLength(1, "Cannot be empty")),
})

export type OrganizerDashboardPhaseArchive = v.InferOutput<typeof organizerDashboardPhaseArchiveSchema>

export const organizerDashboardPhaseListFilterSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
  eventKey,
  tierKey: v.optional(tierKey),
})

export type OrganizerDashboardPhaseListFilter = v.InferOutput<typeof organizerDashboardPhaseListFilterSchema>
