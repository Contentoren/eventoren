import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResultError, type Result } from "#result"
import type { CatalogEventUpsertInput } from "#src/catalog/client/CatalogEventUpsertInput.ts"
import { catalogEventUpsert } from "#src/catalog/client/catalogEventUpsert.ts"
import { apiClientCreate } from "../client/apiClient.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

const op = "catalogEventUpsertFromSession"

export async function catalogEventUpsertFromSession(
  input: Omit<CatalogEventUpsertInput, "token">,
): Promise<Result<{ readonly eventKey: string; readonly catalogVersion: number }>> {
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return catalogEventUpsert({ ...input, token: tokenResult.data }, apiClientCreate(convexUrlGet()))
}
