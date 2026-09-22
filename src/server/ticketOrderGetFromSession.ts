import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResultError, type PromiseResult } from "#result"
import type { TicketOrderProjection } from "#src/ticketing/TicketOrderProjection.ts"
import { ticketOrderGet } from "#src/ticketing/ticketOrderGet.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"
import { apiClientCreate } from "#src/client/apiClient.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

export async function ticketOrderGetFromSession(input: {
  readonly orderId: string
}): PromiseResult<TicketOrderProjection> {
  const op = "ticketOrderGetFromSession"
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return ticketOrderGet({ ...input, token: tokenResult.data }, apiClientCreate(convexUrlGet()))
}
