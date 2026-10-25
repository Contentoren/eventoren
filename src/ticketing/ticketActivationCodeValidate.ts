import type { ConvexHttpClient } from "convex/browser"
import { apiClientCreate } from "../client/apiClient.js"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import { ticketActivationCodeHoldStorageUpsert } from "./ticketActivationCodeHoldStorageUpsert.ts"
import { ticketActivationCodeHoldTokenGet } from "./ticketActivationCodeHoldTokenGet.ts"
import { ticketActivationCodeNormalize } from "./ticketActivationCodeNormalize.ts"
import { ticketActivationCodeReserve } from "./ticketActivationCodeReserve.ts"
import type { TicketActivationCodeReserveInput } from "./ticketActivationCodeReserveInputSchema.ts"

const op = "ticketActivationCodeValidate"

type TicketActivationCodeValidateInput = {
  readonly eventKey: string
  readonly tierKey: string
  readonly code: string
}

/**
 * Browser-facing activation-code check with the legacy boolean contract.
 * The check reserves the code for this browser: on success the caller's own
 * hold credential is stored separately from the 24h cart, keyed by the exact
 * event/tier/normalized-code context. A denied store never fails validation.
 *
 * A failing reservation fails closed: without a reservation there is no hold,
 * so the read-only query must not answer for a code the server may already
 * hold for another browser.
 */
export async function ticketActivationCodeValidate(
  input: TicketActivationCodeValidateInput,
  client: ConvexHttpClient = apiClientCreate(),
): Promise<Result<{ readonly valid: boolean }>> {
  const normalized = ticketActivationCodeNormalize(input.code)
  const storedLookup = ticketActivationCodeHoldTokenGet({
    eventKey: input.eventKey,
    tierKey: input.tierKey,
    code: normalized,
  })
  const storedToken = storedLookup.success ? storedLookup.data : undefined
  const reserveInput: TicketActivationCodeReserveInput = {
    eventKey: input.eventKey,
    tierKey: input.tierKey,
    code: input.code,
    ...(storedToken === undefined ? {} : { holdToken: storedToken }),
  }
  try {
    const reserved = await ticketActivationCodeReserve(reserveInput, client)
    if (!reserved.success) {
      return createResultError(op, "Der Freischaltungscode konnte nicht geprüft werden.", reserved)
    }
    if (!reserved.data.valid) return createResult({ valid: false as const })
    if (reserved.data.holdToken !== undefined) {
      ticketActivationCodeHoldStorageUpsert({
        eventKey: input.eventKey.trim(),
        tierKey: input.tierKey.trim(),
        code: normalized,
        holdToken: reserved.data.holdToken,
        ...(reserved.data.expiresAt === undefined ? {} : { expiresAt: reserved.data.expiresAt }),
        savedAt: Date.now(),
      })
    }
    return createResult({ valid: true as const })
  } catch (error) {
    return createResultError(op, "Der Freischaltungscode konnte nicht geprüft werden.", error)
  }
}
