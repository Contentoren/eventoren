import { expect, test } from "@rstest/core"
import { ticketE2eMessageParse } from "./ticketE2eMessageParse.ts"

const marker = "ticket-e2e-unique-20260923-abc123"
const link = `https://eventoren.test/checkout#ticketAccess=${"a".repeat(48)}`
const attachmentBytes = Buffer.from("%PDF-1.7\nfixture-ticket-bytes\n", "utf8")

function messageSource(options: { bodyLink?: string; subjectMarker?: string; bodyMarker?: string } = {}): Buffer {
  const bodyLink = options.bodyLink ?? link
  const subjectMarker = options.subjectMarker ?? marker
  const bodyMarker = options.bodyMarker ?? marker
  return Buffer.from(
    [
      `From: tickets@example.test`,
      `To: buyer@example.test`,
      `Subject: Your tickets ${subjectMarker}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="ticket-boundary"`,
      ``,
      `--ticket-boundary`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      ``,
      `Purchase ${bodyMarker}: ${bodyLink}`,
      `--ticket-boundary`,
      `Content-Type: application/pdf; name="ticket.pdf"`,
      `Content-Disposition: attachment; filename="ticket.pdf"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      attachmentBytes.toString("base64"),
      `--ticket-boundary--`,
      ``,
    ].join("\r\n"),
  )
}

test("parses only the matching purchase email with its same-origin capability link and PDF bytes", async () => {
  const result = await ticketE2eMessageParse({
    source: messageSource(),
    purchaseMarker: marker,
    linkOrigin: "https://eventoren.test/",
  })

  expect(result?.subject).toContain(marker)
  expect(result?.link.toString()).toBe(link)
  expect(result?.attachments).toHaveLength(1)
  expect(result?.attachments[0]?.content).toEqual(attachmentBytes)
})

test("rejects a ticket email without the exact origin, capability route, marker, or a PDF attachment", async () => {
  const wrongOrigin = await ticketE2eMessageParse({
    source: messageSource({ bodyLink: link.replace("eventoren.test", "attacker.test") }),
    purchaseMarker: marker,
    linkOrigin: "https://eventoren.test",
  })
  const wrongPath = await ticketE2eMessageParse({
    source: messageSource({ bodyLink: link.replace("/checkout", "/other") }),
    purchaseMarker: marker,
    linkOrigin: "https://eventoren.test",
  })
  const wrongMarker = await ticketE2eMessageParse({
    source: messageSource({ bodyMarker: "another-purchase" }),
    purchaseMarker: marker,
    linkOrigin: "https://eventoren.test",
  })
  const noAttachment = await ticketE2eMessageParse({
    source: Buffer.from(`Subject: ${marker}\r\n\r\n${marker} ${link}`),
    purchaseMarker: marker,
    linkOrigin: "https://eventoren.test",
  })

  expect(wrongOrigin).toBeNull()
  expect(wrongPath).toBeNull()
  expect(wrongMarker).toBeNull()
  expect(noAttachment).toBeNull()
})
