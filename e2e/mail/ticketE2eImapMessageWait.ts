import { ImapFlow } from "imapflow"
import { ticketE2eMessageParse } from "./ticketE2eMessageParse.ts"

const imapClockSkewMs = 5 * 60_000
const imapLogoutTimeoutMs = 2_000

export async function ticketE2eImapMessageWait(input: {
  host: string
  port: number
  user: string
  password: string
  purchaseMarker: string
  since: Date
  timeoutMs: number
  pollMs: number
  linkOrigin: string
}): Promise<{
  subject: string
  link: URL
  attachments: { filename: string; contentType: string; content: Buffer }[]
}> {
  const deadline = Date.now() + input.timeoutMs
  const expectedOrigin = new URL(input.linkOrigin).origin

  while (Date.now() < deadline) {
    const remainingMs = deadline - Date.now()
    try {
      const message = await ticketE2eImapMessageFindOnce(input, expectedOrigin, remainingMs)
      if (message) return message
    } catch {
      // Retry without exposing mailbox details; the deadline bounds failures too.
    }
    const delayMs = Math.min(input.pollMs, Math.max(0, deadline - Date.now()))
    if (delayMs <= 0) break
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  throw new Error("Timed out waiting for the ticket email matching the purchase marker")
}

async function ticketE2eImapMessageFindOnce(
  input: {
    host: string
    port: number
    user: string
    password: string
    purchaseMarker: string
    since: Date
  },
  expectedOrigin: string,
  timeoutMs: number,
): Promise<{
  subject: string
  link: URL
  attachments: { filename: string; contentType: string; content: Buffer }[]
} | null> {
  const operationTimeoutMs = Math.max(1, timeoutMs)
  const client = new ImapFlow({
    host: input.host,
    port: input.port,
    secure: true,
    auth: { user: input.user, pass: input.password },
    logger: false,
    connectionTimeout: Math.min(15_000, operationTimeoutMs),
    greetingTimeout: Math.min(15_000, operationTimeoutMs),
    socketTimeout: Math.min(60_000, operationTimeoutMs),
  })
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    const bounded = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        client.close()
        reject(new Error("Bounded IMAP operation elapsed"))
      }, operationTimeoutMs)
    })
    return await Promise.race([ticketE2eImapMessageRead(client, input, expectedOrigin), bounded])
  } finally {
    if (timeout) clearTimeout(timeout)
    await ticketE2eImapClientClose(client)
  }
}

async function ticketE2eImapClientClose(client: ImapFlow): Promise<void> {
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      client.close()
      resolve()
    }, imapLogoutTimeoutMs)
    try {
      void client.logout().then(
        () => {
          clearTimeout(timeout)
          resolve()
        },
        () => {
          clearTimeout(timeout)
          resolve()
        },
      )
    } catch {
      clearTimeout(timeout)
      resolve()
    }
  })
  client.close()
}

async function ticketE2eImapMessageRead(
  client: ImapFlow,
  input: { host: string; port: number; user: string; password: string; purchaseMarker: string; since: Date },
  expectedOrigin: string,
): Promise<{
  subject: string
  link: URL
  attachments: { filename: string; contentType: string; content: Buffer }[]
} | null> {
  await client.connect()
  const lock = await client.getMailboxLock("INBOX")
  try {
    const mailbox = client.mailbox
    if (mailbox === false) return null
    const newestUid = Math.max(1, mailbox.uidNext - 1)
    const oldestUid = Math.max(1, newestUid - 99)
    const since = new Date(input.since.getTime() - imapClockSkewMs)
    const uids = await client.search({ uid: `${oldestUid}:${newestUid}`, since }, { uid: true })
    if (!uids || !uids.length) return null
    const envelopes = await client.fetchAll(uids.slice(-50), { envelope: true, internalDate: true }, { uid: true })
    const candidates = envelopes
      .filter((message) => !message.internalDate || message.internalDate >= since)
      .filter((message) => (message.envelope?.subject ?? "").includes(input.purchaseMarker))
      .map((message) => message.uid)
    if (!candidates.length) return null

    const messages = await client.fetchAll(
      candidates.join(","),
      { envelope: true, internalDate: true, source: { maxLength: 1_000_000 } },
      { uid: true },
    )
    for (const message of messages.reverse()) {
      if (message.internalDate && message.internalDate < since) continue
      const parsed = await ticketE2eMessageParse({
        source: message.source ?? Buffer.alloc(0),
        purchaseMarker: input.purchaseMarker,
        linkOrigin: expectedOrigin,
      })
      if (parsed) return parsed
    }
    return null
  } finally {
    lock.release()
  }
}
