import type { Doc } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { ticketAccessDigestCreate } from "./ticketAccessDigestCreate.js"

/** The credential window of the browser hold, matching the reservation input. */
const holdTokenMinLength = 16
const holdTokenMaxLength = 256

/**
 * How a checkout takes over an activation code.
 *
 * - "free": the code is unreserved, the checkout takes it directly.
 * - "adopt": the code carries a live browser hold of the presented
 *   credential, the checkout takes that hold over.
 */
export type TicketActivationCodeHoldAdoption =
  | { readonly kind: "free" }
  | { readonly kind: "adopt"; readonly holdExpiresAt: number }

/**
 * Decides whether a checkout may take over the browser hold of an activation code.
 *
 * A hold is adopted only while it is unexpired and owned by the presented
 * credential. A free code needs no credential at all, so old and CLI callers
 * keep working. A code that an order already owns is never adoptable: a second
 * checkout key can not steal an attached order, not even with the credential of
 * the browser that holds it.
 *
 * The deadline of an adopted hold is the server-owned hold expiry. A client
 * timestamp is never part of this decision.
 */
export async function ticketActivationCodeHoldAdoptionResolve(
  code: Doc<"ticketActivationCodes">,
  presentedHoldToken: string | undefined,
  nowMs: number,
): PromiseResult<TicketActivationCodeHoldAdoption> {
  const op = "ticketActivationCodeHoldAdoptionResolve"
  const unavailable = () => createResultError(op, "The activation code is no longer available")
  // A charged code is never up for adoption.
  if (code.status === "consumed" || code.consumedAt !== undefined) return unavailable()
  // An attached code belongs to its order and is never handed to another one.
  if (code.orderId !== undefined) return unavailable()
  const digest = code.browserHoldDigest
  const holdExpiresAt = code.browserHoldExpiresAt
  // A live browser hold is a reserved code without an owner: the hold window
  // and its credential are still the ones the browser received.
  const holdActive =
    code.status === "reserved" && digest !== undefined && holdExpiresAt !== undefined && holdExpiresAt > nowMs
  if (holdActive) {
    // A live hold belongs to the browser that proved ownership of it.
    if (
      presentedHoldToken === undefined ||
      presentedHoldToken.length < holdTokenMinLength ||
      presentedHoldToken.length > holdTokenMaxLength
    )
      return unavailable()
    const presented = await ticketAccessDigestCreate(presentedHoldToken)
    if (!presented.success) return createResultError(op, "The activation code could not be verified")
    if (presented.data !== digest) return unavailable()
    return createResult({ kind: "adopt", holdExpiresAt })
  }
  // A free code needs no credential: old and CLI callers keep working.
  if (code.status === "available") return createResult({ kind: "free" })
  return unavailable()
}
