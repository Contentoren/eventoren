import type { ZitadelRole } from "#src/auth/model_field/zitadelRole.ts"
import type { CommonAuthProvider } from "#src/auth/server/social_identity_providers/CommonAuthProvider.ts"

type ZitadelMemberIdentity = {
  avatarUrl?: string
  email?: string
  firstName: string
  id: string
  lastName: string
  userName: string
}

export function authZitadelMemberProviderCreate(
  identity: ZitadelMemberIdentity,
  roles: readonly ZitadelRole[],
): CommonAuthProvider {
  return {
    ...(identity.email ? { email: identity.email } : {}),
    familyName: identity.lastName,
    givenName: identity.firstName,
    image: identity.avatarUrl ?? "",
    provider: "zitadel",
    providerId: identity.id,
    username: identity.userName,
    zitadelRoles: [...roles],
  }
}
