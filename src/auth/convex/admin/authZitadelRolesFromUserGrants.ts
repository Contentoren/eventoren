import { type ZitadelRole, zitadelRole } from "#src/auth/model_field/zitadelRole.ts"

type UserGrant = {
  roleKeys: readonly string[]
  state: "active" | "inactive"
}

export function authZitadelRolesFromUserGrants(grants: readonly UserGrant[]): readonly ZitadelRole[] {
  const roles = new Set<ZitadelRole>()
  for (const grant of grants) {
    if (grant.state !== "active") continue
    for (const roleKey of grant.roleKeys) {
      if (roleKey === zitadelRole.customer || roleKey === zitadelRole.organizer || roleKey === zitadelRole.admin) {
        roles.add(roleKey)
      }
    }
  }
  return [...roles]
}
