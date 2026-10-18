import * as v from "valibot"

import { dashIdSchema } from "./dashIdSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"

export const dashGuestSchema = v.object({
  id: dashIdSchema,
  eventId: dashIdSchema,
  quotaId: v.nullable(dashIdSchema),
  name: v.string(),
  email: v.string(),
  plusOnes: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(5)),
  note: v.string(),
  ticketId: v.nullable(dashIdSchema),
  checkedInAt: v.nullable(dashIsoSchema),
  createdAt: dashIsoSchema,
})

export type DashGuest = v.InferOutput<typeof dashGuestSchema>
