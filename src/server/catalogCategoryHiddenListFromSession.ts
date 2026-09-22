import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResultError, type Result } from "#result"
import { catalogCategoryHiddenList } from "#src/catalog/client/catalogCategoryHiddenList.ts"
import { apiClientCreate } from "../client/apiClient.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

const op = "catalogCategoryHiddenListFromSession"

export async function catalogCategoryHiddenListFromSession(): Promise<Result<readonly string[]>> {
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return catalogCategoryHiddenList(tokenResult.data, apiClientCreate(convexUrlGet()))
}
