import type { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import { apiClientCreate } from "../client/apiClient.js"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"

const op = "ticketActivationCodeGenerate"

export async function ticketActivationCodeGenerate(
  input: {
    readonly token: string
    readonly eventKey: string
    readonly tierKey: string
    readonly count: number
  },
  client: ConvexHttpClient = apiClientCreate(),
): Promise<
  Result<{
    readonly eventKey: string
    readonly tierKey: string
    readonly generated: readonly { readonly id: string; readonly number: number; readonly code: string }[]
    readonly lastNumber: number
  }>
> {
  try {
    const response = await client.mutation(api.ticketing.ticketActivationCodeGenerateMutation, input)
    if (!response.success) return createResultError(op, response.errorMessage, response)
    return createResult(
      response.data as {
        readonly eventKey: string
        readonly tierKey: string
        readonly generated: readonly { readonly id: string; readonly number: number; readonly code: string }[]
        readonly lastNumber: number
      },
    )
  } catch (error) {
    return createResultError(op, "Freischaltungscodes konnten nicht erzeugt werden.", error)
  }
}
