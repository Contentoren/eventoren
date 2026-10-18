import * as v from "valibot"

import { dashIdSchema } from "./dashIdSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"

export const dashNoteSchema = v.object({
  id: dashIdSchema,
  text: v.string(),
  author: v.string(),
  at: dashIsoSchema,
})

export type DashNote = v.InferOutput<typeof dashNoteSchema>
