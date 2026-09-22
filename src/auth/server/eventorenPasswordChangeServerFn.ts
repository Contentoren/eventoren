import { createServerFn } from "@tanstack/solid-start"
import { api } from "#convex/_generated/api.js"
import type { UserPasswordChange1RequestTypePublic } from "#src/auth/convex/user/pw_change/userPasswordChange1RequestAction.ts"
import { apiClientCreate } from "#src/client/apiClient.ts"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"
import { eventorenAccountTokenRead } from "./eventorenAccountTokenRead.ts"

export const eventorenPasswordChangeServerFn = createServerFn({ method: "POST" })
  .validator((input: Omit<UserPasswordChange1RequestTypePublic, "token">) => input)
  .handler(async ({ data }) => {
    const tokenResult = eventorenAccountTokenRead()
    if (!tokenResult.success) return tokenResult
    return apiClientCreate(convexUrlGet()).action(api.auth.userPasswordChange1RequestAction, {
      ...data,
      token: tokenResult.data,
    })
  })
