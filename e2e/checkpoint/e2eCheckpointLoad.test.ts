import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "@rstest/core"
import { e2eCheckpointLoad } from "./e2eCheckpointLoad.ts"
import { e2eCheckpointSave } from "./e2eCheckpointSave.ts"
import { e2eCheckpointSsoClear } from "./e2eCheckpointSsoClear.ts"
import type { E2eCheckpoint } from "./e2eCheckpointSchema.ts"

const checkpoint: E2eCheckpoint = {
  version: 1,
  target: "development",
  baseUrl: "https://eventoren.leonardomora.de",
  runId: "abc-12345678-1234-1234-1234-123456789abc",
  createdAt: 1_000_000,
  phase: "sso",
}

describe("Eventoren target-bound checkpoint", () => {
  it("refuses to overwrite another run or load a different target", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-checkpoint-test-"))
    try {
      expect((await e2eCheckpointSave(directory, checkpoint)).success).toBe(true)
      expect(
        (await e2eCheckpointLoad(directory, { target: "production", baseUrl: "https://eventoren.de" })).success,
      ).toBe(false)
      expect(
        (await e2eCheckpointSave(directory, { ...checkpoint, runId: "def-12345678-1234-1234-1234-123456789abc" }))
          .success,
      ).toBe(false)
      expect(JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8")).runId).toBe(checkpoint.runId)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("retains invalid, unprivate and uncertain ticket state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-checkpoint-test-"))
    try {
      const path = join(directory, "checkpoint.json")
      await writeFile(path, JSON.stringify({ ...checkpoint, password: "not allowed" }), { mode: 0o600 })
      expect((await e2eCheckpointLoad(directory, checkpoint)).success).toBe(false)
      await chmod(path, 0o644)
      expect((await e2eCheckpointLoad(directory, checkpoint)).success).toBe(false)
      await chmod(path, 0o600)
      await rm(path)
      expect((await e2eCheckpointSave(directory, checkpoint)).success).toBe(true)
      const ticket = { ...checkpoint, phase: "ticket-unreconciled" as const }
      expect((await e2eCheckpointSave(directory, ticket)).success).toBe(true)
      expect((await e2eCheckpointSsoClear(directory, ticket)).success).toBe(false)
      expect((await e2eCheckpointSave(directory, checkpoint)).success).toBe(false)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
