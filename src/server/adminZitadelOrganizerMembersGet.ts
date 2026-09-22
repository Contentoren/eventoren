import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResultError, type Result } from "#result"
import type { AdminZitadelMember } from "#src/admin/AdminZitadelMember.ts"
import { adminZitadelOrganizerMembersList } from "#src/admin/adminZitadelOrganizerMembersList.ts"
import { eventorenSessionCookie } from "#src/auth/server/eventorenSessionCookie.ts"
import { apiClientCreate } from "#src/client/apiClient.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

export async function adminZitadelOrganizerMembersGet(): Promise<
  Result<{ readonly members: readonly AdminZitadelMember[]; readonly total: number }>
> {
  const token = eventorenSessionCookie.sessionRead(getRequestHeader("cookie"))
  if (!token) return createResultError("adminZitadelOrganizerMembersGet", "Anmeldung erforderlich")
  return adminZitadelOrganizerMembersList({ token }, apiClientCreate(convexUrlGet()))
}
