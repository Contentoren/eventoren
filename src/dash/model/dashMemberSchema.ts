import * as v from "valibot"

import { dashIdSchema } from "./dashIdSchema.ts"
import { dashMemberStatusSchema } from "./dashMemberStatusSchema.ts"
import { dashRoleSchema } from "./dashRoleSchema.ts"

export const dashMemberSchema = v.object({
  id: dashIdSchema,
  orgId: dashIdSchema,
  userId: v.nullable(dashIdSchema),
  name: v.string(),
  email: v.string(),
  role: dashRoleSchema,
  status: dashMemberStatusSchema,
  invitedAt: v.nullable(v.string()),
})

export type DashMember = v.InferOutput<typeof dashMemberSchema>
