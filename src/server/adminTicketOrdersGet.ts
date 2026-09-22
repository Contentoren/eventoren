import { getRequestHeader } from "@tanstack/solid-start/server"
import type { PaginationOptions } from "convex/server"
import { createResultError, type Result } from "#result"
import type { AdminTicketOrderListPage } from "#src/admin/AdminTicketOrderListPage.ts"
import { adminTicketOrdersList } from "#src/admin/adminTicketOrdersList.ts"
import { apiClientCreate } from "../client/apiClient.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"
import { convexUrlGet } from "./convexUrlGet.ts"

const op = "adminTicketOrdersGet"

export async function adminTicketOrdersGet(input: {
  readonly paginationOpts: PaginationOptions
}): Promise<Result<AdminTicketOrderListPage>> {
  const tokenResult = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!tokenResult.success) return createResultError(op, tokenResult.errorMessage)
  return adminTicketOrdersList(
    { token: tokenResult.data, paginationOpts: input.paginationOpts },
    apiClientCreate(convexUrlGet()),
  )
}
