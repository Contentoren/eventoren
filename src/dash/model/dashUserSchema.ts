import * as v from "valibot"

import { dashIdSchema } from "./dashIdSchema.ts"

export const dashUserSchema = v.object({
  id: dashIdSchema,
  name: v.string(),
  email: v.string(),
})

export type DashUser = v.InferOutput<typeof dashUserSchema>
