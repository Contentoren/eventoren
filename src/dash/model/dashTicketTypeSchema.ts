import * as v from "valibot"

import { dashIdSchema } from "./dashIdSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"
import { dashPricePhaseSchema } from "./dashPricePhaseSchema.ts"
import { dashTaxRateSchema } from "./dashTaxRateSchema.ts"
import { dashTicketChannelSchema } from "./dashTicketChannelSchema.ts"

export const dashTicketTypeSchema = v.object({
  id: dashIdSchema,
  eventId: dashIdSchema,
  name: v.string(),
  description: v.string(),
  channel: dashTicketChannelSchema,
  hidden: v.boolean(),
  capacity: v.pipe(v.number(), v.integer(), v.minValue(0)),
  maxPerOrder: v.pipe(v.number(), v.integer(), v.minValue(1)),
  taxRateBps: dashTaxRateSchema,
  sortOrder: v.pipe(v.number(), v.integer(), v.minValue(0)),
  archivedAt: v.nullable(dashIsoSchema),
  salesStartAt: v.nullable(dashIsoSchema),
  salesEndAt: v.nullable(dashIsoSchema),
  phases: v.pipe(v.array(dashPricePhaseSchema), v.minLength(1)),
})

export type DashTicketType = v.InferOutput<typeof dashTicketTypeSchema>
