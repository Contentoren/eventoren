import type { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import type { Result } from "../../ui/Result.ts"
import { createResult } from "../../ui/createResult.ts"
import { createResultError } from "../../ui/createResultError.ts"
import { apiClientCreate } from "../../client/apiClient.js"

export async function catalogEventDelete(
  input: { readonly eventKey: string; readonly token: string },
  client?: ConvexHttpClient,
): Promise<Result<{ readonly eventKey: string; readonly catalogVersion: number }>> {
  const op = "catalogEventDelete"
  try {
    const response = await (client ?? apiClientCreate()).mutation(api.catalog.catalogEventDeleteMutation, input)
    if (!response.success) return createResultError(op, response.errorMessage, response)
    return createResult(response.data)
  } catch (error) {
    return createResultError(op, "Event konnte nicht gelöscht werden.", error)
  }
}
