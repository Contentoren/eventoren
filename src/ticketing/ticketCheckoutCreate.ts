import { api } from "#convex/_generated/api.js"
import { ConvexHttpClient } from "convex/browser"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import { apiClientCreate } from "../client/apiClient.js"
import type { TicketCheckoutCreateInput } from "./TicketCheckoutCreateInput.ts"
import type { TicketCheckoutCreateResponse } from "./TicketCheckoutCreateResponse.ts"

const op = "ticketCheckoutCreate"

export async function ticketCheckoutCreate(
  input: TicketCheckoutCreateInput,
  client: ConvexHttpClient = apiClientCreate(),
): Promise<Result<TicketCheckoutCreateResponse>> {
  try {
    const response = await client.action(api.ticketing.ticketCheckoutCreateAction, {
      ...input,
      tickets: input.tickets.map((ticket) => ({
        ...ticket,
        ...(ticket.participantNames === undefined ? {} : { participantNames: [...ticket.participantNames] }),
      })),
    })
    if (!response.success) return createResultError(op, response.errorMessage, response)
    return createResult(response.data)
  } catch (error) {
    return createResultError(op, "Checkout konnte nicht erstellt werden.", error)
  }
}
