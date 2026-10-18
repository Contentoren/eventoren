import * as v from "valibot"

import { dashCentsSchema } from "./dashCentsSchema.ts"
import { dashIdSchema } from "./dashIdSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"

export const dashPricePhaseSchema = v.object({
  id: dashIdSchema,
  name: v.string(),
  priceCents: dashCentsSchema,
  endsAt: v.nullable(dashIsoSchema),
  quota: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
})

export type DashPricePhase = v.InferOutput<typeof dashPricePhaseSchema>
