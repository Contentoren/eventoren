import { getRequestHeader } from "@tanstack/solid-start/server"
import type { AdminEventItem } from "#src/admin/AdminEventItem.ts"
import { eventorenSessionCookie } from "#src/auth/server/eventorenSessionCookie.ts"
import { catalogEventsAdminList } from "#src/catalog/client/catalogEventsAdminList.ts"
import { apiClientCreate } from "../client/apiClient.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

export async function catalogEventsAdminGet(): Promise<
  | { readonly success: true; readonly data: readonly AdminEventItem[] }
  | { readonly success: false; readonly errorMessage: string }
> {
  const token = eventorenSessionCookie.sessionRead(getRequestHeader("cookie"))
  if (!token) return { success: false, errorMessage: "Anmeldung erforderlich" }
  const result = await catalogEventsAdminList(token, apiClientCreate(convexUrlGet()))
  if (!result.success) return { success: false, errorMessage: result.errorMessage }
  return { success: true, data: result.data }
}
