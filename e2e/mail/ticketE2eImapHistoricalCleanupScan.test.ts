import { expect, test } from "@rstest/core"
import { ticketE2eImapHistoricalCleanupScan } from "./ticketE2eImapHistoricalCleanupScan.ts"
import { ticketE2eImapHistoricalDiscover } from "./ticketE2eImapHistoricalDiscovery.ts"
import type { ticketE2eImapConfirmationDelete } from "./ticketE2eImapConfirmationDelete.ts"

const baseUrl = "https://eventoren.leonardomora.de"
const mail = { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" }
const runId = "mold-12345678-1234-1234-1234-123456789abc"
const eventTitle = `Ticket E2E ${runId}`
const capability = `https://eventoren.leonardomora.de/checkout#ticketAccess=${"b".repeat(48)}`
const pdfBytes = Buffer.from("%PDF-1.7\nfixture-ticket-bytes\n", "utf8")

function deleteMock(
  onCall: (
    input: Parameters<typeof ticketE2eImapConfirmationDelete>[0],
  ) => Promise<ReturnType<typeof ticketE2eImapConfirmationDelete> extends Promise<infer T> ? T : never>,
): typeof ticketE2eImapConfirmationDelete {
  return onCall as typeof ticketE2eImapConfirmationDelete
}

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

test("deletes only exact owned historical confirmations and reports the rest as retained", async () => {
  const removed: number[] = []
  const ledgers: unknown[] = []
  const result = await ticketE2eImapHistoricalCleanupScan({
    candidates: [{ eventKey: `ticket-e2e-${runId}`, runId, kind: "ticket-e2e" }],
    baseUrl,
    mail,
    search: async () => ({
      success: true as const,
      data: [
        { uid: 701, uidValidity: "42" },
        { uid: 702, uidValidity: "42" },
      ],
    }),
    discover: async () => ({ success: true as const, data: [] }),
    remove: deleteMock(async (input) => {
      removed.push(input.uid)
      if (input.uid === 702) return { success: true, data: { status: "verified-absent" as const } }
      return { success: true, data: { status: "verified-deleted" as const } }
    }),
    ledgerAppend: async (entry) => {
      ledgers.push(entry)
      return { success: true }
    },
  })
  if (!result.success) throw new Error(`expected success: ${result.errorMessage}`)
  if (result.data.status !== "imap-historical-reconciled") throw new Error("expected reconciled")
  expect(result.data).toMatchObject({ verifiedDeleted: 1, verifiedAbsent: 1 })
  expect(removed).toEqual([701, 702])
  expect(ledgers).toHaveLength(1)
  expect(result.data.retainedOutsideOwnership).toMatch(/outside the E2E/)
})

test("persists discovered UIDs before deletion and retains evidence when the ledger is unavailable", async () => {
  let removed = 0
  const result = await ticketE2eImapHistoricalCleanupScan({
    candidates: [{ eventKey: `ticket-e2e-${runId}`, runId, kind: "ticket-e2e" }],
    baseUrl,
    mail,
    search: async () => ({ success: true as const, data: [{ uid: 701, uidValidity: "42" }] }),
    discover: async () => ({ success: true as const, data: [] }),
    remove: deleteMock(async () => {
      removed++
      return { success: true, data: { status: "verified-deleted" as const } }
    }),
    ledgerAppend: async () => ({ success: false, errorMessage: "ledger unavailable" }),
  })
  expect(result.success).toBe(false)
  expect(removed).toBe(0)
})

test("returns no-fixture for catalog-only legacy kinds and fails closed without mail credentials", async () => {
  const nothing = await ticketE2eImapHistoricalCleanupScan({
    candidates: [{ eventKey: "readiness-technical-draft-20260914", kind: "readiness" }],
    baseUrl,
    mail,
    search: async () => ({ success: true as const, data: [] }),
    discover: async () => ({ success: true as const, data: [] }),
  })
  expect(nothing).toMatchObject({ success: true, data: { status: "no-fixture" } })

  let searched = false
  const missing = await ticketE2eImapHistoricalCleanupScan({
    candidates: [{ eventKey: `ticket-e2e-${runId}`, runId, kind: "ticket-e2e" }],
    baseUrl,
    search: async () => {
      searched = true
      return { success: true as const, data: [] }
    },
  })
  expect(missing.success).toBe(false)
  if (missing.success) throw new Error("test unexpected success")
  expect(missing.errorMessage).toMatch(/inventory unknown/)
  expect(searched).toBe(false)

  const missingEmpty = await ticketE2eImapHistoricalCleanupScan({ candidates: [], baseUrl })
  expect(missingEmpty).toMatchObject({ success: true, data: { status: "no-fixture" } })

  const partialMail = await ticketE2eImapHistoricalCleanupScan({
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

test("fails closed when the mocked search result reports failure and deletes nothing", async () => {
  let removed = 0
  const result = await ticketE2eImapHistoricalCleanupScan({
    candidates: [{ eventKey: `ticket-e2e-${runId}`, runId, kind: "ticket-e2e" }],
    baseUrl,
    mail,
    search: async () => ({ success: false as const, errorMessage: "search unavailable" }),
    discover: async () => ({ success: true as const, data: [] }),
    remove: deleteMock(async () => {
      removed++
      return { success: true, data: { status: "verified-deleted" as const } }
    }),
  })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("expected failure")
  expect(result.errorMessage).toMatch(/search unavailable/)
  expect(removed).toBe(0)
})

test("fails closed on false-like or malformed UIDs instead of slicing them", async () => {
  for (const malformed of [
    [{ uid: 0, uidValidity: "42" }],
    [{ uid: Number.NaN, uidValidity: "42" }],
    [{ uid: 701, uidValidity: "" }],
  ]) {
    let removed = 0
    const result = await ticketE2eImapHistoricalCleanupScan({
      candidates: [{ eventKey: `ticket-e2e-${runId}`, runId, kind: "ticket-e2e" }],
      baseUrl,
      mail,
      search: async () => ({ success: true as const, data: malformed }),
      discover: async () => ({ success: true as const, data: [] }),
      remove: deleteMock(async () => {
        removed++
        return { success: true, data: { status: "verified-deleted" as const } }
      }),
    })
    expect(result.success).toBe(false)
    expect(removed).toBe(0)
  }
})

test("fails closed when the delete result is a failure or an unknown shape", async () => {
  const failing = await ticketE2eImapHistoricalCleanupScan({
    candidates: [{ eventKey: `ticket-e2e-${runId}`, runId, kind: "ticket-e2e" }],
    baseUrl,
    mail,
    search: async () => ({ success: true as const, data: [{ uid: 701, uidValidity: "42" }] }),
    discover: async () => ({ success: true as const, data: [] }),
    remove: deleteMock(async () => ({
      success: false as const,
      op: "ticketE2eImapConfirmationDelete",
      errorMessage: "EXPUNGE unverified",
    })),
  })
  expect(failing.success).toBe(false)

  const malformed = await ticketE2eImapHistoricalCleanupScan({
    candidates: [{ eventKey: `ticket-e2e-${runId}`, runId, kind: "ticket-e2e" }],
    baseUrl,
    mail,
    search: async () => ({ success: true as const, data: [{ uid: 701, uidValidity: "42" }] }),
    discover: async () => ({ success: true as const, data: [] }),
    remove: deleteMock(
      async () =>
        ({ success: true, data: { status: "unknown" } }) as unknown as {
          success: true
          data: { status: "verified-deleted" }
        },
    ),
  })
  expect(malformed.success).toBe(false)
})

test("discovers a global fixture with empty candidates and deletes only it via exact UID", async () => {
  const removed: number[] = []
  const seenTitles: string[] = []
  const result = await ticketE2eImapHistoricalCleanupScan({
    candidates: [],
    baseUrl,
    mail,
    discover: async ({ mail: discoverMail, baseUrl: discoverBase }) => {
      const fake = {
        connect: async () => {},
        close: () => {},
        getMailboxLock: async () => ({ release: () => {} }),
        mailbox: { uidValidity: 42n },
        search: async () => [801, 802],
        fetchAll: async (range: string) => {
          const wanted = range.split(",").map(Number)
          return wanted.map((uid) =>
            uid === 801
              ? {
                  uid,
                  envelope: { subject: `Your tickets ${eventTitle}` },
                  source: fixtureSource(eventTitle, capability),
                }
              : {
                  uid,
                  envelope: { subject: "Pilates class confirmation" },
                  source: textOnlySource("Pilates class confirmation", "genuine class booking"),
                },
          )
        },
      }
      return ticketE2eImapHistoricalDiscover({
        mail: discoverMail,
        baseUrl: discoverBase,
        client: fake as unknown as Parameters<typeof ticketE2eImapHistoricalDiscover>[0]["client"],
      })
    },
    remove: deleteMock(async (input) => {
      removed.push(input.uid)
      seenTitles.push(input.eventTitle)
      expect(input.uidValidity).toBe("42")
      return { success: true, data: { status: "verified-deleted" as const } }
    }),
    ledgerAppend: async () => ({ success: true }),
  })
  if (!result.success) throw new Error(`expected success: ${result.errorMessage}`)
  expect(result.data).toMatchObject({ status: "imap-historical-reconciled", verifiedDeleted: 1, verifiedAbsent: 0 })
  expect(removed).toEqual([801])
  expect(seenTitles).toEqual([eventTitle])
})

test("pages 100+ UIDs in bounded UID ranges and retains everything when a page fails", async () => {
  const uids = Array.from({ length: 120 }, (_, index) => 900 + index)
  const fetchRanges: string[] = []
  const failingBatch = 2
  let batchCount = 0
  const failingClient = {
    connect: async () => {},
    close: () => {},
    getMailboxLock: async () => ({ release: () => {} }),
    mailbox: { uidValidity: 42n },
    search: async () => [...uids],
    fetchAll: async (range: string) => {
      fetchRanges.push(range)
      batchCount += 1
      if (batchCount === failingBatch) throw new Error("fetch unavailable")
      const wanted = range.split(",").map(Number)
      return wanted.map((uid) => ({
        uid,
        envelope: { subject: "Pilates class confirmation" },
        source: textOnlySource("Pilates class confirmation", "genuine booking"),
      }))
    },
  }
  let removed = 0
  const failed = await ticketE2eImapHistoricalCleanupScan({
    candidates: [],
    baseUrl,
    mail,
    search: async () => ({ success: true as const, data: [] }),
    discover: async ({ mail: discoverMail, baseUrl: discoverBase }) =>
      ticketE2eImapHistoricalDiscover({
        mail: discoverMail,
        baseUrl: discoverBase,
        client: failingClient as unknown as Parameters<typeof ticketE2eImapHistoricalDiscover>[0]["client"],
      }),
    remove: deleteMock(async () => {
      removed += 1
      return { success: true, data: { status: "verified-deleted" as const } }
    }),
  })
  expect(failed.success).toBe(false)
  if (failed.success) throw new Error("test unexpected success")
  expect(failed.errorMessage).toMatch(/checkpoint retained/)
  expect(removed).toBe(0)
  expect(fetchRanges.length).toBeGreaterThan(0)
  for (const range of fetchRanges) expect(range.split(",").length).toBeLessThanOrEqual(50)

  const workingRanges: string[] = []
  const workingClient = {
    connect: async () => {},
    close: () => {},
    getMailboxLock: async () => ({ release: () => {} }),
    mailbox: { uidValidity: 42n },
    search: async () => [...uids],
    fetchAll: async (range: string) => {
      workingRanges.push(range)
      const wanted = range.split(",").map(Number)
      return wanted.map((uid, position) => {
        const globalIndex = uids.indexOf(uid)
        if (globalIndex === 10 || globalIndex === 70) {
          const fixtureRun = `bulk${globalIndex}56-12345678-1234-1234-1234-123456789abc`
          const title = `Ticket E2E ${fixtureRun}`
          return { uid, envelope: { subject: `Your tickets ${title}` }, source: fixtureSource(title, capability) }
        }
        void position
        return {
          uid,
          envelope: { subject: "Pilates class confirmation" },
          source: textOnlySource("Pilates class confirmation", "genuine booking"),
        }
      })
    },
  }
  const removedWorking: number[] = []
  const worked = await ticketE2eImapHistoricalCleanupScan({
    candidates: [],
    baseUrl,
    mail,
    search: async () => ({ success: true as const, data: [] }),
    discover: async ({ mail: discoverMail, baseUrl: discoverBase }) =>
      ticketE2eImapHistoricalDiscover({
        mail: discoverMail,
        baseUrl: discoverBase,
        client: workingClient as unknown as Parameters<typeof ticketE2eImapHistoricalDiscover>[0]["client"],
      }),
    remove: deleteMock(async (input) => {
      removedWorking.push(input.uid)
      return { success: true, data: { status: "verified-deleted" as const } }
    }),
    ledgerAppend: async () => ({ success: true }),
  })
  if (!worked.success) throw new Error(`expected success: ${worked.errorMessage}`)
  expect(worked.data).toMatchObject({ verifiedDeleted: 2 })
  expect(removedWorking).toEqual([uids[10], uids[70]])
  expect(workingRanges.length).toBe(3)
  for (const range of workingRanges) expect(range.split(",").length).toBeLessThanOrEqual(50)
  const visited = new Set(workingRanges.flatMap((range) => range.split(",").map(Number)))
  expect(visited.size).toBe(120)
})
