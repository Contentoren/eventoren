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

const isoInstant = v.pipe(v.string(), v.isoTimestamp("Bitte gib einen gültigen Zeitpunkt an (Europe/Berlin)."))

const eventKey = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "Bitte ausfüllen, darf nicht leer sein."),
  v.maxLength(200, "Höchstens 200 Zeichen erlaubt."),
)

const tierKey = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "Bitte ausfüllen, darf nicht leer sein."),
  v.maxLength(200, "Höchstens 200 Zeichen erlaubt."),
)

const phaseKey = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "Bitte ausfüllen, darf nicht leer sein."),
  v.maxLength(100, "Höchstens 100 Zeichen erlaubt."),
)

/** One automatic price phase: ends at `endsAt` or after `quota` sales, whichever comes first. */
export const organizerDashboardPhaseSchema = v.strictObject({
  eventKey,
  tierKey,
  phaseKey,
  name: organizerDashboardPhaseNameSchema,
  priceCents: organizerDashboardPhasePriceSchema,
  endsAt: v.optional(isoInstant),
  quota: v.optional(
    v.pipe(
      v.number(),
      v.integer("Das Kontingent muss eine ganze Zahl sein."),
      v.minValue(1, "Kontingent mindestens 1"),
    ),
  ),
  soldCount: v.pipe(
    v.number(),
    v.integer("Der Wert muss eine ganze Zahl sein."),
    v.minValue(0, "Der Wert darf nicht negativ sein."),
  ),
  sortOrder: v.pipe(
    v.number(),
    v.integer("Der Wert muss eine ganze Zahl sein."),
    v.minValue(0, "Der Wert darf nicht negativ sein."),
  ),
})

export type OrganizerDashboardPhase = v.InferOutput<typeof organizerDashboardPhaseSchema>

export const organizerDashboardPhaseUpsertSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Bitte wähle zuerst eine Organisation.")),
  phaseId: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1, "Bitte ausfüllen, darf nicht leer sein."))),
  eventKey,
  tierKey,
  name: organizerDashboardPhaseNameSchema,
  priceCents: organizerDashboardPhasePriceSchema,
  endsAt: v.optional(isoInstant),
  quota: v.optional(
    v.pipe(
      v.number(),
      v.integer("Das Kontingent muss eine ganze Zahl sein."),
      v.minValue(1, "Kontingent mindestens 1"),
    ),
  ),
  soldCount: v.optional(
    v.pipe(
      v.number(),
      v.integer("Der Wert muss eine ganze Zahl sein."),
      v.minValue(0, "Der Wert darf nicht negativ sein."),
    ),
  ),
  sortOrder: v.optional(
    v.pipe(
      v.number(),
      v.integer("Der Wert muss eine ganze Zahl sein."),
      v.minValue(0, "Der Wert darf nicht negativ sein."),
    ),
  ),
})

export type OrganizerDashboardPhaseUpsert = v.InferOutput<typeof organizerDashboardPhaseUpsertSchema>

export const organizerDashboardPhaseArchiveSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Bitte wähle zuerst eine Organisation.")),
  phaseId: v.pipe(v.string(), v.trim(), v.minLength(1, "Cannot be empty")),
})

export type OrganizerDashboardPhaseArchive = v.InferOutput<typeof organizerDashboardPhaseArchiveSchema>

export const organizerDashboardPhaseListFilterSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Bitte wähle zuerst eine Organisation.")),
  eventKey,
  tierKey: v.optional(tierKey),
})

export type OrganizerDashboardPhaseListFilter = v.InferOutput<typeof organizerDashboardPhaseListFilterSchema>
