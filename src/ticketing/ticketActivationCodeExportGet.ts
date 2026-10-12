import type { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import { apiClientCreate } from "../client/apiClient.js"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketActivationCodeExport } from "./TicketActivationCodeExport.ts"

const op = "ticketActivationCodeExportGet"

export async function ticketActivationCodeExportGet(
  input: {
    readonly token: string
    readonly eventKey: string
    readonly tierKey: string
  },
  client: ConvexHttpClient = apiClientCreate(),
): Promise<Result<TicketActivationCodeExport>> {
  try {
    const response = await client.query(api.ticketing.ticketActivationCodeExportAdminQuery, input)
    if (!response.success) return createResultError(op, response.errorMessage, response)
    return createResult(response.data as TicketActivationCodeExport)
  } catch (error) {
    return createResultError(op, "Freischaltungscodes konnten nicht exportiert werden.", error)
  }
}
