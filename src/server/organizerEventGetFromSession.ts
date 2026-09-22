import { getRequestHeader } from "@tanstack/solid-start/server"
import { api } from "#convex/_generated/api.js"
import { createResultError, type PromiseResult } from "#result"
import { apiClientCreate } from "#src/client/apiClient.ts"
import type { OrganizerEvent } from "#src/organizer/OrganizerEvent.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

export async function organizerEventGetFromSession(input: {
  readonly eventKey: string
}): PromiseResult<OrganizerEvent> {
  const op = "organizerEventGetFromSession"
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return apiClientCreate(convexUrlGet()).query(api.organizer.organizerEventGetQuery, {
    ...input,
    token: tokenResult.data,
  })
}
