import * as v from "valibot"

import { dashTaxRateSchema } from "./dashTaxRateSchema.ts"
import { dashTaxStatusSchema } from "./dashTaxStatusSchema.ts"

export const dashTaxSchema = v.object({
  status: dashTaxStatusSchema,
  defaultRateBps: dashTaxRateSchema,
})

export type DashTax = v.InferOutput<typeof dashTaxSchema>
