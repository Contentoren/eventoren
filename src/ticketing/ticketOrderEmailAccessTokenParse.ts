import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"

const accessHashPattern = /^#ticketAccess=([A-Za-z0-9_-]{32,256})$/u

export function ticketOrderEmailAccessTokenParse(hash: string): Result<string> {
  const match = accessHashPattern.exec(hash)
  const token = match?.[1]
  if (!token) return createResultError("ticketOrderEmailAccessTokenParse", "Ticket access link is invalid")
  return createResult(token)
}
