import { createServerFn } from "@tanstack/solid-start"
import { api } from "#convex/_generated/api.js"
import type { UserEmailChangeConfirmTypePublic } from "#src/auth/convex/user/email_change/userEmailChange2ConfirmMutation.ts"
import { apiClientCreate } from "#src/client/apiClient.ts"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"
import { eventorenAccountSessionApply } from "./eventorenAccountSessionApply.ts"
import { eventorenAccountTokenRead } from "./eventorenAccountTokenRead.ts"

export const eventorenEmailChangeConfirmServerFn = createServerFn({ method: "POST" })
  .validator((input: Omit<UserEmailChangeConfirmTypePublic, "token">) => input)
  .handler(async ({ data }) => {
    const tokenResult = eventorenAccountTokenRead()
    if (!tokenResult.success) return tokenResult
    const result = await apiClientCreate(convexUrlGet()).mutation(api.auth.userEmailChange2ConfirmMutation, {
      ...data,
      token: tokenResult.data,
    })
    if (!result.success) return result
    return eventorenAccountSessionApply(result.data)
  })
