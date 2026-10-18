import * as v from "valibot"

import { dashIdSchema } from "./dashIdSchema.ts"

export const dashScheduleItemSchema = v.object({
  id: dashIdSchema,
  time: v.pipe(v.string(), v.regex(/^([01]\d|2[0-3]):[0-5]\d$/)),
  title: v.string(),
  detail: v.string(),
})

export type DashScheduleItem = v.InferOutput<typeof dashScheduleItemSchema>
