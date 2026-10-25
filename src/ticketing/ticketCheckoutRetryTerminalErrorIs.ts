import type { Result } from "../ui/Result.ts"

/**
 * Terminal contract of a checkout key that the backend refuses to replay.
 *
 * The prepare mutation answers with exactly this message when the stored
 * checkout already reached a terminal status (failed, expired, released or a
 * paid inventory conflict). Every other failure carries a different message:
 * a transient provider or network problem, an ownership mismatch or a changed
 * checkout context never ends a retry record.
 */
const terminalErrorMessage = "The checkout is no longer retryable"

/**
 * Ops that carry the terminal contract. The prepare mutation produces it and
 * the create action forwards it unchanged; the browser wrapper re-wraps the
 * forwarded result and keeps the original result in `rawData`.
 */
const terminalErrorOps = new Set([
  "ticketCheckoutPrepareMutation",
  "ticketCheckoutCreate",
  "ticketCheckoutCreateFromSession",
])

/**
 * True when a failed checkout result is the exact terminal contract of the
 * backend. Only that answer proves that the stored checkout key reached a
 * final status; every other error keeps the stored retry record and stays a
 * plain failure.
 */
export function ticketCheckoutRetryTerminalErrorIs(result: Result<unknown>): boolean {
  if (result.success) return false
  if (result.errorMessage !== terminalErrorMessage) return false
  if (terminalErrorOps.has(result.op)) return true
  const raw = result.rawData
  if (typeof raw !== "object" || raw === null) return false
  const rawOp = (raw as { readonly op?: unknown }).op
  return typeof rawOp === "string" && terminalErrorOps.has(rawOp)
}
