import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketCheckoutCreateInput } from "./TicketCheckoutCreateInput.ts"
import type { TicketCheckoutCreateResponse } from "./TicketCheckoutCreateResponse.ts"
import type { TicketCheckoutRetryTerminalOutcome } from "./TicketCheckoutRetryTerminalOutcome.ts"
import { ticketCheckoutCancelUrlCreate } from "./ticketCheckoutCancelUrlCreate.ts"
import { ticketCheckoutKeyCreate } from "./ticketCheckoutKeyCreate.ts"
import { ticketCheckoutRetryClearByCheckoutKey, ticketCheckoutRetryStore } from "./ticketCheckoutRetryStore.ts"
import type { TicketCheckoutRetryStored } from "./ticketCheckoutRetryStoredSchema.ts"
import { ticketCheckoutRetryTerminalErrorIs } from "./ticketCheckoutRetryTerminalErrorIs.ts"
import { ticketCheckoutReturnUrlCreate } from "./ticketCheckoutReturnUrlCreate.ts"
import { ticketGuestAccessTokenCreate } from "./ticketGuestAccessTokenCreate.ts"

const op = "ticketCheckoutRetryTerminalSubmit"

/** Booking evidence of the current attempt, without the key and the URLs. */
type TicketCheckoutRetryMaterial = Omit<
  TicketCheckoutCreateInput,
  "token" | "guestAccessToken" | "checkoutKey" | "successUrl" | "cancelUrl"
>

/** Checkout payload of an attempt, without the transport specific fields. */
type TicketCheckoutRetryPayload = Omit<TicketCheckoutCreateInput, "token" | "guestAccessToken">

type TicketCheckoutRetryTerminalInput = {
  /** Result of the attempt that replayed the stored checkout key. */
  readonly failed: Result<unknown>
  /** Stored snapshot that the failed attempt replayed. */
  readonly retry: TicketCheckoutRetryStored | undefined
  /** Checkout key that the failed attempt used. */
  readonly failedCheckoutKey: string
  readonly appOrigin: string
  /** Current booking evidence, including the current hold credential. */
  readonly material: TicketCheckoutRetryMaterial
  readonly authenticated: boolean
  readonly submit: (
    input: TicketCheckoutRetryPayload,
    guestAccessToken: string | undefined,
  ) => Promise<Result<TicketCheckoutCreateResponse>>
}

/**
 * Runs the single fresh checkout attempt that follows a terminal retry
 * failure.
 *
 * The backend reports a checkout key as terminal when its order already
 * reached a final status. Replaying that key can never succeed again, so the
 * stored snapshot is removed and one fresh checkout starts with a new key, a
 * new guest credential, the current booking evidence (including the current
 * hold credential) and the current checkout URLs. The fresh snapshot is stored
 * before the network call, so an interrupted fresh attempt keeps its key on
 * the next submit.
 *
 * The helper performs exactly one network attempt and never loops. Every
 * failure that is not the exact terminal contract - a transient provider or
 * network problem, an ownership mismatch, a changed checkout context - keeps
 * the stored snapshot and starts no fresh attempt.
 */
export async function ticketCheckoutRetryTerminalSubmit(
  input: TicketCheckoutRetryTerminalInput,
): Promise<TicketCheckoutRetryTerminalOutcome> {
  if (input.retry === undefined) return { kind: "not_applicable" }
  if (input.retry.checkoutKey !== input.failedCheckoutKey) return { kind: "not_applicable" }
  if (!ticketCheckoutRetryTerminalErrorIs(input.failed)) return { kind: "not_applicable" }

  // The terminal key must not be replayed again. A denied storage never
  // blocks the purchase: the fresh snapshot replaces the terminal record
  // because it is stored first.
  ticketCheckoutRetryClearByCheckoutKey(input.retry.checkoutKey)

  const checkoutKey = ticketCheckoutKeyCreate()
  const guestAccessToken = input.authenticated ? undefined : ticketGuestAccessTokenCreate()
  const returnUrl = ticketCheckoutReturnUrlCreate(input.appOrigin, checkoutKey)
  if (!returnUrl.success)
    return {
      kind: "attempted",
      checkoutKey,
      guestAccessToken,
      result: createResultError(op, returnUrl.errorMessage),
    }
  const cancelUrl = ticketCheckoutCancelUrlCreate(input.appOrigin, input.material.eventKey)
  if (!cancelUrl.success)
    return {
      kind: "attempted",
      checkoutKey,
      guestAccessToken,
      result: createResultError(op, cancelUrl.errorMessage),
    }

  const checkoutInput: TicketCheckoutRetryPayload = {
    checkoutKey,
    ...input.material,
    successUrl: returnUrl.data,
    cancelUrl: cancelUrl.data,
  }
  // The fresh snapshot is stored before the network call, so the next submit
  // reuses the fresh key and the fresh guest credential.
  ticketCheckoutRetryStore({ checkoutInput, checkoutKey, guestAccessToken })
  const result = await input.submit(checkoutInput, guestAccessToken)
  return { kind: "attempted", checkoutKey, guestAccessToken, result }
}
