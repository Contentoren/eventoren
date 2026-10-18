import * as v from "valibot"

import { dashIdSchema } from "./dashIdSchema.ts"
import { dashMessageAudienceTypeSchema } from "./dashMessageAudienceTypeSchema.ts"

export const dashMessageAudienceSchema = v.object({
  type: dashMessageAudienceTypeSchema,
  ticketTypeIds: v.array(dashIdSchema),
})

export type DashMessageAudience = v.InferOutput<typeof dashMessageAudienceSchema>
