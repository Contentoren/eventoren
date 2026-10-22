import { loginProvider } from "#src/auth/model_field/socialLoginProvider.ts"
import type { CommonAuthProvider } from "#src/auth/server/social_identity_providers/CommonAuthProvider.ts"

/**
 * Builds the Authworks sign-in profile from UserInfo claims. Authworks issues
 * no project-role claims, so roles are intentionally absent: an Authworks
 * sign-in never grants, removes, or syncs roles.
 */
export function eventorenAuthworksProviderCreate(userInfo: Record<string, unknown>): CommonAuthProvider {
  const name = claimString(userInfo, "name")
  const givenName = claimString(userInfo, "given_name") || name
  const familyName = claimString(userInfo, "family_name")
  const username =
    claimString(userInfo, "preferred_username") || claimString(userInfo, "nickname") || claimString(userInfo, "sub")
  const email = userInfo.email_verified === true ? claimString(userInfo, "email") : ""

  return {
    provider: loginProvider.authworks,
    providerId: claimString(userInfo, "sub"),
    ...(givenName ? { givenName } : {}),
    ...(familyName ? { familyName } : {}),
    ...(claimString(userInfo, "picture") ? { image: claimString(userInfo, "picture") } : {}),
    username,
    ...(email ? { email } : {}),
  }
}

function claimString(userInfo: Record<string, unknown>, key: string): string {
  const value = userInfo[key]
  return typeof value === "string" ? value.trim() : ""
}
