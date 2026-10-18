import * as v from "valibot"

import { dashIdSchema } from "./dashIdSchema.ts"

export const dashGuestQuotaSchema = v.object({
  id: dashIdSchema,
  eventId: dashIdSchema,
  name: v.string(),
  limit: v.pipe(v.number(), v.integer(), v.minValue(0)),
})

export type DashGuestQuota = v.InferOutput<typeof dashGuestQuotaSchema>
