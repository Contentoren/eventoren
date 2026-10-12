import { expect, test } from "@rstest/core"
import { e2eSnapshotDiscoveryScan } from "./e2eSnapshotDiscoveryScan.ts"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

test("drains snapshot discovery pages into deduplicated version candidates", async () => {
  const result = await e2eSnapshotDiscoveryScan({
    snapshotPage: async (args) => {
      if (args.cursor === null)
        return {
          success: true as const,
          data: {
            isDone: false,
            continueCursor: "snapshot-cursor-1",
            scannedSnapshots: 20,
            activeVersion: 9,
            candidates: [{ version: 7, kind: "ticket-e2e", eventKey: "ticket-e2e-old", chunkCount: 2 }],
          },
        }
      return {
        success: true as const,
        data: {
          isDone: true,
          continueCursor: null,
          scannedSnapshots: 5,
          activeVersion: 9,
          candidates: [
            { version: 7, kind: "ticket-e2e", eventKey: "ticket-e2e-old", chunkCount: 2 },
            {
              version: 8,
              kind: "native-auth",
              eventKey: "native-auth-12345678-1234-1234-1234-123456789abc",
              chunkCount: 1,
            },
          ],
        },
      }
    },
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  const data: unknown = result.data
  if (!isRecord(data)) throw new Error("expected data")
  expect(data).toMatchObject({ snapshotPages: 2, scannedSnapshots: 25, activeVersion: 9 })
  const candidates: unknown = data["candidates"]
  if (!Array.isArray(candidates)) throw new Error("expected candidates")
  expect(candidates).toHaveLength(2)
})

test("fails on a stalled snapshot cursor instead of claiming truncated success", async () => {
  const result = await e2eSnapshotDiscoveryScan({
    snapshotPage: async () => ({
      success: true as const,
      data: { isDone: false, continueCursor: null, scannedSnapshots: 1, activeVersion: 9, candidates: [] },
    }),
  })
  expect(result.success).toBe(false)
})

test("fails closed on unknown snapshot candidate data instead of trusting versions", async () => {
  for (const data of [
    { isDone: true, scannedSnapshots: 1, activeVersion: 9 },
    { isDone: true, scannedSnapshots: 1, activeVersion: 9, candidates: [{ version: 7 }] },
    {
      isDone: true,
      scannedSnapshots: 1,
      activeVersion: 9,
      candidates: [{ version: 7, kind: "generic-e2e", eventKey: "test", chunkCount: 1 }],
    },
    {
      isDone: true,
      scannedSnapshots: 1,
      activeVersion: 9,
      candidates: [{ version: "7", kind: "ticket-e2e", eventKey: "ticket-e2e-old", chunkCount: 1 }],
    },
  ]) {
    const result = await e2eSnapshotDiscoveryScan({
      snapshotPage: async () => ({ success: true as const, data: data as unknown as Record<string, unknown> }),
    })
    expect(result.success).toBe(false)
  }
})

test("fails when the scheduler version moves mid-discovery instead of mixing inventories", async () => {
  const result = await e2eSnapshotDiscoveryScan({
    snapshotPage: async (args) => {
      if (args.cursor === null)
        return {
          success: true as const,
          data: { isDone: false, continueCursor: "cursor-1", scannedSnapshots: 1, activeVersion: 9, candidates: [] },
        }
      return {
        success: true as const,
        data: { isDone: true, continueCursor: null, scannedSnapshots: 1, activeVersion: 10, candidates: [] },
      }
    },
  })
  expect(result.success).toBe(false)
})
