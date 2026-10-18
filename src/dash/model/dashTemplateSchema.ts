import * as v from "valibot"

import { dashIdSchema } from "./dashIdSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"
import { dashTemplateEventSchema } from "./dashTemplateEventSchema.ts"
import { dashTemplateTicketTypeSchema } from "./dashTemplateTicketTypeSchema.ts"

export const dashTemplateSchema = v.object({
  id: dashIdSchema,
  orgId: dashIdSchema,
  name: v.string(),
  createdAt: dashIsoSchema,
  sourceEventId: v.nullable(dashIdSchema),
  durationMinutes: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
  doorsBeforeMinutes: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
  event: dashTemplateEventSchema,
  ticketTypes: v.array(dashTemplateTicketTypeSchema),
})

export type DashTemplate = v.InferOutput<typeof dashTemplateSchema>
