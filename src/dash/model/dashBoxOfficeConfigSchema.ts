import * as v from "valibot"

import { dashIsoSchema } from "./dashIsoSchema.ts"

export const dashBoxOfficeConfigSchema = v.object({
  enabled: v.boolean(),
  opensAt: v.nullable(dashIsoSchema),
})

export type DashBoxOfficeConfig = v.InferOutput<typeof dashBoxOfficeConfigSchema>
