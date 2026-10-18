import * as v from "valibot"

import { dashCentsSchema } from "./dashCentsSchema.ts"
import { dashTaxRateSchema } from "./dashTaxRateSchema.ts"
import { dashTicketChannelSchema } from "./dashTicketChannelSchema.ts"

const dashMinuteOffsetSchema = v.nullable(v.pipe(v.number(), v.integer()))

export const dashTemplateTicketTypeSchema = v.object({
  name: v.string(),
  description: v.string(),
  channel: dashTicketChannelSchema,
  hidden: v.boolean(),
  capacity: v.pipe(v.number(), v.integer(), v.minValue(0)),
  maxPerOrder: v.pipe(v.number(), v.integer(), v.minValue(1)),
  taxRateBps: dashTaxRateSchema,
  sortOrder: v.pipe(v.number(), v.integer(), v.minValue(0)),
  salesStartOffsetMinutes: dashMinuteOffsetSchema,
  salesEndOffsetMinutes: dashMinuteOffsetSchema,
  phases: v.pipe(
    v.array(
      v.object({
        name: v.string(),
        priceCents: dashCentsSchema,
        endsOffsetMinutes: dashMinuteOffsetSchema,
        quota: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
      }),
    ),
    v.minLength(1),
  ),
})

export type DashTemplateTicketType = v.InferOutput<typeof dashTemplateTicketTypeSchema>
