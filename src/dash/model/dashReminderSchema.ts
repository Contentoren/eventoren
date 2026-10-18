import * as v from "valibot"

import { dashIsoSchema } from "./dashIsoSchema.ts"

export const dashReminderSchema = v.object({
  enabled: v.boolean(),
  hoursBefore: v.pipe(v.number(), v.integer(), v.minValue(0)),
  directions: v.string(),
  calendar: v.string(),
  sentAt: v.nullable(dashIsoSchema),
})

export type DashReminder = v.InferOutput<typeof dashReminderSchema>
