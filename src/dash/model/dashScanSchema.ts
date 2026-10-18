import * as v from "valibot"

import { dashEntranceSchema } from "./dashEntranceSchema.ts"
import { dashIdSchema } from "./dashIdSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"
import { dashScanResultSchema } from "./dashScanResultSchema.ts"

export const dashScanSchema = v.object({
  id: dashIdSchema,
  eventId: dashIdSchema,
  at: dashIsoSchema,
  entrance: dashEntranceSchema,
  device: v.string(),
  ticketId: v.nullable(dashIdSchema),
  code: v.string(),
  result: dashScanResultSchema,
})

export type DashScan = v.InferOutput<typeof dashScanSchema>
