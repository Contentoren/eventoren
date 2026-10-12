import { expect, test } from "@rstest/core"
import { e2eHistoricalDiscoveryScan } from "./e2eHistoricalDiscoveryScan.ts"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

test("drains event and orphan discovery pages into deduplicated candidates", async () => {
  const result = await e2eHistoricalDiscoveryScan({
    eventPage: async (args) => {
      if (args.cursor === null)
        return {
          success: true,
          data: {
            isDone: false,
            continueCursor: "cursor-1",
            scannedEvents: 100,
            candidates: [{ eventKey: "ticket-e2e-mcur-12345678-1234-1234-1234-123456789abc" }],
          },
        }
      return {
        success: true,
        data: {
          isDone: true,
          continueCursor: null,
          scannedEvents: 3,
          candidates: [
            { eventKey: "readiness-technical-draft-20260914", kind: "readiness" },
            { eventKey: "ticket-e2e-mcur-12345678-1234-1234-1234-123456789abc" },
          ],
        },
      }
    },
    orphanPage: async (args) => {
      if (args.cursor === null)
        return {
          success: true,
          data: { isDone: false, continueCursor: "orphan-1", scannedOrders: 100, candidates: [] },
        }
      return {
        success: true,
        data: {
          isDone: true,
          continueCursor: null,
          scannedOrders: 5,
          candidates: [{ eventKey: "ticket-e2e-mold-12345678-1234-1234-1234-123456789abc", kind: "ticket-e2e" }],
        },
      }
    },
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  const data: unknown = result.data
  if (!isRecord(data)) throw new Error("expected data")
  expect(data).toMatchObject({ eventPages: 2, orphanPages: 2, scannedEvents: 103, scannedOrders: 105 })
  const candidates: unknown = data["candidates"]
  if (!Array.isArray(candidates)) throw new Error("expected candidates")
  expect(candidates).toHaveLength(3)
})

test("fails on a stalled discovery cursor instead of claiming truncated success", async () => {
  const result = await e2eHistoricalDiscoveryScan({
    eventPage: async () => ({ success: true, data: { isDone: false, continueCursor: null, candidates: [] } }),
  })
  expect(result.success).toBe(false)
})
