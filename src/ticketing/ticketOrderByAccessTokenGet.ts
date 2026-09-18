import type { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import { apiClientCreate } from "../client/apiClient.js"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketOrderProjection } from "./TicketOrderProjection.ts"
import { ticketCheckoutText } from "./ticketCheckoutText.ts"

const op = "ticketOrderByAccessTokenGet"

export async function ticketOrderByAccessTokenGet(
  accessToken: string,
  client: ConvexHttpClient = apiClientCreate(),
): Promise<Result<TicketOrderProjection>> {
  try {
    const response = await client.query(api.ticketing.ticketOrderByAccessTokenQuery, { guestAccessToken: accessToken })
    if (!response.success) {
      const errorMessage =
        response.errorMessage === "The order was not found"
          ? ticketCheckoutText().ticketAccessNotFound
          : response.errorMessage
      return createResultError(op, errorMessage, response)
    }
    if (!isTicketOrderProjection(response.data)) return createResultError(op, "Bestellung hat ein ungültiges Format.")
    return createResult(response.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("Could not find public function"))
      return createResultError(op, "Der Ticket-Link ist in dieser Umgebung noch nicht verfügbar.", error)
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
