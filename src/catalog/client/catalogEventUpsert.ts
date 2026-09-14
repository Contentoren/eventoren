import type { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import { apiClientCreate } from "../../client/apiClient.js"
import { createResult } from "../../ui/createResult.ts"
import { createResultError } from "../../ui/createResultError.ts"
import type { Result } from "../../ui/Result.ts"
import type { CatalogEventUpsertInput } from "./CatalogEventUpsertInput.ts"

const op = "catalogEventUpsert"

export async function catalogEventUpsert(
  input: CatalogEventUpsertInput,
  client?: ConvexHttpClient,
): Promise<Result<{ readonly eventKey: string; readonly catalogVersion: number }>> {
  try {
    const response = await (client ?? apiClientCreate()).mutation(api.catalog.catalogEventUpsertMutation, input)
    if (!response.success) return createResultError(op, response.errorMessage, response)
    return createResult(response.data)
  } catch (error) {
    return createResultError(op, "Event konnte nicht gespeichert werden.", error)
  }
}
