import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResultError, type Result } from "#result"
import type { CatalogTicketTierDeleteInput } from "#src/catalog/client/CatalogTicketTierDeleteInput.ts"
import { catalogTicketTierDelete } from "#src/catalog/client/catalogTicketTierDelete.ts"
import { apiClientCreate } from "../client/apiClient.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

const op = "catalogTicketTierDeleteFromSession"

export async function catalogTicketTierDeleteFromSession(
  input: Omit<CatalogTicketTierDeleteInput, "token">,
): Promise<Result<{ readonly tierKey: string; readonly catalogVersion: number }>> {
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return catalogTicketTierDelete({ ...input, token: tokenResult.data }, apiClientCreate(convexUrlGet()))
}
