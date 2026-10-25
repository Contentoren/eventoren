import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "@rstest/core"
import { nativeAuthHttpCheckpoint, type NativeAuthHttpCheckpoint } from "./nativeAuthHttpCheckpoint.ts"

const runId = "mhttp-12345678-1234-1234-1234-123456789abc"
const foreignRunId = "mother-12345678-1234-1234-1234-123456789abc"
const binding = { target: "development", baseUrl: "https://eventoren.leonardomora.de" } as const

function checkpointCreate(overrides: Partial<NativeAuthHttpCheckpoint> = {}): NativeAuthHttpCheckpoint {
  return {
    version: 1,
    target: binding.target,
    baseUrl: binding.baseUrl,
    runId,
    createdAt: 1_000_000,
    workflow: "native auth HTTP",
    step: "authenticated-bootstrap",
    status: "started",
    ...overrides,
  }
}

describe("native-auth HTTP file-local checkpoint", () => {
  it("skips the verified bootstrap on resume without a duplicate sign-in and finishes the pending catalogue step", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-native-auth-http-"))
    try {
      let signIns = 0
      expect((await nativeAuthHttpCheckpoint.save(directory, checkpointCreate())).success).toBe(true)

      // First attempt runs the login because bootstrap is still uncertain.
      const uncertain = await nativeAuthHttpCheckpoint.load(directory, binding)
      if (!uncertain.success || !uncertain.data) throw new Error("HTTP checkpoint was not retained")
      if (!nativeAuthHttpCheckpoint.isStepCompleted(uncertain.data, "authenticated-bootstrap")) signIns += 1
      expect(signIns).toBe(1)
      expect(
        (await nativeAuthHttpCheckpoint.save(directory, { ...checkpointCreate(), status: "completed" })).success,
      ).toBe(true)

      // A repaired resume skips the verified bootstrap without another login.
      const resumed = await nativeAuthHttpCheckpoint.load(directory, binding)
      if (!resumed.success || !resumed.data) throw new Error("HTTP checkpoint was not retained")
      if (!nativeAuthHttpCheckpoint.isStepCompleted(resumed.data, "authenticated-bootstrap")) signIns += 1
      expect(signIns).toBe(1)

      // The pending catalogue step still runs its asserts exactly once, then completes.
      const pending = await nativeAuthHttpCheckpoint.load(directory, binding)
      if (!pending.success || !pending.data) throw new Error("HTTP checkpoint was not retained")
      expect(nativeAuthHttpCheckpoint.isStepCompleted(pending.data, "anonymous-catalogue")).toBe(false)
      expect(
        (
          await nativeAuthHttpCheckpoint.save(directory, {
            ...pending.data,
            step: "anonymous-catalogue",
            status: "started",
          })
        ).success,
      ).toBe(true)
      let catalogues = 0
      catalogues += 1
      const finishing = await nativeAuthHttpCheckpoint.load(directory, binding)
      if (!finishing.success || !finishing.data) throw new Error("HTTP checkpoint was not retained")
      expect((await nativeAuthHttpCheckpoint.save(directory, { ...finishing.data, status: "completed" })).success).toBe(
        true,
      )
      expect(catalogues).toBe(1)
      const final = await nativeAuthHttpCheckpoint.load(directory, binding)
      expect(final.success && final.data).toMatchObject({ step: "anonymous-catalogue", status: "completed", runId })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("refuses catalogue before bootstrap, foreign runs/targets, corrupt state and rewound steps", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-native-auth-http-refuse-"))
    try {
      expect(
        (await nativeAuthHttpCheckpoint.save(directory, checkpointCreate({ step: "anonymous-catalogue" }))).success,
      ).toBe(false)
      expect((await nativeAuthHttpCheckpoint.save(directory, checkpointCreate())).success).toBe(true)
      expect((await nativeAuthHttpCheckpoint.save(directory, checkpointCreate({ runId: foreignRunId }))).success).toBe(
        false,
      )
      expect(
        (await nativeAuthHttpCheckpoint.load(directory, { target: "production", baseUrl: "https://eventoren.de" }))
          .success,
      ).toBe(false)
      const progressed = checkpointCreate({ step: "anonymous-catalogue", status: "completed" })
      expect((await nativeAuthHttpCheckpoint.save(directory, progressed)).success).toBe(true)
      expect((await nativeAuthHttpCheckpoint.save(directory, checkpointCreate())).success).toBe(false)
      expect((await nativeAuthHttpCheckpoint.save(directory, { ...progressed, status: "started" })).success).toBe(false)

      const corruptDirectory = await mkdtemp(join(tmpdir(), "eventoren-native-auth-http-corrupt-"))
      try {
        await writeFile(join(corruptDirectory, "native-auth-http-checkpoint.json"), "{not-json", { mode: 0o600 })
        expect((await nativeAuthHttpCheckpoint.load(corruptDirectory, binding)).success).toBe(false)
        expect((await nativeAuthHttpCheckpoint.retire(corruptDirectory, { ...binding, runId })).success).toBe(false)
        // Corrupt state is retained, never invented as complete.
        expect(nativeAuthHttpCheckpoint.isStepCompleted(checkpointCreate(), "anonymous-catalogue")).toBe(false)
      } finally {
        await rm(corruptDirectory, { recursive: true, force: true })
      }
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("retires only the owned run file and keeps foreign state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-native-auth-http-retire-"))
    try {
      expect((await nativeAuthHttpCheckpoint.save(directory, checkpointCreate())).success).toBe(true)
      expect((await nativeAuthHttpCheckpoint.retire(directory, { ...binding, runId: foreignRunId })).success).toBe(
        false,
      )
      const first = await nativeAuthHttpCheckpoint.retire(directory, { ...binding, runId })
      expect(first.success && first.data).toMatchObject({ retired: true })
      await expect(readFile(join(directory, "native-auth-http-checkpoint.json"), "utf8")).rejects.toThrow()
      const second = await nativeAuthHttpCheckpoint.retire(directory, { ...binding, runId })
      expect(second.success && second.data).toMatchObject({ retired: false })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
