import { apiAuthBasePath } from "#src/auth/api_client/apiAuthBasePath.ts"
import { apiAuthFetch } from "#src/auth/api_client/apiAuthFetch.ts"
import { userTokenGet } from "#src/auth/ui/signals/userSessionSignal.ts"
import { apiPathAuth } from "#src/auth/url/apiPathAuth.ts"

export async function apiAuthUserDelete() {
  const token = userTokenGet()
  return apiAuthFetch("apiClientUserDelete", apiAuthBasePath + apiPathAuth.userDelete, { token })
}
