import * as v from "valibot"

import { dashBpsSchema } from "./dashBpsSchema.ts"
import { dashIdSchema } from "./dashIdSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"
import { dashMessageAudienceSchema } from "./dashMessageAudienceSchema.ts"
import { dashMessageKindSchema } from "./dashMessageKindSchema.ts"
import { dashMessageStatusSchema } from "./dashMessageStatusSchema.ts"

export const dashMessageSchema = v.object({
  id: dashIdSchema,
  eventId: dashIdSchema,
  kind: dashMessageKindSchema,
  audience: dashMessageAudienceSchema,
  subject: v.string(),
  body: v.string(),
  status: dashMessageStatusSchema,
  scheduledAt: v.nullable(dashIsoSchema),
  sentAt: v.nullable(dashIsoSchema),
  recipientCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  openRateBps: v.nullable(dashBpsSchema),
})

export type DashMessage = v.InferOutput<typeof dashMessageSchema>
