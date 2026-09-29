import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResultError, type Result } from "#result"
import type { AdminZitadelMember } from "#src/admin/AdminZitadelMember.ts"
import { adminZitadelMembersListAll } from "#src/admin/adminZitadelMembersListAll.ts"
import { eventorenSessionCookie } from "#src/auth/server/eventorenSessionCookie.ts"
import { apiClientCreate } from "#src/client/apiClient.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

export async function adminZitadelMembersGet(input: {
  readonly search?: string
}): Promise<Result<{ readonly members: readonly AdminZitadelMember[]; readonly total: number }>> {
  const token = eventorenSessionCookie.sessionRead(getRequestHeader("cookie"))
  if (!token) return createResultError("adminZitadelMembersGet", "Anmeldung erforderlich")
  return adminZitadelMembersListAll({ ...input, token }, apiClientCreate(convexUrlGet()))
}
