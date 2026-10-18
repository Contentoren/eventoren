import * as v from "valibot"

import { dashBoxOfficeSaleLineSchema } from "./dashBoxOfficeSaleLineSchema.ts"
import { dashBoxOfficeSaleStatusSchema } from "./dashBoxOfficeSaleStatusSchema.ts"
import { dashCentsSchema } from "./dashCentsSchema.ts"
import { dashIdSchema } from "./dashIdSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"

export const dashBoxOfficeSaleSchema = v.object({
  id: dashIdSchema,
  eventId: dashIdSchema,
  lines: v.array(dashBoxOfficeSaleLineSchema),
  totalCents: dashCentsSchema,
  status: dashBoxOfficeSaleStatusSchema,
  createdAt: dashIsoSchema,
  paidAt: v.nullable(dashIsoSchema),
  orderId: v.nullable(dashIdSchema),
  buyerEmail: v.nullable(v.string()),
})

export type DashBoxOfficeSale = v.InferOutput<typeof dashBoxOfficeSaleSchema>
