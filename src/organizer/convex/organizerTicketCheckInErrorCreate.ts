import { createResultErrorCode, type ResultErr } from "#result"

export function organizerTicketCheckInErrorCreate(
  op: string,
  code: string,
  errorMessage: string,
  details?: Record<string, unknown>,
): ResultErr {
  const result = createResultErrorCode(op, errorMessage, code)
  if (!details) return result
  return { ...result, errorData: JSON.stringify(details) }
}
