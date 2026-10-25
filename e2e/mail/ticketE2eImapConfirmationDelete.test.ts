import { createHash } from "node:crypto"
import { expect, test } from "@rstest/core"
import { ticketE2eImapConfirmationDelete } from "./ticketE2eImapConfirmationDelete.ts"

const eventTitle = "Ticket E2E abc-12345678-1234-1234-1234-123456789abc"
const pdf = Buffer.from("%PDF-1.7\nowned", "utf8")
const source = Buffer.from(
  [
    "From: tickets@example.test",
    "To: buyer@example.test",
    `Subject: Tickets ${eventTitle}`,
    "MIME-Version: 1.0",
    'Content-Type: multipart/mixed; boundary="ticket"',
    "",
    "--ticket",
    "Content-Type: text/plain",
    "",
    `${eventTitle} https://eventoren.leonardomora.de/checkout#ticketAccess=${"a".repeat(48)}`,
    "--ticket",
    'Content-Type: application/pdf; name="ticket.pdf"',
    'Content-Disposition: attachment; filename="ticket.pdf"',
    "Content-Transfer-Encoding: base64",
    "",
    pdf.toString("base64"),
    "--ticket--",
    "",
  ].join("\r\n"),
)

function fixture(
  options: { uidValidity?: bigint; recipient?: string; source?: Buffer; uidplus?: boolean; deleteWorks?: boolean } = {},
) {
  let present = true
  let deletions = 0
  const client = {
    connect: async () => {},
    close: () => {},
    getMailboxLock: async () => ({ release: () => {} }),
    mailbox: { uidValidity: options.uidValidity ?? 42n },
    capabilities: new Map(options.uidplus === false ? [] : [["UIDPLUS", true]]),
    fetchOne: async () =>
      present
        ? {
            uid: 501,
            source: options.source ?? source,
            internalDate: new Date(1_010_000),
            envelope: { to: [{ address: options.recipient ?? "buyer@example.test" }] },
          }
        : false,
    messageDelete: async (range: string, opts: { uid: boolean }) => {
      expect(range).toBe("501")
      expect(opts).toEqual({ uid: true })
      deletions++
      if (options.deleteWorks !== false) present = false
      return options.deleteWorks !== false
    },
  }
  return {
    input: {
      host: "localhost",
      port: 993,
      user: "buyer@example.test",
      password: "unused",
      uid: 501,
      uidValidity: "42",
      eventTitle,
      since: 1_000_000,
      linkOrigin: "https://eventoren.leonardomora.de",
      pdfFilename: "ticket.pdf",
      pdfSha256: createHash("sha256").update(pdf).digest("hex"),
      client: client as unknown as NonNullable<Parameters<typeof ticketE2eImapConfirmationDelete>[0]["client"]>,
    },
    deletions: () => deletions,
  }
}

test("deletes only the exact UID with matching mailbox generation, recipient, run marker and PDF, then verifies absence", async () => {
  const run = fixture()
  expect(await ticketE2eImapConfirmationDelete(run.input)).toMatchObject({
    success: true,
    data: { status: "verified-deleted" },
  })
  expect(run.deletions()).toBe(1)
})

test("rejects reused UIDs and servers without safe UIDPLUS expunge without touching messages", async () => {
  for (const options of [
    { uidValidity: 43n },
    { uidplus: false },
    { recipient: "another@example.test" },
    { source: Buffer.from("Subject: unrelated\r\n\r\nunrelated") },
  ]) {
    const run = fixture(options)
    expect((await ticketE2eImapConfirmationDelete(run.input)).success).toBe(false)
    expect(run.deletions()).toBe(0)
  }
})

test("retains evidence when exact deletion fails and verifies already absent messages", async () => {
  const failed = fixture({ deleteWorks: false })
  expect((await ticketE2eImapConfirmationDelete(failed.input)).success).toBe(false)
  const missing = fixture()
  const client = missing.input.client as unknown as { fetchOne: () => Promise<false> }
  client.fetchOne = async () => false
  expect(await ticketE2eImapConfirmationDelete(missing.input)).toMatchObject({
    success: true,
    data: { status: "verified-absent" },
  })
  expect(missing.deletions()).toBe(0)
})
