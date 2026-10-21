import type { ResultError } from "#shared/resultError.js"
import { organizerDashboardErrorCatalog } from "./organizerDashboardErrorCatalog.ts"

const op = "organizerDashboardErrorEnvelopeCreate"

/**
 * Builds the shared error envelope for the organizer dashboard interface
 * layer. The code must be a catalog key; unknown codes collapse to
 * platform.internal/500. Message and details never carry credentials: callers
 * pass backend messages, which never contain the bearer credential.
 */
export function organizerDashboardErrorEnvelopeCreate(inputs: {
  readonly code: string
  readonly message: string
  readonly requestId: string
  readonly errorOp?: string
}): { readonly error: ResultError } {
  const known = Object.hasOwn(organizerDashboardErrorCatalog, inputs.code)
  const entry = known
    ? organizerDashboardErrorCatalog[inputs.code as keyof typeof organizerDashboardErrorCatalog]
    : organizerDashboardErrorCatalog["platform.internal"]
  const code = (known ? inputs.code : "platform.internal") as ResultError["code"]
  return {
    error: {
      code,
      message: inputs.message,
      op: inputs.errorOp ?? op,
      status: entry.httpStatus,
      requestId: inputs.requestId,
      retryable: entry.retryable,
      details: {},
    },
  }
}
