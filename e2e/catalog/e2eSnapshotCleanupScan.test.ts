import { expect, test } from "@rstest/core"
import { e2eSnapshotCleanupScan } from "./e2eSnapshotCleanupScan.ts"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

test("drains snapshot cleanup pages until isDone with deleted and rebuilt versions", async () => {
  const seen: { cursor: string | null }[] = []
  const result = await e2eSnapshotCleanupScan({
    snapshotPage: async (args) => {
      seen.push(args)
      if (args.cursor === null)
        return {
          success: true as const,
          data: {
            isDone: false,
            continueCursor: "snapshot-cursor-1",
            scannedSnapshots: 20,
            activeVersion: 9,
            cleanedVersions: [
              { version: 7, kinds: ["ticket-e2e"], eventKeys: ["ticket-e2e-old"], chunkCount: 2, action: "deleted" },
            ],
            deletedChunks: 2,
            skippedVersions: [],
          },
        }
      return {
        success: true as const,
        data: {
          isDone: true,
          continueCursor: null,
          scannedSnapshots: 5,
          activeVersion: 9,
          cleanedVersions: [
            {
              version: 9,
              kinds: ["native-auth"],
              eventKeys: ["native-auth-12345678-1234-1234-1234-123456789abc"],
              chunkCount: 1,
              action: "rebuilt",
            },
          ],
          deletedChunks: 1,
          skippedVersions: [],
        },
      }
    },
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  const data: unknown = result.data
  if (!isRecord(data)) throw new Error("expected data")
  expect(seen).toHaveLength(2)
  expect(data).toMatchObject({ snapshotPages: 2, scannedSnapshots: 25, deletedChunks: 3, activeVersion: 9 })
  const cleanedVersions: unknown = data["cleanedVersions"]
  if (!Array.isArray(cleanedVersions)) throw new Error("expected cleanedVersions")
  expect(cleanedVersions).toHaveLength(2)
})

test("fails on skipped unproven versions while retaining them instead of deleting", async () => {
  const failed = await e2eSnapshotCleanupScan({
    snapshotPage: async () => ({
      success: true as const,
      data: {
        isDone: true,
        continueCursor: null,
        scannedSnapshots: 1,
        activeVersion: 9,
        cleanedVersions: [],
        deletedChunks: 0,
        skippedVersions: [{ version: 11, reason: "Snapshot payload could not be proven; retained" }],
      },
    }),
  })
  expect(failed.success).toBe(false)
  if (failed.success) throw new Error("expected failure")
  expect(failed.errorMessage).toMatch(/version 11/)
})

test("fails on a stalled snapshot cursor instead of claiming truncated success", async () => {
  const result = await e2eSnapshotCleanupScan({
    snapshotPage: async () => ({
      success: true as const,
      data: { isDone: false, continueCursor: null, scannedSnapshots: 1, activeVersion: 9, cleanedVersions: [] },
    }),
  })
  expect(result.success).toBe(false)
})

test("fails closed on unknown snapshot cleanup data instead of trusting versions", async () => {
  for (const data of [
    { isDone: true, scannedSnapshots: 1, activeVersion: 9, cleanedVersions: [{ version: 7 }] },
    {
      isDone: true,
      scannedSnapshots: 1,
      activeVersion: 9,
      cleanedVersions: [{ version: 7, kinds: ["generic"], eventKeys: ["x"], chunkCount: 1, action: "deleted" }],
    },
    {
      isDone: true,
      scannedSnapshots: 1,
      activeVersion: 9,
      cleanedVersions: [{ version: 7, kinds: ["ticket-e2e"], eventKeys: ["x"], chunkCount: 1, action: "archived" }],
    },
  ]) {
    const result = await e2eSnapshotCleanupScan({
      snapshotPage: async () => ({ success: true as const, data: data as unknown as Record<string, unknown> }),
    })
    expect(result.success).toBe(false)
  }
})
