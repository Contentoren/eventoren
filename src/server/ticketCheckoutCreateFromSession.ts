import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResultError, type PromiseResult } from "#result"
import type { TicketCheckoutCreateInput } from "#src/ticketing/TicketCheckoutCreateInput.ts"
import type { TicketCheckoutCreateResponse } from "#src/ticketing/TicketCheckoutCreateResponse.ts"
import { ticketCheckoutCreate } from "#src/ticketing/ticketCheckoutCreate.ts"
import { apiClientCreate } from "#src/client/apiClient.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

export async function ticketCheckoutCreateFromSession(
  input: Omit<TicketCheckoutCreateInput, "token" | "guestAccessToken">,
): PromiseResult<TicketCheckoutCreateResponse> {
  const op = "ticketCheckoutCreateFromSession"
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return ticketCheckoutCreate({ ...input, token: tokenResult.data }, apiClientCreate(convexUrlGet()))
}
