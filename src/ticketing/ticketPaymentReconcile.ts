import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { ConvexHttpClient } from "convex/browser"
import { apiClientCreate } from "../client/apiClient.js"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketPaymentReconcileResponse } from "./TicketPaymentReconcileResponse.ts"

const op = "ticketPaymentReconcile"

export async function ticketPaymentReconcile(
  input: { readonly orderId: string; readonly token?: string; readonly guestAccessToken?: string },
  client: ConvexHttpClient = apiClientCreate(),
): Promise<Result<TicketPaymentReconcileResponse>> {
  try {
    const response = await client.action(api.ticketing.ticketPaymentReconcileAction, {
      orderId: input.orderId as Id<"ticketOrders">,
      token: input.token,
      guestAccessToken: input.guestAccessToken,
    })
    if (!response.success) return createResultError(op, response.errorMessage, response)
    return createResult(response.data)
  } catch (error) {
    return createResultError(op, "Zahlungsstatus konnte nicht aktualisiert werden.", error)
  }
}
