import { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { UserProfile } from "#src/auth/model/UserProfile.ts"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"

export async function eventorenCurrentUserReadFromToken(token: string): PromiseResult<UserProfile | null> {
  const op = "eventorenCurrentUserReadFromToken"
  if (!token.trim()) return createResult(null)

  try {
    const client = new ConvexHttpClient(convexUrlGet())
    const result = await client.query(api.auth.authCurrentUserGetQuery, { token })
    if (!result.success) return createResult(null)
    return createResult(result.data)
  } catch (error) {
    return createResultError(
      op,
      "Die Eventoren-Sitzung konnte nicht geprüft werden.",
      error instanceof Error ? error.message : String(error),
    )
  }
}
