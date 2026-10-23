export type TicketPaymentOutcomeErrorCode =
  | "ticketing.outcome-unconfigured"
  | "ticketing.outcome-unauthorized"
  | "ticketing.outcome-invalid"
  | "ticketing.outcome-conflict"

type TicketPaymentOutcomeErrorEntry = {
  readonly httpStatus: 400 | 401 | 409 | 503
  readonly retryable: boolean
}

export const ticketPaymentOutcomeErrorCatalog: Record<TicketPaymentOutcomeErrorCode, TicketPaymentOutcomeErrorEntry> = {
  "ticketing.outcome-unconfigured": { httpStatus: 503, retryable: true },
  "ticketing.outcome-unauthorized": { httpStatus: 401, retryable: false },
  "ticketing.outcome-invalid": { httpStatus: 400, retryable: false },
  "ticketing.outcome-conflict": { httpStatus: 409, retryable: false },
}

export const ticketPaymentOutcomeUnknownError = {
  code: "platform.internal",
  httpStatus: 500,
  retryable: false,
} as const
