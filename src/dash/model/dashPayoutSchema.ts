import * as v from "valibot"

import { dashCentsSchema } from "./dashCentsSchema.ts"
import { dashIdSchema } from "./dashIdSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"
import { dashPayoutStatusSchema } from "./dashPayoutStatusSchema.ts"

export const dashPayoutSchema = v.object({
  id: dashIdSchema,
  orgId: dashIdSchema,
  eventId: dashIdSchema,
  amountCents: dashCentsSchema,
  status: dashPayoutStatusSchema,
  dueAt: dashIsoSchema,
  paidAt: v.nullable(dashIsoSchema),
  reference: v.string(),
})

export type DashPayout = v.InferOutput<typeof dashPayoutSchema>
