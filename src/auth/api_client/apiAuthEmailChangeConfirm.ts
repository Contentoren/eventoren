import { apiAuthBasePath } from "#src/auth/api_client/apiAuthBasePath.ts"
import { apiAuthFetch } from "#src/auth/api_client/apiAuthFetch.ts"
import type { UserEmailChangeConfirmTypePublic } from "#src/auth/convex/user/email_change/userEmailChange2ConfirmMutation.ts"
import { apiPathAuth } from "#src/auth/url/apiPathAuth.ts"

export async function apiAuthEmailChangeConfirm(props: UserEmailChangeConfirmTypePublic) {
  return apiAuthFetch("apiAuthEmailChangeConfirm", apiAuthBasePath + apiPathAuth.emailChangeConfirm, props)
}
