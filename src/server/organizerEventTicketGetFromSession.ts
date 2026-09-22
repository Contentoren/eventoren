import { getRequestHeader } from "@tanstack/solid-start/server"
import { api } from "#convex/_generated/api.js"
import { createResultError, type PromiseResult } from "#result"
import { apiClientCreate } from "#src/client/apiClient.ts"
import type { OrganizerTicket } from "#src/organizer/OrganizerTicket.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

export async function organizerEventTicketGetFromSession(input: {
  readonly eventKey: string
  readonly ticketId: OrganizerTicket["id"]
}): PromiseResult<OrganizerTicket> {
  const op = "organizerEventTicketGetFromSession"
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return apiClientCreate(convexUrlGet()).query(api.organizer.organizerEventTicketGetQuery, {
    ...input,
    token: tokenResult.data,
  })
}
