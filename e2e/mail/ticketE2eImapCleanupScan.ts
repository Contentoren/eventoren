import { createResult, createResultError } from "#result"
import { e2eCheckpointLoad } from "../checkpoint/e2eCheckpointLoad.ts"
import type { E2eCheckpoint } from "../checkpoint/e2eCheckpointSchema.ts"
import { ticketE2eImapConfirmationDelete } from "./ticketE2eImapConfirmationDelete.ts"

/** Keep uncertain current-run mail for resume; stale and completed runs require exact UID evidence. */
export async function ticketE2eImapCleanupScan(input: {
  directory: string
  target: Pick<E2eCheckpoint, "target" | "baseUrl">
  now?: number
  mail?: { host: string; port: number; user: string; password: string }
  remove?: typeof ticketE2eImapConfirmationDelete
}) {
  const op = "ticketE2eImapCleanupScan"
  const stored = await e2eCheckpointLoad(input.directory, input.target)
  if (!stored.success) return stored
  const checkpoint = stored.data
  if (!checkpoint || checkpoint.phase !== "ticket-unreconciled" || !checkpoint.ticket)
    return createResult({ status: "no-fixture" as const })
  const ticket = checkpoint.ticket
  if (
    ticket.eventKey !== `ticket-e2e-${checkpoint.runId}` ||
    ticket.eventTitle !== `Ticket E2E ${checkpoint.runId}` ||
    ticket.participantName !== `E2E Participant ${checkpoint.runId}` ||
    (ticket.eventId && ticket.eventId !== ticket.eventKey)
  )
    return createResultError(op, "Checkpoint does not prove exact run ownership")
  const stale = (input.now ?? Date.now()) - checkpoint.createdAt >= 24 * 60 * 60_000
  const successful = ticket.step === "done" && ticket.status === "completed"
  if (!stale && !successful) return createResult({ status: "preserved-current-run" as const })
  if (!ticket.mailUid && ["ready", "event", "product", "publication"].includes(ticket.step))
    return createResult({ status: "no-mail-created" as const })
  if (!ticket.mailUid || !ticket.mailUidValidity)
    return createResultError(op, "Missing exact IMAP UID/UIDVALIDITY; reconcile delivery manually")
  if (
    !input.mail?.host ||
    !input.mail.user ||
    !input.mail.password ||
    !Number.isInteger(input.mail.port) ||
    input.mail.port < 1
  )
    return createResultError(op, "Missing explicit IMAP cleanup credentials; checkpoint retained")
  return (input.remove ?? ticketE2eImapConfirmationDelete)({
    ...input.mail,
    uid: ticket.mailUid,
    uidValidity: ticket.mailUidValidity,
    eventTitle: ticket.eventTitle,
    since: ticket.mailSince,
    linkOrigin: checkpoint.baseUrl,
    pdfSha256: ticket.pdfSha256,
    pdfFilename: ticket.pdfFilename,
  })
}
