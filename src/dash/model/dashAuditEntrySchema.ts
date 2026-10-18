import * as v from "valibot"

import { dashAuditAreaSchema } from "./dashAuditAreaSchema.ts"
import { dashIdSchema } from "./dashIdSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"

export const dashAuditEntrySchema = v.object({
  id: dashIdSchema,
  orgId: dashIdSchema,
  eventId: v.nullable(dashIdSchema),
  at: dashIsoSchema,
  actor: v.string(),
  area: dashAuditAreaSchema,
  action: v.string(),
  before: v.nullable(v.string()),
  after: v.nullable(v.string()),
})

export type DashAuditEntry = v.InferOutput<typeof dashAuditEntrySchema>
