import * as v from "valibot"

import { dashEntranceSchema } from "./dashEntranceSchema.ts"
import { dashIdSchema } from "./dashIdSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"

export const dashScannerLinkSchema = v.object({
  id: dashIdSchema,
  eventId: dashIdSchema,
  label: v.string(),
  entrance: dashEntranceSchema,
  token: v.string(),
  createdAt: dashIsoSchema,
  lastUsedAt: v.nullable(dashIsoSchema),
  revokedAt: v.nullable(dashIsoSchema),
})

export type DashScannerLink = v.InferOutput<typeof dashScannerLinkSchema>
