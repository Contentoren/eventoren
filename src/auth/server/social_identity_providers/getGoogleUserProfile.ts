import * as a from "valibot"
import { createResult, createResultError, type PromiseResult } from "#result"
import { loginProvider } from "#src/auth/model_field/socialLoginProvider.ts"
import { authErrorMessages } from "#src/auth/server/social_identity_providers/authErrorMessages.ts"

/**
 * https://github.com/nextauthjs/next-auth/blob/main/packages/core/src/providers/google.ts
 */
export interface GoogleUserProfile {
  id: string
  email: string
  verified_email: boolean
  name: string
  given_name: string
  family_name?: string
  picture: string
  // locale: string
}

export const googleOauthUserProfileRootUrl = "https://www.googleapis.com/oauth2/v1/userinfo"

/**
 * https://github.com/nextauthjs/next-auth/blob/main/packages/core/src/providers/google.ts
 */
export async function getGoogleUserProfile({
  id_token,
  access_token,
}: {
  id_token: string
  access_token: string
}): PromiseResult<GoogleUserProfile> {
  const op = "getGoogleUserProfile"
  const provider = loginProvider.google
  const r = await fetch(`${googleOauthUserProfileRootUrl}?alt=json&access_token=${access_token}`, {
    headers: {
      Authorization: `Bearer ${id_token}`,
    },
  })
  const text = await r.text()
  if (!r.ok) {
    const errorMessage = authErrorMessages.profileFailedToFetchStatus(provider, r.status, text)
    return createResultError(op, errorMessage)
  }
  const result = a.safeParse(a.pipe(a.string(), a.parseJson(), googleUserProfileSchema), text)
  if (!result.success) {
    const errorMessage = authErrorMessages.profileFailedToParse(provider, result.issues, text)
    return createResultError(op, errorMessage, text)
  }
  return createResult(result.output)
}

const googleUserProfileSchema = a.object({
  id: a.string(),
  email: a.string(),
  verified_email: a.boolean(),
  name: a.string(),
  given_name: a.string(),
  family_name: a.optional(a.string()),
  picture: a.string(),
  // locale: v.optional(v.string()),
})

function types1(d: a.InferOutput<typeof googleUserProfileSchema>): GoogleUserProfile {
  return { ...d }
}
