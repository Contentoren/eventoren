import { api } from "#convex/_generated/api.js"
import { ConvexHttpClient } from "convex/browser"
import { createResult, createResultError, type PromiseResult } from "#result"
import { getRequestHeader } from "@tanstack/solid-start/server"
import type { UserProfile } from "#src/auth/model/UserProfile.ts"
import { eventorenSessionCookie } from "./eventorenSessionCookie.ts"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"

export async function eventorenCurrentUserRead(): PromiseResult<UserProfile | null> {
  const op = "eventorenCurrentUserRead"
  const token = eventorenSessionCookie.sessionRead(getRequestHeader("cookie"))
  if (!token) return createResult(null)

  try {
    const client = new ConvexHttpClient(convexUrlGet())
    const result = await client.query(api.auth.authCurrentUserGetQuery, { token })
    if (!result.success) return createResultError(op, result.errorMessage)
    return createResult(result.data)
  } catch (error) {
    return createResultError(
      op,
      "Die Eventoren-Sitzung konnte nicht geprüft werden.",
      error instanceof Error ? error.message : String(error),
    )
  }
}
