import { createServerFn } from "@tanstack/solid-start"
import { getRequestProtocol, setResponseHeader } from "@tanstack/solid-start/server"
import { api } from "#convex/_generated/api.js"
import { apiClientCreate } from "#src/client/apiClient.ts"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"
import { eventorenAccountTokenRead } from "./eventorenAccountTokenRead.ts"
import { eventorenSessionCookie } from "./eventorenSessionCookie.ts"

export const eventorenUserDeleteServerFn = createServerFn({ method: "POST" }).handler(async () => {
  const tokenResult = eventorenAccountTokenRead()
  if (!tokenResult.success) return tokenResult
  const result = await apiClientCreate(convexUrlGet()).mutation(api.auth.userDeleteSoftMutation, {
    token: tokenResult.data,
  })
  if (!result.success) return result
  setResponseHeader("set-cookie", eventorenSessionCookie.sessionClear(getRequestProtocol() === "https"))
  return result
})
