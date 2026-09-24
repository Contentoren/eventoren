import { loginProvider } from "#src/auth/model_field/socialLoginProvider.ts"
import { type ZitadelRole, zitadelRole } from "#src/auth/model_field/zitadelRole.ts"
import type { CommonAuthProvider } from "#src/auth/server/social_identity_providers/CommonAuthProvider.ts"

export function eventorenZitadelProviderCreate(
  userInfo: Record<string, unknown>,
  roleSync?: { readonly enabled: true; readonly roles: readonly ZitadelRole[] },
): CommonAuthProvider {
  const name = claimString(userInfo, "name")
  const givenName = claimString(userInfo, "given_name") || name
  const familyName = claimString(userInfo, "family_name")
  const username =
    claimString(userInfo, "preferred_username") || claimString(userInfo, "nickname") || claimString(userInfo, "sub")
  const email = userInfo.email_verified === true ? claimString(userInfo, "email") : ""
  const zitadelRoles = roleSync?.enabled ? [...roleSync.roles] : claimZitadelRoles(userInfo)

  return {
    provider: loginProvider.zitadel,
    providerId: claimString(userInfo, "sub"),
    ...(givenName ? { givenName } : {}),
    ...(familyName ? { familyName } : {}),
    ...(claimString(userInfo, "picture") ? { image: claimString(userInfo, "picture") } : {}),
    username,
    ...(email ? { email } : {}),
    ...(zitadelRoles ? { zitadelRoles } : {}),
    ...(roleSync?.enabled ? { zitadelRoleSyncEnabled: true } : {}),
  }
}

function claimString(userInfo: Record<string, unknown>, key: string): string {
  const value = userInfo[key]
  return typeof value === "string" ? value.trim() : ""
}

function claimZitadelRoles(userInfo: Record<string, unknown>): ZitadelRole[] | undefined {
  const claimKey = "urn:zitadel:iam:org:project:roles"
  if (!(claimKey in userInfo)) return undefined
  const claim = userInfo[claimKey]
  if (Array.isArray(claim)) return claim.filter(isZitadelRole)
  if (!claim || typeof claim !== "object") return []
  return Object.keys(claim).filter(isZitadelRole)
}

function isZitadelRole(value: string): value is ZitadelRole {
  return value === zitadelRole.customer || value === zitadelRole.organizer || value === zitadelRole.admin
}
