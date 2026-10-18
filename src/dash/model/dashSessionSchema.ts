import * as v from "valibot"

import { dashIdSchema } from "./dashIdSchema.ts"
import { dashRoleSchema } from "./dashRoleSchema.ts"

export const dashSessionSchema = v.object({
  userId: dashIdSchema,
  activeOrgId: v.nullable(dashIdSchema),
  simulatedRole: v.nullable(dashRoleSchema),
})

export type DashSession = v.InferOutput<typeof dashSessionSchema>
