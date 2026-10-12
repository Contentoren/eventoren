import { open, rename, rm } from "node:fs/promises"
import { createResult, createResultError } from "#result"
import * as v from "valibot"
import { nativeAuthLifecycleCheckpointLoad } from "./nativeAuthLifecycleCheckpointLoad.ts"
import { nativeAuthLifecycleCheckpointPath } from "./nativeAuthLifecycleCheckpointPath.ts"
import {
  nativeAuthLifecycleCheckpointSchema,
  type NativeAuthLifecycleCheckpoint,
} from "./nativeAuthLifecycleCheckpointSchema.ts"

const steps = ["create", "edit", "verify"] as const

export async function nativeAuthLifecycleCheckpointSave(directory: string, checkpoint: NativeAuthLifecycleCheckpoint) {
  const op = "nativeAuthLifecycleCheckpointSave"
  if (!v.safeParse(nativeAuthLifecycleCheckpointSchema, checkpoint).success) {
    return createResultError(op, "Invalid lifecycle checkpoint; no fixture created")
  }
  const existing = await nativeAuthLifecycleCheckpointLoad(directory, checkpoint)
  if (!existing.success) return existing
  const previous = existing.data
  if (previous) {
    if (previous.runId !== checkpoint.runId || previous.createdAt !== checkpoint.createdAt) {
      return createResultError(op, "Cannot overwrite another lifecycle run or an unreconciled attempt")
    }
    if (
      previous.eventKey !== checkpoint.eventKey ||
      previous.titleMarker !== checkpoint.titleMarker ||
      previous.initialTitle !== checkpoint.initialTitle ||
      previous.editedTitle !== checkpoint.editedTitle
    ) {
      return createResultError(op, "Cannot replace the stable lifecycle marker mid-run")
    }
    const from = steps.indexOf(previous.step)
    const to = steps.indexOf(checkpoint.step)
    if (to < from || to > from + 1) {
      return createResultError(op, "Lifecycle steps must advance one ordered step at a time and never rewind")
    }
    if (to === from && previous.status === "completed" && checkpoint.status !== "completed") {
      return createResultError(op, "Verified lifecycle steps cannot be reopened")
    }
  } else if (checkpoint.step !== "create") {
    return createResultError(op, "Lifecycle runs must persist create intent before any other step")
  }
  const path = nativeAuthLifecycleCheckpointPath(directory)
  const tempPath = `${path}.${crypto.randomUUID()}.tmp`
  try {
    const file = await open(tempPath, "wx", 0o600)
    try {
      await file.writeFile(JSON.stringify(checkpoint))
      await file.sync()
    } finally {
      await file.close()
    }
    await rename(tempPath, path)
    return createResult(true)
  } catch {
    return createResultError(op, "Unable to persist lifecycle checkpoint; no further steps started")
  } finally {
    await rm(tempPath, { force: true }).catch(() => {})
  }
}
