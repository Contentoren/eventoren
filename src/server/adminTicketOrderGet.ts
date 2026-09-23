import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResultError, type Result } from "#result"
import type { AdminTicketOrderDetails } from "#src/admin/AdminTicketOrderDetails.ts"
import { adminTicketOrderGet as adminTicketOrderGetService } from "#src/admin/adminTicketOrderGet.ts"
import { apiClientCreate } from "../client/apiClient.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"

const op = "adminTicketOrderGet"

export async function adminTicketOrderGet(input: {
  readonly orderId: string
}): Promise<Result<AdminTicketOrderDetails>> {
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return adminTicketOrderGetService({ token: tokenResult.data, orderId: input.orderId }, apiClientCreate())
}
