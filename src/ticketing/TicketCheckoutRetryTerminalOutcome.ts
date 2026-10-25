import type { Result } from "../ui/Result.ts"
import type { TicketCheckoutCreateResponse } from "./TicketCheckoutCreateResponse.ts"

/**
 * Outcome of the single fresh checkout attempt that follows a terminal retry
 * failure.
 *
 * `not_applicable` means that no fresh attempt happened: either no retry
 * record existed (a code-free purchase) or the failure was not the exact
 * terminal contract of the backend. `attempted` carries the fresh checkout
 * key and guest credential of the new attempt together with its result, so
 * the caller can bind the final order to the final credentials.
 */
export type TicketCheckoutRetryTerminalOutcome =
  | { readonly kind: "not_applicable" }
  | {
      readonly kind: "attempted"
      readonly checkoutKey: string
      readonly guestAccessToken?: string
      readonly result: Result<TicketCheckoutCreateResponse>
    }
