import * as v from "valibot"

import { dashCentsSchema } from "./dashCentsSchema.ts"
import { dashIdSchema } from "./dashIdSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"

export const dashVoucherRedemptionSchema = v.object({
  orderId: dashIdSchema,
  amountCents: dashCentsSchema,
  at: dashIsoSchema,
})

export type DashVoucherRedemption = v.InferOutput<typeof dashVoucherRedemptionSchema>
