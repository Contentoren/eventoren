import * as v from "valibot"

import { dashCentsSchema } from "./dashCentsSchema.ts"
import { dashIdSchema } from "./dashIdSchema.ts"

export const dashOrderDiscountSchema = v.object({
  codeId: dashIdSchema,
  code: v.string(),
  amountCents: dashCentsSchema,
})

export type DashOrderDiscount = v.InferOutput<typeof dashOrderDiscountSchema>
