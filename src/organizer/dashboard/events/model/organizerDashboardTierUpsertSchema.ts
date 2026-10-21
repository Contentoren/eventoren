import * as v from "valibot"

const organizerDashboardTierDateSchema = v.pipe(
  v.string(),
  v.isoTimestamp("Tier date must be a valid ISO date and time"),
)

export const organizerDashboardTierUpsertSchema = v.object({
  tierKey: v.optional(v.pipe(v.string(), v.minLength(1))),
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.string(),
  startsAt: v.optional(organizerDashboardTierDateSchema),
  doorsAt: v.optional(v.string()),
  endsAt: v.optional(organizerDashboardTierDateSchema),
  priceCents: v.pipe(v.number(), v.integer(), v.minValue(0)),
  capacity: v.pipe(v.number(), v.integer(), v.minValue(0)),
  maxPerOrder: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  activationCodeRequired: v.optional(v.boolean()),
  sortOrder: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
})

export type OrganizerDashboardTierUpsert = v.InferOutput<typeof organizerDashboardTierUpsertSchema>
