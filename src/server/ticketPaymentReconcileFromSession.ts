import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResultError, type PromiseResult } from "#result"
import type { TicketPaymentReconcileResponse } from "#src/ticketing/TicketPaymentReconcileResponse.ts"
import { ticketPaymentReconcile } from "#src/ticketing/ticketPaymentReconcile.ts"
import { apiClientCreate } from "#src/client/apiClient.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

export async function ticketPaymentReconcileFromSession(input: {
  readonly orderId: string
}): PromiseResult<TicketPaymentReconcileResponse> {
  const op = "ticketPaymentReconcileFromSession"
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return ticketPaymentReconcile({ ...input, token: tokenResult.data }, apiClientCreate(convexUrlGet()))
}
