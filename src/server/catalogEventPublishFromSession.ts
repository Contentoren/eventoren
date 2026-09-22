import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResultError, type Result } from "#result"
import { catalogEventPublish } from "#src/catalog/client/catalogEventPublish.ts"
import { apiClientCreate } from "../client/apiClient.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

const op = "catalogEventPublishFromSession"

export async function catalogEventPublishFromSession(input: {
  readonly eventKey: string
}): Promise<Result<{ readonly eventKey: string; readonly catalogVersion: number }>> {
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return catalogEventPublish({ ...input, token: tokenResult.data }, apiClientCreate(convexUrlGet()))
}
