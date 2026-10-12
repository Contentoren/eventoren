import { createResult, createResultError } from "#result"
import { ticketE2eImapConfirmationDelete } from "./ticketE2eImapConfirmationDelete.ts"
import {
  ticketE2eImapHistoricalDiscover,
  type TicketE2eHistoricalDiscovered,
} from "./ticketE2eImapHistoricalDiscovery.ts"
import { ticketE2eMessageParse } from "./ticketE2eMessageParse.ts"
import { ImapFlow } from "imapflow"

type HistoricalCandidate = { eventKey: string; runId?: string; kind?: string }

type ImapDiscoveredMessage = { uid: number; uidValidity: string }

type ImapSearchOk = { success: true; data?: ImapDiscoveredMessage[] }

type ImapSearchErr = { success: false; errorMessage?: string }

type ImapSearchResult = ImapSearchOk | ImapSearchErr

/**
 * Delete historical ticket-confirmation mails, including recognizable
 * mailbox fixtures with zero database/ledger candidates.
 * Only messages whose subject and body contain the exact known E2E event
 * title (`Ticket E2E <runId>`), whose capability link matches the canonical
 * configured Eventoren origin (`/checkout#ticketAccess=...`) and whose PDF
 * attachment proves the ticket mail are deleted with exact-UID EXPUNGE. The
 * per-candidate exact-title search is unioned with the independent global
 * recognizable mailbox discovery (fixed `Ticket E2E` subject substring,
 * bounded UID-range pages, strict per-message source/capability/PDF parse);
 * genuine mail, generic E2E titles, replies, foreign origins and PDF-less
 * messages are retained outside the ownership classification, never deleted.
 * Mail PDFs live outside Convex (IMAP attachments); there is no PDF
 * storageId to clean. No app proof lookup is required for global fixtures:
 * the recognizable triple plus mail origin establishes ownership. Discovered
 * UIDs are persisted through ledgerAppend before any deletion; a failure
 * retains phase and UID evidence. Missing IMAP credentials fail as inventory
 * unknown instead of claiming no-fixture.
 */
export async function ticketE2eImapHistoricalCleanupScan(input: {
  candidates: HistoricalCandidate[]
  baseUrl: string
  mail?: { host: string; port: number; user: string; password: string }
  search?: (args: {
    candidate: HistoricalCandidate
    eventTitle: string
    mail: NonNullable<typeof input.mail>
    baseUrl: string
  }) => Promise<ImapSearchResult>
  discover?: (args: {
    mail: NonNullable<typeof input.mail>
    baseUrl: string
  }) => Promise<{ success: true; data?: TicketE2eHistoricalDiscovered[] } | { success: false; errorMessage?: string }>
  remove?: typeof ticketE2eImapConfirmationDelete
  ledgerAppend?: (entry: unknown) => Promise<{ success: boolean; errorMessage?: string }>
}) {
  const op = "ticketE2eImapHistoricalCleanupScan"
  const ticketCandidates = input.candidates.filter((candidate) => candidate.kind === "ticket-e2e" || !candidate.kind)
  const mail = input.mail
  if (mail === undefined) {
    // No mailbox configured and nothing ticket-scoped to inventory: preserve
    // the caller's legitimate no-fixture contract (unverified inventory, not
    // a proven global zero). Any ticket candidate without a mailbox fails as
    // inventory unknown instead of claiming no-fixture.
    if (ticketCandidates.length > 0)
      return createResultError(op, "Missing explicit IMAP cleanup credentials; inventory unknown, checkpoint retained")
    return createResult({ status: "no-fixture" as const })
  }
  if (!mail.host || !mail.user || !mail.password || !Number.isInteger(mail.port) || mail.port < 1)
    return createResultError(op, "Missing explicit IMAP cleanup credentials; inventory unknown, checkpoint retained")

  const discovered: { uid: number; uidValidity: string; eventTitle: string; runId: string }[] = []
  const seen = new Set<string>()
  const pushDiscovered = (entry: { uid: number; uidValidity: string; eventTitle: string; runId: string }) => {
    const key = `${entry.uidValidity}:${entry.uid}`
    if (seen.has(key)) return
    seen.add(key)
    discovered.push(entry)
  }
  for (const candidate of ticketCandidates) {
    const runId = candidate.runId ?? ticketE2eImapRunIdExtract(candidate.eventKey)
    if (!runId) continue
    const eventTitle = `Ticket E2E ${runId}`
    const found = await (input.search ?? ticketE2eImapHistoricalSearch)({
      candidate,
      eventTitle,
      mail,
      baseUrl: input.baseUrl,
    })
    if (found.success !== true)
      return createResultError(
        op,
        typeof found.errorMessage === "string" && found.errorMessage.length > 0
          ? found.errorMessage
          : "Historical IMAP discovery unavailable",
      )
    const messages: unknown = found.data ?? []
    if (!Array.isArray(messages))
      return createResultError(op, "Historical IMAP discovery returned malformed data; checkpoint retained")
    for (const entry of messages) {
      if (!isRecord(entry))
        return createResultError(op, "Historical IMAP discovery returned malformed data; checkpoint retained")
      const uid: unknown = entry["uid"]
      const uidValidity: unknown = entry["uidValidity"]
      if (typeof uid !== "number" || !Number.isInteger(uid) || uid <= 0)
        return createResultError(op, "Historical IMAP discovery returned malformed UID; checkpoint retained")
      if (typeof uidValidity !== "string" || uidValidity.length === 0)
        return createResultError(op, "Historical IMAP discovery returned malformed UIDVALIDITY; checkpoint retained")
      pushDiscovered({ uid, uidValidity, eventTitle, runId })
    }
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
        : "Historical IMAP discovery unavailable; checkpoint retained",
    )
  const globalMessages: unknown = global.data ?? []
  if (!Array.isArray(globalMessages))
    return createResultError(op, "Historical IMAP discovery returned malformed data; checkpoint retained")
  for (const entry of globalMessages) {
    if (!isRecord(entry))
      return createResultError(op, "Historical IMAP discovery returned malformed data; checkpoint retained")
    const uid: unknown = entry["uid"]
    const uidValidity: unknown = entry["uidValidity"]
    const eventTitle: unknown = entry["eventTitle"]
    const runId: unknown = entry["runId"]
    if (typeof uid !== "number" || !Number.isInteger(uid) || uid <= 0)
      return createResultError(op, "Historical IMAP discovery returned malformed UID; checkpoint retained")
    if (typeof uidValidity !== "string" || uidValidity.length === 0)
      return createResultError(op, "Historical IMAP discovery returned malformed UIDVALIDITY; checkpoint retained")
    if (typeof eventTitle !== "string" || typeof runId !== "string" || eventTitle.length === 0 || runId.length === 0)
      return createResultError(op, "Historical IMAP discovery returned malformed data; checkpoint retained")
    pushDiscovered({ uid, uidValidity, eventTitle, runId })
  }

  if (ticketCandidates.length === 0 && discovered.length === 0) return createResult({ status: "no-fixture" as const })

  if (input.ledgerAppend) {
    const persisted = await input.ledgerAppend({ historicalMailDiscovered: discovered })
    if (!persisted.success)
      return createResultError(op, "Historical IMAP ledger unavailable; no message deletion attempted")
  }

  let verifiedDeleted = 0
  let verifiedAbsent = 0
  for (const message of discovered) {
    const removed = await (input.remove ?? ticketE2eImapConfirmationDelete)({
      ...mail,
      uid: message.uid,
      uidValidity: message.uidValidity,
      eventTitle: message.eventTitle,
      since: 0,
      linkOrigin: input.baseUrl,
    })
    if (removed.success !== true)
      return createResultError(
        op,
        `Historical IMAP UID ${message.uid} (${message.eventTitle}) unresolved; checkpoint retained`,
      )
    const removedData: unknown = removed.data
    if (!isRecord(removedData))
      return createResultError(
        op,
        `Historical IMAP UID ${message.uid} (${message.eventTitle}) unresolved; checkpoint retained`,
      )
    const status: unknown = removedData["status"]
    if (status === "verified-absent") verifiedAbsent += 1
    else if (status === "verified-deleted") verifiedDeleted += 1
    else
      return createResultError(
        op,
        `Historical IMAP UID ${message.uid} (${message.eventTitle}) unresolved; checkpoint retained`,
      )
  }

  return createResult({
    status: "imap-historical-reconciled" as const,
    verifiedDeleted,
    verifiedAbsent,
    retainedOutsideOwnership:
      "Messages without the exact historical event title, capability link and PDF attachment are outside the E2E ownership classification and are retained by design",
  })
}

function ticketE2eImapRunIdExtract(eventKey: string): string | null {
  const prefix = "ticket-e2e-"
  if (!eventKey.startsWith(prefix)) return null
  const runId = eventKey.slice(prefix.length)
  if (!/^[0-9a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(runId)) return null
  return runId
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

async function ticketE2eImapHistoricalSearch(input: {
  candidate: HistoricalCandidate
  eventTitle: string
  mail: { host: string; port: number; user: string; password: string }
  baseUrl: string
}): Promise<ImapSearchResult> {
  const op = "ticketE2eImapHistoricalCleanupScan"
  const maxDiscoveredUids = 1000
  const fetchBatchSize = 50
  const client = new ImapFlow({
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
      if (mailbox === false || !mailbox) return { success: true, data: [] }
      const uidValidityRaw: unknown = mailbox.uidValidity
      if (uidValidityRaw === undefined || uidValidityRaw === null) return { success: true, data: [] }
      const uidValidity = String(uidValidityRaw)
      if (uidValidity.length === 0) return { success: true, data: [] }
      const rawUids: unknown = await client.search({ subject: input.eventTitle }, { uid: true })
      if (!Array.isArray(rawUids)) return { success: true, data: [] }
      if (rawUids.length === 0) return { success: true, data: [] }
      const uids = rawUids.filter((uid): uid is number => typeof uid === "number" && Number.isInteger(uid) && uid > 0)
      if (uids.length === 0) return { success: true, data: [] }
      if (uids.length > maxDiscoveredUids)
        return createResultError(op, "Historical IMAP discovery exceeds the bounded limit; checkpoint retained")
      const found: { uid: number; uidValidity: string }[] = []
      for (let offset = 0; offset < uids.length; offset += fetchBatchSize) {
        const batch = uids.slice(offset, offset + fetchBatchSize)
        const messages = await client.fetchAll(
          batch.join(","),
          { envelope: true, source: { maxLength: 1_000_000 } },
          { uid: true },
        )
        for (const message of messages) {
          if (!(message.envelope?.subject ?? "").includes(input.eventTitle)) continue
          const parsed = await ticketE2eMessageParse({
            source: message.source ?? Buffer.alloc(0),
            purchaseMarker: input.eventTitle,
            linkOrigin: new URL(input.baseUrl).origin,
          })
          if (!parsed) continue
          if (typeof message.uid !== "number" || !Number.isInteger(message.uid) || message.uid <= 0) continue
          found.push({ uid: message.uid, uidValidity })
        }
      }
      return { success: true, data: found }
    } finally {
      lock.release()
    }
  } catch {
    return createResultError(op, "Historical IMAP discovery unavailable; checkpoint retained")
  } finally {
    client.close()
  }
}
