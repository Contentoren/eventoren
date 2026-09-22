import { createServerFn } from "@tanstack/solid-start"
import { api } from "#convex/_generated/api.js"
import { createResult } from "#result"
import type { UserProfileFieldsTypePublic } from "#src/auth/convex/user/profile_update/userProfileUpdateMutation.ts"
import { apiClientCreate } from "#src/client/apiClient.ts"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"
import { eventorenAccountSessionApply } from "./eventorenAccountSessionApply.ts"
import { eventorenAccountTokenRead } from "./eventorenAccountTokenRead.ts"

export const eventorenProfileUpdateServerFn = createServerFn({ method: "POST" })
  .validator((input: Omit<UserProfileFieldsTypePublic, "token">) => input)
  .handler(async ({ data }) => {
    const tokenResult = eventorenAccountTokenRead()
    if (!tokenResult.success) return tokenResult
    const result = await apiClientCreate(convexUrlGet()).mutation(api.auth.userProfileUpdateMutation, {
      ...data,
      token: tokenResult.data,
    })
    if (!result.success) return result
    if (!result.data) return createResult(null)
    return eventorenAccountSessionApply(result.data)
  })
