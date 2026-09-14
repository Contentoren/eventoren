import type { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import { apiClientCreate } from "../../client/apiClient.js"
import { createResult } from "../../ui/createResult.ts"
import { createResultError } from "../../ui/createResultError.ts"
import type { Result } from "../../ui/Result.ts"
import type { CatalogTicketTierUpsertInput } from "./CatalogTicketTierUpsertInput.ts"

const op = "catalogTicketTierUpsert"

export async function catalogTicketTierUpsert(
  input: CatalogTicketTierUpsertInput,
  client?: ConvexHttpClient,
): Promise<Result<{ readonly tierKey: string; readonly catalogVersion: number }>> {
  try {
    const response = await (client ?? apiClientCreate()).mutation(api.catalog.catalogTicketTierUpsertMutation, input)
    if (!response.success) return createResultError(op, response.errorMessage, response)
    return createResult(response.data)
  } catch (error) {
    return createResultError(op, "Ticketprodukt konnte nicht gespeichert werden.", error)
  }
}
