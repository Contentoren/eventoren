import { type UserRole, userRole } from "#src/auth/model_field/userRole.ts"
import { type ZitadelRole, zitadelRole } from "#src/auth/model_field/zitadelRole.ts"

export function zitadelRolesToUserRole(roles: readonly ZitadelRole[]): Exclude<UserRole, "user" | "dev"> {
  if (roles.includes(zitadelRole.admin)) return userRole.admin
  if (roles.includes(zitadelRole.organizer)) return userRole.organizer
  return userRole.customer
}
