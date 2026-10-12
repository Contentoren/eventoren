import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "@rstest/core"
import { nativeAuthLifecycleCheckpointLoad } from "./nativeAuthLifecycleCheckpointLoad.ts"
import { nativeAuthLifecycleCheckpointSave } from "./nativeAuthLifecycleCheckpointSave.ts"
import type { NativeAuthLifecycleCheckpoint } from "./nativeAuthLifecycleCheckpointSchema.ts"
import { nativeAuthLifecycleIdentityCreate } from "./nativeAuthLifecycleIdentityCreate.ts"
import * as ownershipModule from "./nativeAuthLifecycleOwnershipProve.ts"
import { nativeAuthLifecycleOwnershipProve } from "./nativeAuthLifecycleOwnershipProve.ts"
import * as saveModule from "./nativeAuthLifecycleCheckpointSave.ts"
import * as loadModule from "./nativeAuthLifecycleCheckpointLoad.ts"
import { nativeAuthLifecycleStepRun, type NativeAuthLifecycleStepContext } from "./nativeAuthLifecycleStepRun.ts"
import * as stepRunModule from "./nativeAuthLifecycleStepRun.ts"

const runId = "mtest-12345678-1234-1234-1234-123456789abc"
const target = { target: "development", baseUrl: "https://eventoren.leonardomora.de" } as const

function checkpointCreate(overrides: Partial<NativeAuthLifecycleCheckpoint> = {}): NativeAuthLifecycleCheckpoint {
  const identity = nativeAuthLifecycleIdentityCreate(runId)
  return {
    version: 1,
    target: target.target,
    baseUrl: target.baseUrl,
    runId,
    createdAt: 1_000_000,
    step: "create",
    status: "started",
    ...identity,
    ...overrides,
  }
}

function contextCreate(directory: string, checkpoint: NativeAuthLifecycleCheckpoint): NativeAuthLifecycleStepContext {
  return { directory, checkpoint }
}

describe("native-auth lifecycle file-local checkpoint", () => {
  it("persists the same-run stable marker and resumes it without creating a replacement", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-native-auth-checkpoint-"))
    try {
      const checkpoint = checkpointCreate()
      expect(checkpoint.eventKey).toBe("native-auth-12345678-1234-1234-1234-123456789abc")
      expect((await nativeAuthLifecycleCheckpointSave(directory, checkpoint)).success).toBe(true)
      const loaded = await nativeAuthLifecycleCheckpointLoad(directory, target)
      expect(loaded.success && loaded.data).toMatchObject({
        runId,
        eventKey: checkpoint.eventKey,
        titleMarker: checkpoint.titleMarker,
        step: "create",
        status: "started",
      })
      expect(nativeAuthLifecycleIdentityCreate(runId)).toMatchObject({
        eventKey: checkpoint.eventKey,
        titleMarker: checkpoint.titleMarker,
      })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("adopts an uncertain create by exact event key, including archived current data", async () => {
    const identity = nativeAuthLifecycleIdentityCreate(runId)
    const draft = { eventKey: identity.eventKey, title: identity.initialTitle, status: "draft" }
    const archived = { eventKey: identity.eventKey, title: identity.initialTitle, status: "archived" }
    const edited = { eventKey: identity.eventKey, title: identity.editedTitle, status: "draft" }

    expect(nativeAuthLifecycleOwnershipProve(draft, identity)).toMatchObject({
      success: true,
      data: { adopted: true, edited: false, status: "draft" },
    })
    expect(nativeAuthLifecycleOwnershipProve(archived, identity)).toMatchObject({
      success: true,
      data: { adopted: true, edited: false, status: "archived" },
    })
    expect(nativeAuthLifecycleOwnershipProve(edited, identity)).toMatchObject({
      success: true,
      data: { adopted: true, edited: true },
    })
    expect(nativeAuthLifecycleOwnershipProve(undefined, identity)).toMatchObject({
      success: true,
      data: { adopted: false },
    })
  })

  it("refuses adoption when the exact draft no longer carries this run's marker", async () => {
    const identity = nativeAuthLifecycleIdentityCreate(runId)
    const foreign = {
      eventKey: identity.eventKey,
      title: "[native-auth-e2e:another-run:12345678-1234-1234-1234-123456789abc] lifecycle draft",
      status: "draft",
    }
    const proved = nativeAuthLifecycleOwnershipProve(foreign, identity)
    expect(proved.success).toBe(false)
    const wrongKey = nativeAuthLifecycleOwnershipProve(
      { eventKey: "native-auth-87654321-4321-4321-4321-cba987654321", title: identity.initialTitle, status: "draft" },
      identity,
    )
    expect(wrongKey.success).toBe(false)
  })

  it("skips verified steps on a repaired resume and reruns only the unfinished prefix", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-native-auth-step-"))
    try {
      const context = contextCreate(directory, checkpointCreate())
      expect((await nativeAuthLifecycleCheckpointSave(directory, context.checkpoint)).success).toBe(true)
      let creates = 0
      await nativeAuthLifecycleStepRun(context, "create", false, async () => {
        creates += 1
      })
      expect(creates).toBe(1)
      expect(context.checkpoint).toMatchObject({ step: "create", status: "completed" })

      // A repaired resume rebuilds the context from the retained checkpoint and
      // skips the verified create without touching the fixture again.
      const reloaded = await nativeAuthLifecycleCheckpointLoad(directory, target)
      if (!reloaded.success || !reloaded.data) throw new Error("Lifecycle checkpoint was not retained")
      const resumed = contextCreate(directory, reloaded.data)
      let recreates = 0
      await nativeAuthLifecycleStepRun(resumed, "create", false, async () => {
        recreates += 1
      })
      expect(recreates).toBe(0)
      let edits = 0
      await nativeAuthLifecycleStepRun(resumed, "edit", false, async () => {
        edits += 1
      })
      expect(edits).toBe(1)
      expect(resumed.checkpoint).toMatchObject({ step: "edit", status: "completed" })

      // Completed read-only assertions re-run; completed mutating steps stay skipped.
      let reverified = 0
      await nativeAuthLifecycleStepRun(resumed, "create", true, async () => {
        reverified += 1
      })
      expect(reverified).toBe(1)
      let repeated = 0
      await nativeAuthLifecycleStepRun(resumed, "create", false, async () => {
        repeated += 1
      })
      expect(repeated).toBe(0)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("refuses to advance past an uncertain preceding step", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-native-auth-step-"))
    try {
      const context = contextCreate(directory, checkpointCreate())
      expect((await nativeAuthLifecycleCheckpointSave(directory, context.checkpoint)).success).toBe(true)
      await expect(nativeAuthLifecycleStepRun(context, "edit", false, async () => {})).rejects.toThrow(
        "preceding step is uncertain",
      )
      await expect(nativeAuthLifecycleStepRun(context, "verify", false, async () => {})).rejects.toThrow(
        "preceding step is uncertain",
      )
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("refuses a different target, another run, a replaced marker, or a rewound step", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-native-auth-target-"))
    try {
      expect((await nativeAuthLifecycleCheckpointSave(directory, checkpointCreate())).success).toBe(true)
      expect(
        (await nativeAuthLifecycleCheckpointLoad(directory, { target: "production", baseUrl: "https://eventoren.de" }))
          .success,
      ).toBe(false)
      expect(
        (
          await nativeAuthLifecycleCheckpointSave(
            directory,
            checkpointCreate({ runId: "mother-12345678-1234-1234-1234-123456789abc" }),
          )
        ).success,
      ).toBe(false)
      expect(
        (
          await nativeAuthLifecycleCheckpointSave(
            directory,
            checkpointCreate({ eventKey: "native-auth-87654321-4321-4321-4321-cba987654321" }),
          )
        ).success,
      ).toBe(false)
      const skipped = checkpointCreate({ step: "verify", status: "completed" })
      // Ordered prefix: steps advance one at a time, never skipping ahead.
      expect((await nativeAuthLifecycleCheckpointSave(directory, skipped)).success).toBe(false)
      const created = checkpointCreate({ step: "create", status: "completed" })
      expect((await nativeAuthLifecycleCheckpointSave(directory, created)).success).toBe(true)
      expect((await nativeAuthLifecycleCheckpointSave(directory, checkpointCreate())).success).toBe(false)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("retains started intent and the fixture when an action fails, without any cleanup deletion", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-native-auth-failure-"))
    try {
      const context = contextCreate(directory, checkpointCreate())
      expect((await nativeAuthLifecycleCheckpointSave(directory, context.checkpoint)).success).toBe(true)
      await expect(
        nativeAuthLifecycleStepRun(context, "create", false, async () => {
          throw new Error("browser interrupted after intent")
        }),
      ).rejects.toThrow("browser interrupted after intent")
      const retained = await nativeAuthLifecycleCheckpointLoad(directory, target)
      expect(retained.success && retained.data).toMatchObject({ step: "create", status: "started" })

      // The helper surface exposes no cleanup or deletion API: failures retain
      // state for resume and only the invocation barrier may remove fixtures.
      const exports = [
        ...Object.keys(stepRunModule),
        ...Object.keys(saveModule),
        ...Object.keys(loadModule),
        ...Object.keys(ownershipModule),
      ].join(" ")
      expect(exports).not.toMatch(/cleanup|delete/i)
      const raw = JSON.parse(await readFile(join(directory, "native-auth-lifecycle-checkpoint.json"), "utf8"))
      expect(JSON.stringify(raw)).not.toMatch(/token|session|cleanup|delete/i)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
