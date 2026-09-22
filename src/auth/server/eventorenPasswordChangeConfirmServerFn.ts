import { createServerFn } from "@tanstack/solid-start"
import { api } from "#convex/_generated/api.js"
import type { UserPasswordChangeConfirmTypePublic } from "#src/auth/convex/user/pw_change/userPasswordChange2ConfirmMutation.ts"
import { apiClientCreate } from "#src/client/apiClient.ts"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"
import { eventorenAccountSessionApply } from "./eventorenAccountSessionApply.ts"
import { eventorenAccountTokenRead } from "./eventorenAccountTokenRead.ts"

export const eventorenPasswordChangeConfirmServerFn = createServerFn({ method: "POST" })
  .validator((input: Omit<UserPasswordChangeConfirmTypePublic, "token">) => input)
  .handler(async ({ data }) => {
    const tokenResult = eventorenAccountTokenRead()
    if (!tokenResult.success) return tokenResult
    const result = await apiClientCreate(convexUrlGet()).mutation(api.auth.userPasswordChange2ConfirmMutation, {
      ...data,
      token: tokenResult.data,
    })
    if (!result.success) return result
    return eventorenAccountSessionApply(result.data)
  })
