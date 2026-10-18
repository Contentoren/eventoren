import * as v from "valibot"

import { dashCentsSchema } from "./dashCentsSchema.ts"
import { dashIdSchema } from "./dashIdSchema.ts"
import { dashTaxRateSchema } from "./dashTaxRateSchema.ts"

export const dashOrderLineSchema = v.object({
  ticketTypeId: dashIdSchema,
  phaseId: dashIdSchema,
  name: v.string(),
  unitPriceCents: dashCentsSchema,
  quantity: v.pipe(v.number(), v.integer(), v.minValue(1)),
  taxRateBps: dashTaxRateSchema,
})

export type DashOrderLine = v.InferOutput<typeof dashOrderLineSchema>
