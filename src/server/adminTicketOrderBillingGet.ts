import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResultError, type Result } from "#result"
import type { AdminTicketOrderBillingDetails } from "#src/admin/AdminTicketOrderBillingDetails.ts"
import { adminTicketOrderBillingGet as adminTicketOrderBillingGetService } from "#src/admin/adminTicketOrderBillingGet.ts"
import { apiClientCreate } from "../client/apiClient.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"

const op = "adminTicketOrderBillingGet"

export async function adminTicketOrderBillingGet(input: {
  readonly orderId: string
}): Promise<Result<AdminTicketOrderBillingDetails>> {
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return adminTicketOrderBillingGetService({ token: tokenResult.data, orderId: input.orderId }, apiClientCreate())
}
