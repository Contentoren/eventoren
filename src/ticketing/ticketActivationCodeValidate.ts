import type { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import { apiClientCreate } from "../client/apiClient.js"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"

const op = "ticketActivationCodeValidate"

export async function ticketActivationCodeValidate(
  input: {
    readonly eventKey: string
    readonly tierKey: string
    readonly code: string
  },
  client: ConvexHttpClient = apiClientCreate(),
): Promise<Result<{ readonly valid: boolean }>> {
  try {
    const response = await client.query(api.ticketing.ticketActivationCodeValidateQuery, input)
    if (!response.success) return createResultError(op, response.errorMessage, response)
    return createResult(response.data as { readonly valid: boolean })
  } catch (error) {
    return createResultError(op, "Der Freischaltungscode konnte nicht geprüft werden.", error)
  }
}
