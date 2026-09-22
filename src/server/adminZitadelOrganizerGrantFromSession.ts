import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResultError } from "#result"
import { adminZitadelOrganizerGrant } from "#src/admin/adminZitadelOrganizerGrant.ts"
import { eventorenSessionCookie } from "#src/auth/server/eventorenSessionCookie.ts"
import { apiClientCreate } from "#src/client/apiClient.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

export async function adminZitadelOrganizerGrantFromSession(input: {
  readonly operation: "grant" | "revoke"
  readonly zitadelUserId: string
}): Promise<AdminZitadelOrganizerGrantFromSessionResult> {
  const token = eventorenSessionCookie.sessionRead(getRequestHeader("cookie"))
  if (!token) return createResultError("adminZitadelOrganizerGrantFromSession", "Anmeldung erforderlich")
  const result = await adminZitadelOrganizerGrant({ ...input, token }, apiClientCreate(convexUrlGet()))
  if (!result.success) return { success: false, op: result.op, errorMessage: result.errorMessage }
  return result
}

type AdminZitadelOrganizerGrantResult = Awaited<ReturnType<typeof adminZitadelOrganizerGrant>>

type AdminZitadelOrganizerGrantFromSessionResult =
  | { readonly success: true; readonly data: Extract<AdminZitadelOrganizerGrantResult, { success: true }>["data"] }
  | { readonly success: false; readonly op: string; readonly errorMessage: string }
