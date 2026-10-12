import { createResult, createResultError } from "#result"
import { ImapFlow } from "imapflow"
import { ticketE2eMessageParse } from "./ticketE2eMessageParse.ts"

/**
 * Independent recognizable historical ticket-e2e mailbox discovery.
 *
 * Finds disposable ticket confirmations directly in the mailbox even when the
 * database/ledger candidate inventory is empty (older failed runs, lost
 * ledgers). A message is a fixture only when the recognizable triple holds:
 * the subject contains the exact known E2E title (`Ticket E2E <runId>` with
 * ticket-e2e marker naming bound to a UUID), the body contains the same exact
 * title AND a canonical configured Eventoren origin `/checkout`
 * capability link (`#ticketAccess=...`), and a PDF attachment is present
 * (checked by `ticketE2eMessageParse`). Genuine mail, generic E2E titles
 * without a bound UUID, replies without the triple, foreign-origin
 * capabilities and PDF-less messages are preserved by design.
 *
 * Never performs a recipient-wide purge: the IMAP search is always the fixed
 * recognizable subject substring (`Ticket E2E`, the actual subject prefix),
 * never ALL, and only bounded UID-range pages are fetched (cursor advances
 * through sorted UIDs in batches). Deletion stays with the historical
 * cleanup scan via exact-UID EXPUNGE only; verification only reports
 * lingering UIDs and never expunges or relies on `\Deleted` flags. No app
 * proof lookup is required: the global title regex derives the runId and the
 * capability parse proves the ticket code once the triple plus mail origin
 * are established.
 */

export const ticketE2eHistoricalSubjectSearch = "Ticket E2E"

export const ticketE2eHistoricalTitlePattern =
  /^Ticket E2E [0-9a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u

const ticketE2eHistoricalTitleFindPattern =
  /Ticket E2E [0-9a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/u

const ticketE2eHistoricalRunIdPattern = /^[0-9a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u

export type TicketE2eHistoricalDiscovered = {
  uid: number
  uidValidity: string
  eventTitle: string
  runId: string
}

export type TicketE2eHistoricalDiscoverClient = Pick<
  ImapFlow,
  "connect" | "close" | "getMailboxLock" | "mailbox" | "search" | "fetchAll"
>

/** Extract the exact known E2E title embedded in a subject line. */
export function ticketE2eHistoricalTitleExtract(subject: string): string | null {
  if (typeof subject !== "string" || subject.length === 0) return null
  const match = ticketE2eHistoricalTitleFindPattern.exec(subject)
  if (!match) return null
  const title = match[0]
  if (!ticketE2eHistoricalTitlePattern.test(title)) return null
  return title
}

/** Derive the bound runId from an exact known E2E title. */
export function ticketE2eHistoricalRunIdExtract(eventTitle: string): string | null {
  const prefix = "Ticket E2E "
  if (!eventTitle.startsWith(prefix)) return null
  const runId = eventTitle.slice(prefix.length)
  if (!ticketE2eHistoricalRunIdPattern.test(runId)) return null
  return runId
}

/**
 * Global recognizable mailbox discovery: bounded subject search plus strict
 * per-message triple verification. Returns only fixture UIDs with their
 * derived exact titles/runIds. Any IMAP failure returns a required failure
 * (inventory unknown, checkpoint retained), never an absent claim.
 */
export async function ticketE2eImapHistoricalDiscover(input: {
  mail: { host: string; port: number; user: string; password: string }
  baseUrl: string
  client?: TicketE2eHistoricalDiscoverClient
  clientFactory?: () => TicketE2eHistoricalDiscoverClient
  maxDiscoveredUids?: number
  fetchBatchSize?: number
}): Promise<
  { success: true; data: TicketE2eHistoricalDiscovered[] } | { success: false; op: string; errorMessage: string }
> {
  const op = "ticketE2eImapHistoricalDiscover"
  const maxDiscoveredUids = input.maxDiscoveredUids ?? 1000
  const fetchBatchSize = input.fetchBatchSize ?? 50
  let origin: string
  try {
    origin = new URL(input.baseUrl).origin
  } catch {
    return createResultError(op, "Historical IMAP discovery origin unavailable; checkpoint retained")
  }
  const client =
    input.client ??
    input.clientFactory?.() ??
    new ImapFlow({
      host: input.mail.host,
      port: input.mail.port,
      secure: true,
      auth: { user: input.mail.user, pass: input.mail.password },
      logger: false,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    })
  try {
    await client.connect()
    const lock = await client.getMailboxLock("INBOX")
    try {
      const mailbox = client.mailbox
      if (mailbox === false || !mailbox) return createResult([])
      const uidValidityRaw: unknown = mailbox.uidValidity
      if (uidValidityRaw === undefined || uidValidityRaw === null) return createResult([])
      const uidValidity = String(uidValidityRaw)
      if (uidValidity.length === 0) return createResult([])
      const rawUids: unknown = await client.search({ subject: ticketE2eHistoricalSubjectSearch }, { uid: true })
      if (!Array.isArray(rawUids)) return createResult([])
      if (rawUids.length === 0) return createResult([])
      const uids = rawUids
        .filter((uid): uid is number => typeof uid === "number" && Number.isInteger(uid) && uid > 0)
        .sort((left, right) => left - right)
      if (uids.length === 0) return createResult([])
      if (uids.length > maxDiscoveredUids)
        return createResultError(op, "Historical IMAP discovery exceeds the bounded limit; checkpoint retained")
      const found: TicketE2eHistoricalDiscovered[] = []
      // Bounded UID-cursor pages: each fetch range references at most
      // fetchBatchSize UIDs; the cursor advances through sorted UIDs so a
      // mid-cycle failure retains the checkpoint with nothing deleted.
      for (let offset = 0; offset < uids.length; offset += fetchBatchSize) {
        const batch = uids.slice(offset, offset + fetchBatchSize)
        let messages: Awaited<ReturnType<TicketE2eHistoricalDiscoverClient["fetchAll"]>>
        try {
          messages = await client.fetchAll(
            batch.join(","),
            { envelope: true, source: { maxLength: 1_000_000 } },
            { uid: true },
          )
        } catch {
          return createResultError(op, "Historical IMAP discovery unavailable; checkpoint retained")
        }
        for (const message of messages) {
          if (typeof message.uid !== "number" || !Number.isInteger(message.uid) || message.uid <= 0) continue
          if (!batch.includes(message.uid)) continue
          const title = ticketE2eHistoricalTitleExtract(message.envelope?.subject ?? "")
          if (!title) continue
          const runId = ticketE2eHistoricalRunIdExtract(title)
          if (!runId) continue
          let parsed: Awaited<ReturnType<typeof ticketE2eMessageParse>>
          try {
            parsed = await ticketE2eMessageParse({
              source: message.source ?? Buffer.alloc(0),
              purchaseMarker: title,
              linkOrigin: origin,
            })
          } catch {
            continue
          }
          if (!parsed) continue
          found.push({ uid: message.uid, uidValidity, eventTitle: title, runId })
          if (found.length > maxDiscoveredUids)
            return createResultError(op, "Historical IMAP discovery exceeds the bounded limit; checkpoint retained")
        }
      }
      return createResult(found)
    } finally {
      lock.release()
    }
  } catch {
    return createResultError(op, "Historical IMAP discovery unavailable; checkpoint retained")
  } finally {
    client.close()
  }
}
