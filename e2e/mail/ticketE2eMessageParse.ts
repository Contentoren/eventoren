import { simpleParser } from "mailparser"

const ticketCapabilityPattern = /^#ticketAccess=[A-Za-z0-9_-]{32,256}$/u

export async function ticketE2eMessageParse(input: {
  source: Buffer
  purchaseMarker: string
  linkOrigin: string
}): Promise<{
  subject: string
  link: URL
  attachments: { filename: string; contentType: string; content: Buffer }[]
} | null> {
  const parsed = await simpleParser(input.source)
  const subject = parsed.subject ?? ""
  if (!subject.includes(input.purchaseMarker)) return null
  const body = `${parsed.text ?? ""}\n${parsed.html ?? ""}`
  if (!body.includes(input.purchaseMarker)) return null
  const expectedOrigin = new URL(input.linkOrigin).origin
  const links = `${body}\n${input.source.toString("utf8")}`.match(/https?:\/\/[^\s"'<>]+/giu) ?? []
  let link: URL | undefined
  for (const value of links) {
    try {
      const candidate = new URL(value.replace(/&amp;/g, "&"))
      if (
        candidate.origin !== expectedOrigin ||
        candidate.pathname !== "/checkout" ||
        !ticketCapabilityPattern.test(candidate.hash)
      )
        continue
      link = candidate
      break
    } catch {
      // Ignore malformed and non-capability links.
    }
  }
  if (!link) return null
  const attachments = parsed.attachments
    .filter(
      (attachment) =>
        attachment.contentType === "application/pdf" || attachment.filename?.toLowerCase().endsWith(".pdf"),
    )
    .map((attachment) => ({
      filename: attachment.filename ?? "ticket.pdf",
      contentType: attachment.contentType,
      content: Buffer.from(attachment.content),
    }))
  if (!attachments.length) return null
  return { subject, link, attachments }
}
