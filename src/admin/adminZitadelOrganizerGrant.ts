import type { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import { apiClientCreate } from "../client/apiClient.ts"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"

const op = "adminZitadelOrganizerGrant"

export async function adminZitadelOrganizerGrant(
  input: { readonly operation: "grant" | "revoke"; readonly token: string; readonly zitadelUserId: string },
  client?: ConvexHttpClient,
): Promise<
  Result<{
    readonly eventorenRole?: "user" | "customer" | "organizer" | "admin" | "dev"
    readonly eventorenUserId?: string
    readonly organizerGranted: boolean
    readonly organizerInvitedAt?: string
    readonly operation: "grant" | "revoke"
    readonly zitadelRoles: readonly ("customer" | "organizer" | "admin")[]
    readonly zitadelUserId: string
  }>
> {
  try {
    const response = await (client ?? apiClientCreate()).action(api.auth.authAdminZitadelOrganizerGrantAction, input)
    if (!response.success) return createResultError(op, response.errorMessage, response)
    return createResult(response.data)
  } catch (error) {
    return createResultError(op, "The organizer role could not be changed.", error)
  }
}
