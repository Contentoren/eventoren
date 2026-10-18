import * as v from "valibot"

import { dashCentsSchema } from "./dashCentsSchema.ts"
import { dashCodeKindSchema } from "./dashCodeKindSchema.ts"
import { dashDiscountTypeSchema } from "./dashDiscountTypeSchema.ts"
import { dashIdSchema } from "./dashIdSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"

export const dashCodeSchema = v.object({
  id: dashIdSchema,
  eventId: dashIdSchema,
  kind: dashCodeKindSchema,
  code: v.pipe(v.string(), v.regex(/^[A-Z0-9-]+$/)),
  ticketTypeIds: v.array(dashIdSchema),
  maxTickets: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1))),
  usedTickets: v.pipe(v.number(), v.integer(), v.minValue(0)),
  validFrom: v.nullable(dashIsoSchema),
  validUntil: v.nullable(dashIsoSchema),
  active: v.boolean(),
  note: v.string(),
  createdAt: dashIsoSchema,
  discount: v.nullable(
    v.object({
      type: dashDiscountTypeSchema,
      value: dashCentsSchema,
    }),
  ),
})

export type DashCode = v.InferOutput<typeof dashCodeSchema>
