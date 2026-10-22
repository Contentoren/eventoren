import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResultError } from "#result"
import { adminZitadelRolesSet } from "#src/admin/adminZitadelRolesSet.ts"
import type { ZitadelRole } from "#src/auth/model_field/zitadelRole.ts"
import { eventorenSessionCookie } from "#src/auth/server/eventorenSessionCookie.ts"
import { apiClientCreate } from "#src/client/apiClient.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

export async function adminZitadelRolesSetFromSession(input: {
  readonly roles: readonly ZitadelRole[]
  readonly zitadelUserId: string
}): Promise<AdminZitadelRolesSetFromSessionResult> {
  const token = eventorenSessionCookie.sessionRead(getRequestHeader("cookie"))
  if (!token) return createResultError("adminZitadelRolesSetFromSession", "Anmeldung erforderlich")
  const result = await adminZitadelRolesSet({ ...input, token }, apiClientCreate(convexUrlGet()))
  if (!result.success) return { success: false, op: result.op, errorMessage: result.errorMessage }
  return result
}

type AdminZitadelRolesSetResult = Awaited<ReturnType<typeof adminZitadelRolesSet>>

type AdminZitadelRolesSetFromSessionResult =
  | { readonly success: true; readonly data: Extract<AdminZitadelRolesSetResult, { success: true }>["data"] }
  | { readonly success: false; readonly op: string; readonly errorMessage: string }
