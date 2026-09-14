import { apiAuthBasePath } from "#src/auth/api_client/apiAuthBasePath.ts"
import { apiAuthFetch } from "#src/auth/api_client/apiAuthFetch.ts"
import type { UserProfileFieldsTypePublic } from "#src/auth/convex/user/profile_update/userProfileUpdateMutation.ts"
import { userSessionSchema } from "#src/auth/model/UserSession.ts"
import { apiPathAuth } from "#src/auth/url/apiPathAuth.ts"

export async function apiAuthProfileUpdate(props: UserProfileFieldsTypePublic) {
  return apiAuthFetch("apiAuthProfileUpdate", apiAuthBasePath + apiPathAuth.profileUpdate, props, userSessionSchema)
}
