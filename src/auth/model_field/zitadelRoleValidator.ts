import { v } from "convex/values"
import { zitadelRole } from "#src/auth/model_field/zitadelRole.ts"

export const zitadelRoleValidator = v.union(
  v.literal(zitadelRole.customer),
  v.literal(zitadelRole.organizer),
  v.literal(zitadelRole.admin),
)
