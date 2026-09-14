import * as a from "valibot"
import { createResult, createResultError, type PromiseResult } from "#result"
import { envMicrosoftClientSecretResult } from "#src/app/env/private/envMicrosoftClientSecretResult.ts"
import { envMicrosoftClientIdResult } from "#src/app/env/public/envMicrosoftClientIdResult.ts"
import { socialLoginProvider } from "#src/auth/model_field/socialLoginProvider.ts"
import { urlAuthSignInUsingOauth } from "#src/auth/url/urlAuthSignInUsingOauth.ts"
import { queryString } from "#utils/url/queryString.js"
import { searchParamsToObject } from "#utils/url/searchParamsToObject.js"
import { authErrorMessages } from "./authErrorMessages.js"

export type MicrosoftOauthToken = {
  access_token: string
}

export const microsoftOauthTokenRootUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
/**
 * Microsoft Identity Platform (Entra ID / Azure AD) OAuth2 Authorization Code Flow
 * References:
 * - https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
 * - Similar to NextAuth.js AzureAD / MicrosoftEntraID provider
 */
export async function getMicrosoftOauthToken(code: string): PromiseResult<MicrosoftOauthToken> {
  const op = "getMicrosoftOauthToken"
  const provider = socialLoginProvider.microsoft

  const clientSecretResult = envMicrosoftClientSecretResult()
  if (!clientSecretResult.success) return clientSecretResult
  const clientSecret = clientSecretResult.data

  const clientIdResult = envMicrosoftClientIdResult()
  if (!clientIdResult.success) return clientIdResult
  const clientId = clientIdResult.data

  const options = {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: urlAuthSignInUsingOauth(provider),
    scope: "openid profile email offline_access User.Read", // Common scopes for basic profile + email
  }

  const r = await fetch(microsoftOauthTokenRootUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: queryString(options),
  })

  const text = await r.text()
  if (!r.ok) {
    const errorMessage = authErrorMessages.tokenFailedToFetchStatus(provider, r.status, text)
    return createResultError(op, errorMessage)
  }

  const json = searchParamsToObject(text)
  const result = a.safeParse(microsoftSchema, json)
  if (!result.success) {
    const errorMessage = authErrorMessages.tokenFailedToParse(provider, result.issues, text)
    return createResultError(op, errorMessage, text)
  }

  return createResult({ access_token: result.output.access_token })
}

const microsoftSchema = a.object({
  access_token: a.string(),
  // Optional: token_type, expires_in, refresh_token, id_token, etc.
})
