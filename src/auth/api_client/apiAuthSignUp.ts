import { apiAuthBasePath } from "#src/auth/api_client/apiAuthBasePath.ts"
import { apiAuthFetch } from "#src/auth/api_client/apiAuthFetch.ts"
import type { SignUpType } from "#src/auth/model/signUpSchema.ts"
import { apiPathAuth } from "#src/auth/url/apiPathAuth.ts"

export async function apiAuthSignUp(props: SignUpType) {
  return apiAuthFetch("apiClientSignUp", apiAuthBasePath + apiPathAuth.signUp, props)
}
