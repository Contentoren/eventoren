import * as v from "valibot"

import { dashIsoSchema } from "./dashIsoSchema.ts"

export const dashOrderEmailSchema = v.object({
  at: dashIsoSchema,
  to: v.string(),
  kind: v.string(),
})

export type DashOrderEmail = v.InferOutput<typeof dashOrderEmailSchema>
