import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResultError, type Result } from "#result"
import { catalogCategoryList } from "#src/catalog/client/catalogCategoryList.ts"
import { apiClientCreate } from "../client/apiClient.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

const op = "catalogCategoryListFromSession"

export async function catalogCategoryListFromSession(): Promise<Result<readonly string[]>> {
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return catalogCategoryList(tokenResult.data, apiClientCreate(convexUrlGet()))
}
