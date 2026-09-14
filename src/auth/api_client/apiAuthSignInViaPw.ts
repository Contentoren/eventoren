import { apiAuthBasePath } from "#src/auth/api_client/apiAuthBasePath.ts"
import { apiAuthFetch } from "#src/auth/api_client/apiAuthFetch.ts"
import type { SignInViaPwType } from "#src/auth/model/signInSchema.ts"
import { userSessionSchema } from "#src/auth/model/UserSession.ts"
import { apiPathAuth } from "#src/auth/url/apiPathAuth.ts"

export async function apiAuthSignInViaPw(props: SignInViaPwType) {
  return apiAuthFetch("apiClientSignInViaPw", apiAuthBasePath + apiPathAuth.signInViaPw, props, userSessionSchema)
}
