import type { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import type { ZitadelRole } from "#src/auth/model_field/zitadelRole.ts"
import { apiClientCreate } from "../client/apiClient.ts"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"

const op = "adminZitadelRolesSet"

export async function adminZitadelRolesSet(
  input: { readonly roles: readonly ZitadelRole[]; readonly token: string; readonly zitadelUserId: string },
  client?: ConvexHttpClient,
): Promise<
  Result<{
    readonly eventorenRole?: "user" | "customer" | "organizer" | "admin"
    readonly eventorenUserId?: string
    readonly organizerGranted: boolean
    readonly organizerInvitedAt?: string
    readonly roles: readonly ZitadelRole[]
    readonly zitadelUserId: string
  }>
> {
  try {
    const response = await (client ?? apiClientCreate()).action(api.auth.authAdminZitadelRolesSetAction, {
      roles: [...input.roles],
      token: input.token,
      zitadelUserId: input.zitadelUserId,
    })
    if (!response.success) return createResultError(op, response.errorMessage, response)
    return createResult(response.data)
  } catch (error) {
    return createResultError(op, "The roles could not be changed.", error)
  }
}
