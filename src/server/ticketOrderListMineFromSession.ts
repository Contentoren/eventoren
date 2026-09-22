import { getRequestHeader } from "@tanstack/solid-start/server"
import type { PaginationOptions } from "convex/server"
import { createResultError, type PromiseResult } from "#result"
import { apiClientCreate } from "#src/client/apiClient.ts"
import type { TicketOrderListPage } from "#src/ticketing/TicketOrderListPage.ts"
import { ticketOrderListMine } from "#src/ticketing/ticketOrderListMine.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

export async function ticketOrderListMineFromSession(input: {
  readonly paginationOpts: PaginationOptions
}): PromiseResult<TicketOrderListPage> {
  const op = "ticketOrderListMineFromSession"
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return ticketOrderListMine({ ...input, token: tokenResult.data }, apiClientCreate(convexUrlGet()))
}
