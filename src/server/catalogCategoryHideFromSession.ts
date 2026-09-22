import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResultError, type Result } from "#result"
import { catalogCategoryHide } from "#src/catalog/client/catalogCategoryHide.ts"
import { apiClientCreate } from "../client/apiClient.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

const op = "catalogCategoryHideFromSession"

export async function catalogCategoryHideFromSession(input: { readonly category: string }): Promise<Result<void>> {
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return catalogCategoryHide({ ...input, token: tokenResult.data }, apiClientCreate(convexUrlGet()))
}
