import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { ConvexHttpClient } from "convex/browser"
import { apiClientCreate } from "../client/apiClient.js"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketOrderProjection } from "./TicketOrderProjection.ts"

const op = "ticketOrderGet"

export async function ticketOrderGet(
  input: { readonly orderId: string; readonly token?: string; readonly guestAccessToken?: string },
  client: ConvexHttpClient = apiClientCreate(),
): Promise<Result<TicketOrderProjection>> {
  try {
    const response = await client.query(api.ticketing.ticketOrderGetQuery, {
      orderId: input.orderId as Id<"ticketOrders">,
      token: input.token,
      guestAccessToken: input.guestAccessToken,
    })
    if (!response.success) return createResultError(op, response.errorMessage, response)
    if (!isTicketOrderProjection(response.data))
      return createResultError(op, "Bestellung hat ein ungültiges Format.", response.data)
    return createResult(response.data)
  } catch (error) {
    return createResultError(op, "Bestellung konnte nicht geladen werden.", error)
  }
}

function isTicketOrderProjection(value: unknown): value is TicketOrderProjection {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Partial<TicketOrderProjection>
  return (
    typeof candidate.id === "string" &&
    typeof candidate.checkoutKey === "string" &&
    typeof candidate.eventTitle === "string" &&
    typeof candidate.eventStartsAt === "string" &&
    typeof candidate.paymentStatus === "string" &&
    Array.isArray(candidate.lines) &&
    Array.isArray(candidate.tickets)
  )
}
