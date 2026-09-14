import { apiAuthBasePath } from "#src/auth/api_client/apiAuthBasePath.ts"
import { apiAuthFetch } from "#src/auth/api_client/apiAuthFetch.ts"
import type { UserPasswordChange1RequestTypePublic } from "#src/auth/convex/user/pw_change/userPasswordChange1RequestAction.ts"
import { apiPathAuth } from "#src/auth/url/apiPathAuth.ts"

export async function apiAuthPasswordChange(props: UserPasswordChange1RequestTypePublic) {
  return apiAuthFetch("apiClientChangePassword", apiAuthBasePath + apiPathAuth.passwordChangeRequest, props)
}
