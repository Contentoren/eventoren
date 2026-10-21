import * as v from "valibot"

/** Optional operational override of the buyer contact; the invoice snapshot stays untouched. */
export const organizerDashboardOrderBuyerContactSchema = v.object({
  givenName: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(120))),
  familyName: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(120))),
  email: v.optional(v.union([v.literal(""), v.pipe(v.string(), v.trim(), v.maxLength(254), v.email())])),
  phone: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(80))),
})

export type OrganizerDashboardOrderBuyerContactInput = v.InferOutput<typeof organizerDashboardOrderBuyerContactSchema>
