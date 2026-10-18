import * as v from "valibot"

import { dashCentsSchema } from "./dashCentsSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"

export const dashChargebackSchema = v.object({
  amountCents: dashCentsSchema,
  feeCents: dashCentsSchema,
  at: dashIsoSchema,
})

export type DashChargeback = v.InferOutput<typeof dashChargebackSchema>
