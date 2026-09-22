import { createServerFn } from "@tanstack/solid-start"
import { api } from "#convex/_generated/api.js"
import type { UserEmailChangeTypePublic } from "#src/auth/convex/user/email_change/userEmailChange1RequestAction.ts"
import { apiClientCreate } from "#src/client/apiClient.ts"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"
import { eventorenAccountTokenRead } from "./eventorenAccountTokenRead.ts"

export const eventorenEmailChangeServerFn = createServerFn({ method: "POST" })
  .validator((input: Omit<UserEmailChangeTypePublic, "token">) => input)
  .handler(async ({ data }) => {
    const tokenResult = eventorenAccountTokenRead()
    if (!tokenResult.success) return tokenResult
    return apiClientCreate(convexUrlGet()).action(api.auth.userEmailChange1RequestAction, {
      ...data,
      token: tokenResult.data,
    })
  })
