import { v } from "convex/values"
import { type UserRole, userRole } from "#src/auth/model_field/userRole.ts"

export const userRoleValidator = v.union(v.literal(userRole.user), v.literal(userRole.admin), v.literal(userRole.dev))

function types1(a: typeof userRoleValidator.type): UserRole {
  return a
}
