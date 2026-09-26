import { createHash } from "node:crypto"
import { createResult, createResultError } from "#result"
import { ImapFlow } from "imapflow"
import { ticketE2eMessageParse } from "./ticketE2eMessageParse.ts"

type MailClient = Pick<
  ImapFlow,
  "connect" | "close" | "getMailboxLock" | "mailbox" | "capabilities" | "fetchOne" | "messageDelete"
>

/** Only UID EXPUNGE is safe: plain EXPUNGE can erase other users' already-deleted mail. */
export async function ticketE2eImapConfirmationDelete(input: {
  host: string
  port: number
  user: string
  password: string
  uid: number
  uidValidity: string
  eventTitle: string
  since: number
  linkOrigin: string
  pdfSha256?: string
  pdfFilename?: string
  client?: MailClient
}) {
  const op = "ticketE2eImapConfirmationDelete"
  const client =
    input.client ??
    new ImapFlow({
      host: input.host,
      port: input.port,
      secure: true,
      auth: { user: input.user, pass: input.password },
      logger: false,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    })
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const bounded = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        client.close()
        reject(new Error("IMAP cleanup timeout"))
      }, 45_000)
    })
    return await Promise.race([ticketE2eImapConfirmationDeleteOnce(client, input), bounded])
  } catch {
    // Do not leak IMAP replies, authentication or message contents.
    return createResultError(op, "IMAP confirmation deletion could not be verified; checkpoint retained")
  } finally {
    if (timeout) clearTimeout(timeout)
    client.close()
  }
}

async function ticketE2eImapConfirmationDeleteOnce(
  client: MailClient,
  input: Parameters<typeof ticketE2eImapConfirmationDelete>[0],
) {
  const op = "ticketE2eImapConfirmationDelete"
  await client.connect()
  const lock = await client.getMailboxLock("INBOX")
  try {
    const mailbox = client.mailbox
    if (!mailbox || mailbox.uidValidity.toString() !== input.uidValidity)
      return createResultError(op, "INBOX UIDVALIDITY changed; cannot identify the owned message")
    // Check this even when the message appears absent: we must never issue plain EXPUNGE.
    if (!client.capabilities.has("UIDPLUS"))
      return createResultError(op, "IMAP server lacks UIDPLUS; safe exact-UID expunge is unavailable")
    const fields = { envelope: true, internalDate: true, source: { maxLength: 1_000_000 } } as const
    const message = await client.fetchOne(input.uid, fields, { uid: true })
    if (!message) return createResult({ status: "verified-absent" as const })
    const recipients = message.envelope?.to ?? []
    const recipientMatches = recipients.some(
      (recipient) => recipient.address?.toLowerCase() === input.user.toLowerCase(),
    )
    const parsed = await ticketE2eMessageParse({
      source: message.source ?? Buffer.alloc(0),
      purchaseMarker: input.eventTitle,
      linkOrigin: input.linkOrigin,
    })
    if (
      message.uid !== input.uid ||
      !message.internalDate ||
      message.internalDate.getTime() < input.since - 5 * 60_000 ||
      !recipientMatches ||
      !parsed ||
      (input.pdfSha256 &&
        !parsed.attachments.some(
          (attachment) =>
            attachment.filename === input.pdfFilename &&
            createHash("sha256").update(attachment.content).digest("hex") === input.pdfSha256,
        ))
    )
      return createResultError(op, "UID does not prove the exact owned confirmation; no deletion attempted")
    if (!(await client.messageDelete(String(input.uid), { uid: true })))
      return createResultError(op, "Exact UID EXPUNGE failed; checkpoint retained")
    const remaining = await client.fetchOne(input.uid, fields, { uid: true })
    if (remaining) return createResultError(op, "Confirmation still exists after exact UID EXPUNGE")
    return createResult({ status: "verified-deleted" as const })
  } finally {
    lock.release()
  }
}
