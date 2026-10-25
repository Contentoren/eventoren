import { createResult, createResultError, type PromiseResult } from "#result"
import { ticketAccessDigestCreate } from "./ticketAccessDigestCreate.js"
import { ticketActivationCodeHoldTokenCreate } from "./ticketActivationCodeHoldTokenCreate.js"

/**
 * Resolves the hold credential of a reservation.
 *
 * A presented credential is reused when it proves ownership of the stored
 * hold, otherwise a fresh unguessable credential is minted. Only digests are
 * ever stored, so the plain credential never reaches the database.
 */
export async function ticketActivationCodeHoldCredentialCreate(
  storedDigest: string | undefined,
  presentedToken: string | undefined,
): PromiseResult<{ readonly holdToken: string; readonly holdDigest: string }> {
  const op = "ticketActivationCodeHoldCredentialCreate"
  if (presentedToken !== undefined) {
    const presented = await ticketAccessDigestCreate(presentedToken)
    if (!presented.success) return presented
    if (presented.data === storedDigest) return createResult({ holdToken: presentedToken, holdDigest: presented.data })
  }
  const holdToken = ticketActivationCodeHoldTokenCreate()
  const digest = await ticketAccessDigestCreate(holdToken)
  if (!digest.success) return createResultError(op, "The hold credential could not be secured")
  return createResult({ holdToken, holdDigest: digest.data })
}
