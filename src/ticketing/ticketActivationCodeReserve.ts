import type { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import { apiClientCreate } from "../client/apiClient.js"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketActivationCodeReserveResult } from "./TicketActivationCodeReserveResult.ts"
import type { TicketActivationCodeReserveInput } from "./ticketActivationCodeReserveInputSchema.ts"

const op = "ticketActivationCodeReserve"

/**
 * Reserves an activation code for the calling browser.
 *
 * The first call without a credential mints one and returns it, a repeated
 * call proves ownership with the credential it received. The answer only
 * contains the caller's own hold.
 */
export async function ticketActivationCodeReserve(
  input: TicketActivationCodeReserveInput,
  client: ConvexHttpClient = apiClientCreate(),
): Promise<Result<TicketActivationCodeReserveResult>> {
  try {
    const response = await client.mutation(api.ticketing.ticketActivationCodeReserveMutation, input)
    if (!response.success) return createResultError(op, response.errorMessage, response)
    return createResult(response.data as TicketActivationCodeReserveResult)
  } catch (error) {
    return createResultError(op, "Der Freischaltungscode konnte nicht reserviert werden.", error)
  }
}
