import * as v from "valibot"

import { dashIdSchema } from "./dashIdSchema.ts"

export const dashFaqItemSchema = v.object({
  id: dashIdSchema,
  question: v.string(),
  answer: v.string(),
})

export type DashFaqItem = v.InferOutput<typeof dashFaqItemSchema>
