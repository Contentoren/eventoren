import { expect, test } from "@rstest/core"
import { e2eHistoricalCleanupScan } from "./e2eHistoricalCleanupScan.ts"

test("requires staleAfterMs 0 so current and recent fixtures stay in scope", async () => {
  const result = await e2eHistoricalCleanupScan({
    staleAfterMs: 24 * 60 * 60_000,
    eventPage: async () => ({ success: true as const, data: { isDone: true, cleaned: [], skipped: [] } }),
  })
  expect(result.success).toBe(false)
})

test("drains event and orphan-order pages until isDone with full legacy coverage", async () => {
  const seen: { cursor: string | null; staleAfterMs: number }[] = []
  const result = await e2eHistoricalCleanupScan({
    staleAfterMs: 0,
    eventPage: async (args) => {
      seen.push(args)
      if (args.cursor === null)
        return {
          success: true as const,
          data: {
            isDone: false,
            continueCursor: "cursor-1",
            scannedEvents: 100,
            cleaned: [{ eventKey: "ticket-e2e-mcur-12345678-1234-1234-1234-123456789abc" }],
            skipped: [],
          },
        }
      return {
        success: true as const,
        data: {
          isDone: true,
          continueCursor: null,
          scannedEvents: 3,
          cleaned: [
            { eventKey: "native-auth-12345678-1234-1234-1234-123456789abc", kind: "native-auth" },
            { eventKey: "readiness-technical-draft-20260914", kind: "readiness" },
            { eventKey: "technischer-checkout-test-keine-veranstaltung-e879ab05", kind: "technical-checkout" },
          ],
          skipped: [],
        },
      }
    },
    orphanPage: async (args) => {
      seen.push(args)
      if (args.cursor === null)
        return {
          success: true as const,
          data: { isDone: false, continueCursor: "orphan-1", scannedOrders: 100, orphanOrdersDeleted: 2 },
        }
      return {
        success: true as const,
        data: { isDone: true, continueCursor: null, scannedOrders: 5, orphanOrdersDeleted: 1, orphanTicketsDeleted: 1 },
      }
    },
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  expect(seen.every((entry) => entry.staleAfterMs === 0)).toBe(true)
  expect(result.data).toMatchObject({
    eventPages: 2,
    orphanPages: 2,
    scannedEvents: 103,
    scannedOrders: 105,
    orphanOrdersDeleted: 3,
    orphanTicketsDeleted: 1,
  })
  expect(result.data.cleaned).toHaveLength(4)
})

test("fails on a stalled cursor instead of claiming truncated success", async () => {
  const result = await e2eHistoricalCleanupScan({
    staleAfterMs: 0,
    eventPage: async () => ({ success: true as const, data: { isDone: false, continueCursor: null, cleaned: [] } }),
  })
  expect(result.success).toBe(false)
})

test("fails on skipped identifiable candidates while reporting generic titles as retained", async () => {
  const skippedKey = "ticket-e2e-mold-12345678-1234-1234-1234-123456789abc"
  const failed = await e2eHistoricalCleanupScan({
    staleAfterMs: 0,
    eventPage: async () => ({
      success: true as const,
      data: {
        isDone: true,
        scannedEvents: 1,
        cleaned: [],
        skipped: [{ eventKey: skippedKey, reason: "prove failed" }],
      },
    }),
  })
  expect(failed.success).toBe(false)
  if (failed.success) throw new Error("expected failure")
  expect(failed.errorMessage).toMatch(skippedKey)

  const retained = await e2eHistoricalCleanupScan({
    staleAfterMs: 0,
    eventPage: async () => ({
      success: true as const,
      data: { isDone: true, scannedEvents: 1, cleaned: [], skipped: [] },
    }),
  })
  expect(retained.success).toBe(true)
  if (!retained.success) throw new Error("expected success")
  expect(retained.data.retainedOutsideOwnership).toMatch(/generic test title alone/)
})

test("fails closed when a mocked page result reports failure", async () => {
  const eventFailed = await e2eHistoricalCleanupScan({
    staleAfterMs: 0,
    eventPage: async () => ({ success: false as const, errorMessage: "event page unavailable" }),
  })
  expect(eventFailed.success).toBe(false)
  if (eventFailed.success) throw new Error("expected failure")
  expect(eventFailed.errorMessage).toMatch(/event page unavailable/)

  const orphanFailed = await e2eHistoricalCleanupScan({
    staleAfterMs: 0,
    eventPage: async () => ({ success: true as const, data: { isDone: true, cleaned: [], skipped: [] } }),
    orphanPage: async () => ({ success: false as const, errorMessage: "orphan page unavailable" }),
  })
  expect(orphanFailed.success).toBe(false)
  if (orphanFailed.success) throw new Error("expected failure")
  expect(orphanFailed.errorMessage).toMatch(/orphan page unavailable/)
})

test("fails closed on unknown server data instead of trusting markers or counts", async () => {
  for (const data of [
    42,
    "historical",
    { cleaned: "oops", isDone: true },
    { cleaned: [{ runId: "missing-event-key" }], isDone: true },
    { cleaned: [], skipped: [{ reason: "missing-event-key" }], isDone: true },
    { cleaned: [], skipped: [], scannedEvents: Number.NaN, isDone: true },
    { cleaned: [], skipped: [], scannedEvents: Number.POSITIVE_INFINITY, isDone: true },
  ]) {
    const result = await e2eHistoricalCleanupScan({
      staleAfterMs: 0,
      eventPage: async () => ({ success: true as const, data: data as unknown as Record<string, unknown> }),
    })
    expect(result.success).toBe(false)
  }
})

test("fails closed on malformed orphan counts while retaining the phase", async () => {
  for (const data of [
    { isDone: true, scannedOrders: "many" },
    { isDone: true, scannedOrders: 1, orphanOrdersDeleted: Number.NaN },
    { isDone: true, scannedOrders: 1, orphanTicketsDeleted: Number.NEGATIVE_INFINITY },
  ]) {
    const result = await e2eHistoricalCleanupScan({
      staleAfterMs: 0,
      eventPage: async () => ({ success: true as const, data: { isDone: true, cleaned: [], skipped: [] } }),
      orphanPage: async () => ({ success: true as const, data: data as unknown as Record<string, unknown> }),
    })
    expect(result.success).toBe(false)
  }
})
