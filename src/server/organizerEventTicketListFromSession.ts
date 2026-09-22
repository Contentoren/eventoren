import { getRequestHeader } from "@tanstack/solid-start/server"
import type { PaginationOptions } from "convex/server"
import { api } from "#convex/_generated/api.js"
import { createResultError, type PromiseResult } from "#result"
import { apiClientCreate } from "#src/client/apiClient.ts"
import type { OrganizerTicketListPage } from "#src/organizer/OrganizerTicketListPage.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

export async function organizerEventTicketListFromSession(input: {
  readonly eventKey: string
  readonly search?: string
  readonly paginationOpts: PaginationOptions
}): PromiseResult<OrganizerTicketListPage> {
  const op = "organizerEventTicketListFromSession"
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return apiClientCreate(convexUrlGet()).query(api.organizer.organizerEventTicketListQuery, {
    ...input,
    token: tokenResult.data,
  })
}
