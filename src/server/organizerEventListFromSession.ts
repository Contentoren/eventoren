import { getRequestHeader } from "@tanstack/solid-start/server"
import type { PaginationOptions } from "convex/server"
import { api } from "#convex/_generated/api.js"
import { createResultError, type PromiseResult } from "#result"
import { apiClientCreate } from "#src/client/apiClient.ts"
import type { OrganizerEventListPage } from "#src/organizer/OrganizerEventListPage.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

export async function organizerEventListFromSession(input: {
  readonly paginationOpts: PaginationOptions
}): PromiseResult<OrganizerEventListPage> {
  const op = "organizerEventListFromSession"
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return apiClientCreate(convexUrlGet()).query(api.organizer.organizerEventListQuery, {
    ...input,
    token: tokenResult.data,
  })
}
