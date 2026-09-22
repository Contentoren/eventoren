import { getRequestHeader } from "@tanstack/solid-start/server"
import { api } from "#convex/_generated/api.js"
import { createResultError, type PromiseResult } from "#result"
import { apiClientCreate } from "#src/client/apiClient.ts"
import type { OrganizerTicket } from "#src/organizer/OrganizerTicket.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

export async function organizerTicketCheckInResetFromSession(input: {
  readonly eventKey: string
  readonly ticketCode?: string
  readonly ticketId?: OrganizerTicket["id"]
}): PromiseResult<{ readonly ticket: OrganizerTicket }> {
  const op = "organizerTicketCheckInResetFromSession"
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return apiClientCreate(convexUrlGet()).mutation(api.organizer.organizerTicketCheckInResetMutation, {
    ...input,
    token: tokenResult.data,
  })
}
