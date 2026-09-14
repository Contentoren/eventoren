import * as a from "valibot"
import { createResult, createResultError, type PromiseResult } from "#result"
import { socialLoginProvider } from "#src/auth/model_field/socialLoginProvider.ts" // Adjust if needed
import { authErrorMessages } from "#src/auth/server/social_identity_providers/authErrorMessages.ts"

/**
 * Microsoft Graph /me endpoint for user profile
 * References:
 * - https://learn.microsoft.com/en-us/graph/api/user-get
 * - https://graph.microsoft.com/oidc/userinfo (alternative, but /me provides more reliable fields)
 */
export interface MicrosoftUserProfile {
  id: string
  displayName: string
  givenName: string | null
  surname: string | null
  mail: string | null
  userPrincipalName: string // Usually the email/login
  // avatar_url not directly available; can fetch separately via /photo if needed
}

export const microsoftOauthUserProfileRootUrl = "https://graph.microsoft.com/v1.0/me"

export async function getMicrosoftUserProfile(access_token: string): PromiseResult<MicrosoftUserProfile> {
  const op = "getMicrosoftUserProfile"
  const provider = socialLoginProvider.microsoft

  const r = await fetch(microsoftOauthUserProfileRootUrl, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  })

  const text = await r.text()
  if (!r.ok) {
    const errorMessage = authErrorMessages.profileFailedToFetchStatus(provider, r.status, text)
    return createResultError(op, errorMessage)
  }

  const result = a.safeParse(a.pipe(a.string(), a.parseJson(), microsoftProfileSchema), text)
  if (!result.success) {
    const errorMessage = authErrorMessages.profileFailedToParse(provider, result.issues, text)
    return createResultError(op, errorMessage, text)
  }

  const profile: MicrosoftUserProfile = {
    id: result.output.id,
    displayName: result.output.displayName,
    givenName: result.output.givenName ?? null,
    surname: result.output.surname ?? null,
    mail: result.output.mail ?? null,
    userPrincipalName: result.output.userPrincipalName,
  }

  return createResult(profile)
}

const microsoftProfileSchema = a.object({
  id: a.string(),
  displayName: a.string(),
  givenName: a.nullable(a.string()),
  surname: a.nullable(a.string()),
  mail: a.nullable(a.string()),
  userPrincipalName: a.string(),
  // Add more fields if needed
})
