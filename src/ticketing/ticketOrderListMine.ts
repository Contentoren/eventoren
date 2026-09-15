import type { ConvexHttpClient } from "convex/browser"
import type { PaginationOptions } from "convex/server"
import { api } from "#convex/_generated/api.js"
import { apiClientCreate } from "../client/apiClient.js"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketOrderListPage } from "./TicketOrderListPage.ts"

const op = "ticketOrderListMine"

export async function ticketOrderListMine(
  input: { readonly token: string; readonly paginationOpts: PaginationOptions },
  client: ConvexHttpClient = apiClientCreate(),
): Promise<Result<TicketOrderListPage>> {
  try {
    const response = await client.query(api.ticketing.ticketOrderListMinePaginatedQuery, input)
    if (!response.success) return createResultError(op, response.errorMessage, response)
    return createResult(response.data as TicketOrderListPage)
  } catch (error) {
    return createResultError(op, "Bestellhistorie konnte nicht geladen werden.", error)
  }
}
