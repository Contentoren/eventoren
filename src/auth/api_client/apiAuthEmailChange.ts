import { apiAuthBasePath } from "#src/auth/api_client/apiAuthBasePath.ts"
import { apiAuthFetch } from "#src/auth/api_client/apiAuthFetch.ts"
import type { UserEmailChangeTypePublic } from "#src/auth/convex/user/email_change/userEmailChange1RequestAction.ts"
import { apiPathAuth } from "#src/auth/url/apiPathAuth.ts"

export async function apiAuthEmailChange(props: UserEmailChangeTypePublic) {
  return apiAuthFetch("apiAuthEmailChange", apiAuthBasePath + apiPathAuth.emailChangeRequest, props)
}
