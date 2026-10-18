import * as v from "valibot"

import { dashEntranceSchema } from "./dashEntranceSchema.ts"
import { dashIdSchema } from "./dashIdSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"
import { dashTicketStatusSchema } from "./dashTicketStatusSchema.ts"

export const dashTicketSchema = v.object({
  id: dashIdSchema,
  orderId: dashIdSchema,
  eventId: dashIdSchema,
  ticketTypeId: dashIdSchema,
  code: v.pipe(v.string(), v.regex(/^T-[A-Z0-9]{4}-[A-Z0-9]{4}$/)),
  holderName: v.string(),
  holderEmail: v.string(),
  status: dashTicketStatusSchema,
  checkedInAt: v.nullable(dashIsoSchema),
  entrance: v.nullable(dashEntranceSchema),
})

export type DashTicket = v.InferOutput<typeof dashTicketSchema>
