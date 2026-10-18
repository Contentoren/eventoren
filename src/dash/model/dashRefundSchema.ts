import * as v from "valibot"

import { dashCentsSchema } from "./dashCentsSchema.ts"
import { dashIdSchema } from "./dashIdSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"

export const dashRefundSchema = v.object({
  id: dashIdSchema,
  amountCents: dashCentsSchema,
  feeCents: v.optional(dashCentsSchema, 0),
  reason: v.string(),
  at: dashIsoSchema,
  ticketIds: v.array(dashIdSchema),
})

export type DashRefund = v.InferOutput<typeof dashRefundSchema>
