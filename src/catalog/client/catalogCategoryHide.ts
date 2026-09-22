import type { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import { apiClientCreate } from "../../client/apiClient.js"
import { createResult } from "../../ui/createResult.ts"
import { createResultError } from "../../ui/createResultError.ts"
import type { Result } from "../../ui/Result.ts"

const op = "catalogCategoryHide"

export async function catalogCategoryHide(
  input: { readonly category: string; readonly token: string },
  client: ConvexHttpClient = apiClientCreate(),
): Promise<Result<void>> {
  try {
    const response = await client.mutation(api.catalog.catalogCategoryHideMutation, input)
    if (!response.success) return createResultError(op, response.errorMessage, response)
    return createResult(undefined)
  } catch (error) {
    return createResultError(op, "Kategorie konnte nicht entfernt werden.", error)
  }
}
