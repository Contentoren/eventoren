import { type UserRole, userRole } from "#src/auth/model_field/userRole.ts"

export function userRoleIsAdmin(role: UserRole): boolean {
  return role === userRole.admin
}
