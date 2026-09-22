import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResult, type PromiseResult } from "#result"
import type { UserProfile } from "#src/auth/model/UserProfile.ts"
import { eventorenCurrentUserReadFromToken } from "./eventorenCurrentUserReadFromToken.ts"
import { eventorenSessionCookie } from "./eventorenSessionCookie.ts"

export async function eventorenCurrentUserRead(): PromiseResult<UserProfile | null> {
  const token = eventorenSessionCookie.sessionRead(getRequestHeader("cookie"))
  if (!token) return createResult(null)
  return eventorenCurrentUserReadFromToken(token)
}
