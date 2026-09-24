import { type ZitadelRole, zitadelRole } from "#src/auth/model_field/zitadelRole.ts"

export function zitadelRolesForOrganizationRead(
  claims: Record<string, unknown>,
  organizationId: string,
  projectId: string,
): ZitadelRole[] {
  const rolesClaim = claims[`urn:zitadel:iam:org:project:${projectId}:roles`]
  if (!rolesClaim || typeof rolesClaim !== "object" || Array.isArray(rolesClaim)) return []

  return Object.entries(rolesClaim).flatMap(([role, organizations]) => {
    if (!isZitadelRole(role) || !organizations || typeof organizations !== "object" || Array.isArray(organizations))
      return []
    return Object.hasOwn(organizations, organizationId) ? [role] : []
  })
}

function isZitadelRole(value: string): value is ZitadelRole {
  return value === zitadelRole.customer || value === zitadelRole.organizer || value === zitadelRole.admin
}
