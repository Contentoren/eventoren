import { expect, test } from "@rstest/core"
import type { ticketE2eImapConfirmationDelete } from "./ticketE2eImapConfirmationDelete.ts"
import { ticketE2eImapHistoricalDiscover } from "./ticketE2eImapHistoricalDiscovery.ts"
import { ticketE2eImapHistoricalVerify } from "./ticketE2eImapHistoricalVerify.ts"

const baseUrl = "https://eventoren.leonardomora.de"
const mail = { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" }
const runId = "mold-12345678-1234-1234-1234-123456789abc"
const eventTitle = `Ticket E2E ${runId}`
const capability = `https://eventoren.leonardomora.de/checkout#ticketAccess=${"c".repeat(48)}`
const pdfBytes = Buffer.from("%PDF-1.7\nfixture-ticket-bytes\n", "utf8")

function fixtureSource(title: string, link: string): Buffer {
  return Buffer.from(
    [
      `From: tickets@example.test`,
      `To: buyer@example.test`,
      `Subject: Your tickets ${title}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="ticket-boundary"`,
      ``,
      `--ticket-boundary`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      `Purchase ${title}: ${link}`,
      `--ticket-boundary`,
      `Content-Type: application/pdf; name="ticket.pdf"`,
      `Content-Disposition: attachment; filename="ticket.pdf"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      pdfBytes.toString("base64"),
      `--ticket-boundary--`,
      ``,
    ].join("\r\n"),
  )
}

function textOnlySource(subject: string, body: string): Buffer {
  return Buffer.from(`From: someone@example.test\r\nTo: buyer@example.test\r\nSubject: ${subject}\r\n\r\n${body}\r\n`)
}

test("fails verification while disposable confirmations remain, passes when absent", async () => {
  const residual = await ticketE2eImapHistoricalVerify({
    candidates: [{ eventKey: `ticket-e2e-${runId}`, runId, kind: "ticket-e2e" }],
    baseUrl,
    mail,
    search: async () => ({ success: true, data: [{ uid: 701, uidValidity: "42" }] }),
    discover: async () => ({ success: true, data: [] }),
  })
  expect(residual.success).toBe(false)
  if (residual.success) throw new Error("expected failure")
  expect(residual.errorMessage).toMatch(/UID 701/)

  const absent = await ticketE2eImapHistoricalVerify({
    candidates: [{ eventKey: `ticket-e2e-${runId}`, runId, kind: "ticket-e2e" }],
    baseUrl,
    mail,
    search: async () => ({ success: true, data: [] }),
    discover: async () => ({ success: true, data: [] }),
  })
  expect(absent).toMatchObject({ success: true, data: { status: "imap-historical-absent" } })
})

test("drains full bounded results without a 50-message silent cap", async () => {
  const uids = Array.from({ length: 75 }, (_, index) => ({ uid: 700 + index, uidValidity: "42" }))
  const removed: number[] = []
  const { ticketE2eImapHistoricalCleanupScan } = await import("./ticketE2eImapHistoricalCleanupScan.ts")
  const result = await ticketE2eImapHistoricalCleanupScan({
    candidates: [{ eventKey: `ticket-e2e-${runId}`, runId, kind: "ticket-e2e" }],
    baseUrl,
    mail,
    search: async () => ({ success: true, data: uids }),
    discover: async () => ({ success: true, data: [] }),
    remove: async (input: Parameters<typeof ticketE2eImapConfirmationDelete>[0]) => {
      removed.push(input.uid)
      return { success: true as const, data: { status: "verified-deleted" as const } }
    },
    ledgerAppend: async () => ({ success: true }),
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  expect(result.data).toMatchObject({ verifiedDeleted: 75 })
  expect(removed).toHaveLength(75)
})

test("returns no-fixture verification for catalog-only legacy kinds", async () => {
  const result = await ticketE2eImapHistoricalVerify({
    candidates: [{ eventKey: "readiness-technical-draft-20260914", kind: "readiness" }],
    baseUrl,
    mail,
    search: async () => {
      throw new Error("search must not run without ticket candidates")
    },
    discover: async () => ({ success: true, data: [] }),
  })
  expect(result).toMatchObject({ success: true, data: { status: "imap-historical-absent" } })
})

test("requires credentials when ticket candidates exist instead of claiming absence", async () => {
  const candidateMissing = await ticketE2eImapHistoricalVerify({
    candidates: [{ eventKey: `ticket-e2e-${runId}`, runId, kind: "ticket-e2e" }],
    baseUrl,
    search: async () => {
      throw new Error("search must not run without credentials")
    },
  })
  expect(candidateMissing.success).toBe(false)
  if (candidateMissing.success) throw new Error("test unexpected success")
  expect(candidateMissing.errorMessage).toMatch(/inventory unknown/)

  const emptyUnconfigured = await ticketE2eImapHistoricalVerify({ candidates: [], baseUrl })
  expect(emptyUnconfigured).toMatchObject({ success: true, data: { status: "imap-historical-absent" } })

  const partialMail = await ticketE2eImapHistoricalVerify({
    candidates: [],
    baseUrl,
    mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "" },
    discover: async () => {
      throw new Error("discover must not run with invalid credentials")
    },
  })
  expect(partialMail.success).toBe(false)
  if (partialMail.success) throw new Error("test unexpected success")
  expect(partialMail.errorMessage).toMatch(/inventory unknown/)
})

test("fails while a global fixture lingers with empty candidates and passes for genuine mail only", async () => {
  const lingering = await ticketE2eImapHistoricalVerify({
    candidates: [],
    baseUrl,
    mail,
    discover: async ({ mail: discoverMail, baseUrl: discoverBase }) =>
      ticketE2eImapHistoricalDiscover({
        mail: discoverMail,
        baseUrl: discoverBase,
        client: {
          connect: async () => {},
          close: () => {},
          getMailboxLock: async () => ({ release: () => {} }),
          mailbox: { uidValidity: 42n },
          search: async () => [901, 902, 903, 904, 905],
          fetchAll: async (range: string) => {
            const wanted = range.split(",").map(Number)
            return wanted.map((uid) => {
              if (uid === 901)
                return {
                  uid,
                  envelope: { subject: `Your tickets ${eventTitle}` },
                  source: fixtureSource(eventTitle, capability),
                }
              if (uid === 902)
                return {
                  uid,
                  envelope: { subject: "Ticket E2E generic test" },
                  source: textOnlySource("Ticket E2E generic test", `Ticket E2E generic test ${capability}`),
                }
              if (uid === 903)
                return {
                  uid,
                  envelope: { subject: `Re: Your tickets ${eventTitle}` },
                  source: textOnlySource(`Re: Your tickets ${eventTitle}`, "thanks, see you there"),
                }
              if (uid === 904)
                return {
                  uid,
                  envelope: { subject: `Your tickets ${eventTitle}` },
                  source: fixtureSource(eventTitle, capability.replace("eventoren.leonardomora.de", "attacker.test")),
                }
              return {
                uid,
                envelope: { subject: `Your tickets ${eventTitle}` },
                source: textOnlySource(`Your tickets ${eventTitle}`, `${eventTitle} ${capability}`),
              }
            })
          },
        } as unknown as Parameters<typeof ticketE2eImapHistoricalDiscover>[0]["client"],
      }),
  })
  expect(lingering.success).toBe(false)
  if (lingering.success) throw new Error("expected failure")
  expect(lingering.errorMessage).toMatch(/UID 901/)
  expect(lingering.errorMessage).not.toMatch(/UID 902/)
  expect(lingering.errorMessage).not.toMatch(/UID 903/)
  expect(lingering.errorMessage).not.toMatch(/UID 904/)
  expect(lingering.errorMessage).not.toMatch(/UID 905/)

  const genuineOnly = await ticketE2eImapHistoricalVerify({
    candidates: [],
    baseUrl,
    mail,
    discover: async ({ mail: discoverMail, baseUrl: discoverBase }) =>
      ticketE2eImapHistoricalDiscover({
        mail: discoverMail,
        baseUrl: discoverBase,
        client: {
          connect: async () => {},
          close: () => {},
          getMailboxLock: async () => ({ release: () => {} }),
          mailbox: { uidValidity: 42n },
          search: async () => [902, 903],
          fetchAll: async (range: string) => {
            const wanted = range.split(",").map(Number)
            return wanted.map((uid) =>
              uid === 902
                ? {
                    uid,
                    envelope: { subject: "Ticket E2E generic test" },
                    source: textOnlySource("Ticket E2E generic test", `Ticket E2E generic test ${capability}`),
                  }
                : {
                    uid,
                    envelope: { subject: `Re: Your tickets ${eventTitle}` },
                    source: textOnlySource(`Re: Your tickets ${eventTitle}`, "thanks, see you there"),
                  },
            )
          },
        } as unknown as Parameters<typeof ticketE2eImapHistoricalDiscover>[0]["client"],
      }),
  })
  expect(genuineOnly).toMatchObject({ success: true, data: { status: "imap-historical-absent" } })
})
