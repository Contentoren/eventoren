import { expect, test } from "@rstest/core"
import { ticketE2eImapTimeoutDiagnostic } from "./ticketE2eImapTimeoutDiagnostic.ts"

test("a transient mailbox error followed by successful no-match polls reports no matching message", () => {
  expect(ticketE2eImapTimeoutDiagnostic({ successfulPolls: 35, failedPolls: 1, lastFailureCode: "unknown" })).toBe(
    "; no matching message found on 35 successful INBOX poll(s); 1 transient mailbox read/parse failure(s), last error code: unknown",
  )
})

test("a sustained mailbox failure is not reported as a message delivery timeout", () => {
  expect(ticketE2eImapTimeoutDiagnostic({ successfulPolls: 0, failedPolls: 4, lastFailureCode: "ECONNRESET" })).toBe(
    "; mailbox read/parse failed on all 4 poll(s), last error code: ECONNRESET",
  )
})

test("successful no-match polls report no mailbox errors", () => {
  expect(ticketE2eImapTimeoutDiagnostic({ successfulPolls: 3, failedPolls: 0, lastFailureCode: "unknown" })).toBe(
    "; no matching message found among scanned INBOX messages",
  )
})
