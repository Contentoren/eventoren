import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResultError, type Result } from "#result"
import { catalogEventDelete } from "#src/catalog/client/catalogEventDelete.ts"
import { apiClientCreate } from "../client/apiClient.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

export async function catalogEventDeleteFromSession(input: {
  readonly eventKey: string
}): Promise<Result<{ readonly eventKey: string; readonly catalogVersion: number }>> {
  const op = "catalogEventDeleteFromSession"
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return catalogEventDelete({ ...input, token: tokenResult.data }, apiClientCreate(convexUrlGet()))
}
