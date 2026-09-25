export function ticketE2eImapTimeoutDiagnostic(input: {
  successfulPolls: number
  failedPolls: number
  lastFailureCode: string
}): string {
  if (!input.failedPolls) return "; no matching message found among scanned INBOX messages"
  if (!input.successfulPolls)
    return `; mailbox read/parse failed on all ${input.failedPolls} poll(s), last error code: ${input.lastFailureCode}`
  return `; no matching message found on ${input.successfulPolls} successful INBOX poll(s); ${input.failedPolls} transient mailbox read/parse failure(s), last error code: ${input.lastFailureCode}`
}
