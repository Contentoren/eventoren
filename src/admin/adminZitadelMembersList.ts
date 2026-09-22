import type { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import { apiClientCreate } from "../client/apiClient.ts"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { AdminZitadelMember } from "./AdminZitadelMember.ts"

const op = "adminZitadelMembersList"

export async function adminZitadelMembersList(
  input: { readonly limit?: number; readonly offset?: number; readonly search?: string; readonly token: string },
  client?: ConvexHttpClient,
): Promise<Result<{ readonly members: readonly AdminZitadelMember[]; readonly total: number }>> {
  try {
    const response = await (client ?? apiClientCreate()).action(api.auth.authAdminZitadelMembersListAction, input)
    if (!response.success) return createResultError(op, response.errorMessage, response)
    return createResult(response.data)
  } catch (error) {
    return createResultError(op, "Members could not be loaded.", error)
  }
}
