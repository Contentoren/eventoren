import * as v from "valibot"

import { dashCentsSchema } from "./dashCentsSchema.ts"
import { dashIdSchema } from "./dashIdSchema.ts"

export const dashOrderVoucherUseSchema = v.object({
  voucherId: dashIdSchema,
  code: v.string(),
  amountCents: dashCentsSchema,
})

export type DashOrderVoucherUse = v.InferOutput<typeof dashOrderVoucherUseSchema>
