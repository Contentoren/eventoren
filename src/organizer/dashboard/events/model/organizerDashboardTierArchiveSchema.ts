import * as v from "valibot"

export const organizerDashboardTierArchiveSchema = v.object({
  tierKey: v.pipe(v.string(), v.minLength(1)),
})

export type OrganizerDashboardTierArchive = v.InferOutput<typeof organizerDashboardTierArchiveSchema>
