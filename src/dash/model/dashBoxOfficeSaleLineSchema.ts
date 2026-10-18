import * as v from "valibot"

import { dashCentsSchema } from "./dashCentsSchema.ts"
import { dashIdSchema } from "./dashIdSchema.ts"

export const dashBoxOfficeSaleLineSchema = v.object({
  ticketTypeId: dashIdSchema,
  quantity: v.pipe(v.number(), v.integer(), v.minValue(1)),
  unitPriceCents: dashCentsSchema,
})

export type DashBoxOfficeSaleLine = v.InferOutput<typeof dashBoxOfficeSaleLineSchema>
