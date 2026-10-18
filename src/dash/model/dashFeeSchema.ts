import * as v from "valibot"

import { dashBpsSchema } from "./dashBpsSchema.ts"
import { dashCentsSchema } from "./dashCentsSchema.ts"
import { dashFeePayerSchema } from "./dashFeePayerSchema.ts"

export const dashFeeSchema = v.object({
  percentBps: dashBpsSchema,
  fixedCents: dashCentsSchema,
  payer: dashFeePayerSchema,
})

export type DashFee = v.InferOutput<typeof dashFeeSchema>
