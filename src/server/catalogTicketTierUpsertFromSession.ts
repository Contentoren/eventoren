import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResultError, type Result } from "#result"
import type { CatalogTicketTierUpsertInput } from "#src/catalog/client/CatalogTicketTierUpsertInput.ts"
import { catalogTicketTierUpsert } from "#src/catalog/client/catalogTicketTierUpsert.ts"
import { apiClientCreate } from "../client/apiClient.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

const op = "catalogTicketTierUpsertFromSession"

export async function catalogTicketTierUpsertFromSession(
  input: Omit<CatalogTicketTierUpsertInput, "token">,
): Promise<Result<{ readonly tierKey: string; readonly catalogVersion: number }>> {
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return catalogTicketTierUpsert({ ...input, token: tokenResult.data }, apiClientCreate(convexUrlGet()))
}
