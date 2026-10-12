import { isDeepStrictEqual } from "node:util"
import { nativeAuthLifecycleCheckpointLoad } from "./nativeAuthLifecycleCheckpointLoad.ts"
import { nativeAuthLifecycleCheckpointSave } from "./nativeAuthLifecycleCheckpointSave.ts"
import type { NativeAuthLifecycleCheckpoint } from "./nativeAuthLifecycleCheckpointSchema.ts"

export type NativeAuthLifecycleStepContext = {
  directory: string
  checkpoint: NativeAuthLifecycleCheckpoint
}

type Step = NativeAuthLifecycleCheckpoint["step"]
const steps: Step[] = ["create", "edit", "verify"]

/**
 * Durable ordered lifecycle steps. Verified mutating steps are skipped on a
 * repaired resume while completed read-only assertions re-run. Intent is
 * persisted before the first uncertain effect; a step left started by an
 * interruption re-runs its action, which must reconcile the exact same-run
 * event key before creating a replacement. Failures retain the checkpoint and
 * the fixture for resume; nothing here ever deletes the draft.
 */
export async function nativeAuthLifecycleStepRun(
  context: NativeAuthLifecycleStepContext,
  step: Step,
  readOnly: boolean,
  action: (completed: boolean) => Promise<void>,
): Promise<void> {
  const position = steps.indexOf(step)
  const current = steps.indexOf(context.checkpoint.step)
  if (current > position) {
    if (readOnly) await action(true)
    return
  }
  if (current < position - 1 || (current === position - 1 && context.checkpoint.status !== "completed")) {
    throw new Error(`Cannot advance lifecycle workflow to ${step}; preceding step is uncertain`)
  }
  const completed = current === position && context.checkpoint.status === "completed"
  if (completed) {
    if (readOnly) await action(true)
    return
  }
  if (current < position) {
    const started: NativeAuthLifecycleCheckpoint = { ...context.checkpoint, step, status: "started" }
    const saved = await nativeAuthLifecycleCheckpointSave(context.directory, started)
    if (!saved.success) throw new Error(saved.errorMessage)
    context.checkpoint = started
  }
  await action(false)
  const done: NativeAuthLifecycleCheckpoint = { ...context.checkpoint, step, status: "completed" }
  const stored = await nativeAuthLifecycleCheckpointLoad(context.directory, context.checkpoint)
  if (!stored.success || !stored.data || !isDeepStrictEqual(stored.data, context.checkpoint)) {
    throw new Error(`Lifecycle ${step} checkpoint changed; reconcile before continuing`)
  }
  const saved = await nativeAuthLifecycleCheckpointSave(context.directory, done)
  if (!saved.success) throw new Error(saved.errorMessage)
  context.checkpoint = done
}
