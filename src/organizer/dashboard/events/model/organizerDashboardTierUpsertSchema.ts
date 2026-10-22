import * as v from "valibot"

const organizerDashboardTierDateSchema = v.pipe(
  v.string(),
  v.isoTimestamp("Bitte gib ein gültiges Datum mit Uhrzeit an (Europe/Berlin)."),
)

export const organizerDashboardTierUpsertSchema = v.object({
  tierKey: v.optional(v.pipe(v.string(), v.minLength(1, "Bitte ausfüllen, darf nicht leer sein."))),
  name: v.pipe(v.string(), v.minLength(1, "Bitte gib einen Tarifnamen ein.")),
  description: v.string(),
  startsAt: v.optional(organizerDashboardTierDateSchema),
  doorsAt: v.optional(v.string()),
  endsAt: v.optional(organizerDashboardTierDateSchema),
  priceCents: v.pipe(
    v.number(),
    v.integer("Der Preis muss in ganzen Cent angegeben werden."),
    v.minValue(0, "Der Preis darf nicht negativ sein."),
  ),
  capacity: v.pipe(
    v.number(),
    v.integer("Die Kapazität muss eine ganze Zahl sein."),
    v.minValue(0, "Die Kapazität darf nicht negativ sein."),
  ),
  maxPerOrder: v.optional(
    v.pipe(
      v.number(),
      v.integer("Die Maximalmenge muss eine ganze Zahl sein."),
      v.minValue(1, "Die Maximalmenge muss mindestens 1 sein."),
    ),
  ),
  activationCodeRequired: v.optional(v.boolean()),
  sortOrder: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0, "Die Sortierung darf nicht negativ sein."))),
})

export type OrganizerDashboardTierUpsert = v.InferOutput<typeof organizerDashboardTierUpsertSchema>
