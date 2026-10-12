import type { ConvexHttpClient } from "convex/browser"
import type { PaginationOptions } from "convex/server"
import { api } from "#convex/_generated/api.js"
import { apiClientCreate } from "../client/apiClient.js"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketActivationCodeListPage } from "./TicketActivationCodeListPage.ts"
import type { TicketActivationCodeStatus } from "./TicketActivationCodeStatus.ts"

const op = "ticketActivationCodeList"

export async function ticketActivationCodeList(
  input: {
    readonly token: string
    readonly eventKey: string
    readonly tierKey: string
    readonly status?: TicketActivationCodeStatus
    readonly paginationOpts: PaginationOptions
  },
  client: ConvexHttpClient = apiClientCreate(),
): Promise<Result<TicketActivationCodeListPage>> {
  try {
    const response = await client.query(api.ticketing.ticketActivationCodeListAdminQuery, input)
    if (!response.success) return createResultError(op, response.errorMessage, response)
    return createResult(response.data as TicketActivationCodeListPage)
  } catch (error) {
    return createResultError(op, "Freischaltungscodes konnten nicht geladen werden.", error)
  }
}
