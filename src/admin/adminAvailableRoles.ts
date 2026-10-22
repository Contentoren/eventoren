import { type ZitadelRole, zitadelRole } from "#src/auth/model_field/zitadelRole.ts"
import type { AdminZitadelMember } from "./AdminZitadelMember.ts"

/**
 * Roles offered in the member edit dialog: generic base roles `admin` and
 * `user`, plus every other role already present in this project.
 */
export function adminAvailableRolesRead(
  members: readonly AdminZitadelMember[],
): readonly ["admin", "user", ...ZitadelRole[]] {
  const extras: ZitadelRole[] = []
  for (const member of members) {
    for (const role of member.zitadelRoles) {
      if (role === zitadelRole.admin || role === zitadelRole.user || extras.includes(role)) continue
      extras.push(role)
    }
  }
  extras.sort()
  return [zitadelRole.admin, zitadelRole.user, ...extras]
}
