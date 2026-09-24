import type { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import { apiClientCreate } from "../../client/apiClient.js"
import { createResult } from "../../ui/createResult.ts"
import { createResultError } from "../../ui/createResultError.ts"
import type { Result } from "../../ui/Result.ts"

const op = "catalogCategoryList"

export async function catalogCategoryList(
  token: string,
  client: ConvexHttpClient = apiClientCreate(),
): Promise<Result<readonly string[]>> {
  try {
    const response = await client.query(api.catalog.catalogCategoryListQuery, { token })
    if (!response.success) return createResultError(op, response.errorMessage, response)
    return createResult(response.data)
  } catch (error) {
    return createResultError(op, "Kategorien konnten nicht geladen werden.", error)
  }
}
