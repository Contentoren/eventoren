import { createResult, createResultError } from "#result"
import {
  ticketE2eImapHistoricalDiscover,
  type TicketE2eHistoricalDiscovered,
} from "./ticketE2eImapHistoricalDiscovery.ts"

type HistoricalCandidate = { eventKey: string; runId?: string; kind?: string }

/**
 * Read-only final verification that no historical ticket-confirmation mails
 * remain, including recognizable mailbox fixtures with zero database/ledger
 * candidates. The per-candidate exact-marker search is unioned with the
 * independent global recognizable mailbox discovery (fixed `Ticket E2E`
 * subject substring, bounded UID-range pages, strict per-message
 * source/capability/PDF parse); any remaining fixture UID fails verification
 * and retains the checkpoint. Messages outside the E2E ownership
 * classification are excluded by the strict parse and remain retained by
 * design. Never deletes; deletion stays with the historical cleanup scan via
 * exact-UID EXPUNGE only. Missing IMAP credentials fail as inventory unknown
 * instead of claiming absence. No app proof lookup is required for global
 * fixtures: the recognizable triple plus mail origin establishes ownership.
 */
export async function ticketE2eImapHistoricalVerify(input: {
  candidates: HistoricalCandidate[]
  baseUrl: string
  mail?: { host: string; port: number; user: string; password: string }
  search?: (args: {
    candidate: HistoricalCandidate
    eventTitle: string
    mail: NonNullable<typeof input.mail>
    baseUrl: string
  }) => Promise<{ success: boolean; errorMessage?: string; data?: { uid: number; uidValidity: string }[] }>
  discover?: (args: {
    mail: NonNullable<typeof input.mail>
    baseUrl: string
  }) => Promise<{ success: true; data?: TicketE2eHistoricalDiscovered[] } | { success: false; errorMessage?: string }>
}) {
  const op = "ticketE2eImapHistoricalVerify"
  const ticketCandidates = input.candidates.filter((candidate) => candidate.kind === "ticket-e2e" || !candidate.kind)
  const mail = input.mail
  if (mail === undefined) {
    // No mailbox configured and nothing ticket-scoped to inventory: preserve
    // the caller's legitimate absent contract (unverified inventory, not a
    // proven global zero). Any ticket candidate without a mailbox fails as
    // inventory unknown instead of claiming absence.
    if (ticketCandidates.length > 0)
      return createResultError(
        op,
        "Missing explicit IMAP verification credentials; inventory unknown, checkpoint retained",
      )
    return createResult({ status: "imap-historical-absent" as const })
  }
  if (!mail.host || !mail.user || !mail.password || !Number.isInteger(mail.port) || mail.port < 1)
    return createResultError(
      op,
      "Missing explicit IMAP verification credentials; inventory unknown, checkpoint retained",
    )
  const residual: string[] = []
  for (const candidate of ticketCandidates) {
    const runId = candidate.runId ?? ticketE2eImapVerifyRunIdExtract(candidate.eventKey)
    if (!runId) continue
    const eventTitle = `Ticket E2E ${runId}`
    if (!input.search) continue
    const found = await input.search({ candidate, eventTitle, mail, baseUrl: input.baseUrl })
    if (!found.success) return createResultError(op, found.errorMessage ?? "Historical IMAP verification unavailable")
    for (const message of found.data ?? []) residual.push(`UID ${message.uid} (${eventTitle})`)
  }
  const global = await (
    input.discover ??
    ((args: { mail: NonNullable<typeof input.mail>; baseUrl: string }) =>
      ticketE2eImapHistoricalDiscover({ mail: args.mail, baseUrl: args.baseUrl }))
  )({
    mail,
    baseUrl: input.baseUrl,
  })
  if (global.success !== true)
    return createResultError(
      op,
      typeof global.errorMessage === "string" && global.errorMessage.length > 0
        ? global.errorMessage
        : "Historical IMAP verification unavailable; checkpoint retained",
    )
  for (const message of global.data ?? []) {
    if (typeof message.uid !== "number" || !Number.isInteger(message.uid) || message.uid <= 0)
      return createResultError(op, "Historical IMAP verification returned malformed UID; checkpoint retained")
    if (typeof message.eventTitle !== "string" || message.eventTitle.length === 0)
      return createResultError(op, "Historical IMAP verification returned malformed data; checkpoint retained")
    const marker = `UID ${message.uid} (${message.eventTitle})`
    if (!residual.includes(marker)) residual.push(marker)
  }
  if (residual.length > 0)
    return createResultError(
      op,
      `Historical IMAP retains disposable confirmations; checkpoint retained: ${residual.join("; ")}`,
    )
  return createResult({ status: "imap-historical-absent" as const })
}

function ticketE2eImapVerifyRunIdExtract(eventKey: string): string | null {
  const prefix = "ticket-e2e-"
  if (!eventKey.startsWith(prefix)) return null
  const runId = eventKey.slice(prefix.length)
  if (!/^[0-9a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(runId)) return null
  return runId
}
