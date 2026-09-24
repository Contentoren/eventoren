import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResultError, type Result } from "#result"
import { catalogCategoryCreate } from "#src/catalog/client/catalogCategoryCreate.ts"
import { apiClientCreate } from "../client/apiClient.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

const op = "catalogCategoryCreateFromSession"

export async function catalogCategoryCreateFromSession(input: { readonly category: string }): Promise<Result<void>> {
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return catalogCategoryCreate({ ...input, token: tokenResult.data }, apiClientCreate(convexUrlGet()))
}
