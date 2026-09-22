import type { ConvexHttpClient } from "convex/browser"
import type { PaginationOptions } from "convex/server"
import { api } from "#convex/_generated/api.js"
import { apiClientCreate } from "../client/apiClient.ts"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { AdminTicketOrderListPage } from "./AdminTicketOrderListPage.ts"

const op = "adminTicketOrdersList"

export async function adminTicketOrdersList(
  input: { readonly token: string; readonly paginationOpts: PaginationOptions },
  client: ConvexHttpClient = apiClientCreate(),
): Promise<Result<AdminTicketOrderListPage>> {
  try {
    const response = await client.query(api.ticketing.ticketOrderListAdminPaginatedQuery, input)
    if (!response.success) return createResultError(op, response.errorMessage, response)
    return createResult(response.data as AdminTicketOrderListPage)
  } catch (error) {
    return createResultError(op, "Bestellungen konnten nicht geladen werden.", error)
  }
}
