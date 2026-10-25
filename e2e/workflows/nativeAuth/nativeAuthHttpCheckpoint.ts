import { lstat, open, readFile, rename, rm, unlink } from "node:fs/promises"
import { join } from "node:path"
import { createResult, createResultError } from "#result"
import * as v from "valibot"

/**
 * File-local durable state for one native-auth HTTP run. The ordered step
 * cursor (authenticated-bootstrap, anonymous-catalogue) is a prefix: resume
 * skips verified steps and continues at the first unfinished one. Only the
 * run binding and the cursor persist; browser sessions are always rebuilt,
 * and this checkpoint never deletes sessions or fixtures. Removal belongs to
 * the whole-invocation success barrier only, before the caller auth/local
 * evidence clear.
 */
const schema = v.strictObject({
  version: v.literal(1),
  target: v.picklist(["production", "development"]),
  baseUrl: v.picklist(["https://eventoren.de", "https://eventoren.leonardomora.de"]),
  runId: v.pipe(v.string(), v.regex(/^[0-9a-z]+-[0-9a-f-]{36}$/u)),
  createdAt: v.pipe(v.number(), v.integer(), v.minValue(1)),
  workflow: v.literal("native auth HTTP"),
  step: v.picklist(["authenticated-bootstrap", "anonymous-catalogue"]),
  status: v.picklist(["started", "completed"]),
})

type Stored = v.InferOutput<typeof schema>
type Binding = Pick<Stored, "target" | "baseUrl">
type Step = Stored["step"]

const steps: readonly Step[] = ["authenticated-bootstrap", "anonymous-catalogue"]
const fileName = "native-auth-http-checkpoint.json"

function pathGet(directory: string): string {
  return join(directory, fileName)
}

/** Unknown, corrupt and different-target/workflow state is never discarded or completed. */
async function load(directory: string, binding: Binding) {
  const op = "nativeAuthHttpCheckpointLoad"
  const path = pathGet(directory)
  try {
    const stat = await lstat(path)
    if (!stat.isFile() || stat.uid !== process.getuid?.() || (stat.mode & 0o077) !== 0) {
      return createResultError(op, "HTTP checkpoint file is not private and user-owned")
    }
    const parsed = v.safeParse(schema, JSON.parse(await readFile(path, "utf8")))
    if (!parsed.success) return createResultError(op, "Invalid HTTP checkpoint; reconcile it manually")
    if (parsed.output.target !== binding.target || parsed.output.baseUrl !== binding.baseUrl) {
      return createResultError(op, "HTTP checkpoint belongs to a different target; reconcile it manually")
    }
    if (parsed.output.workflow !== "native auth HTTP") {
      return createResultError(op, "HTTP checkpoint belongs to another workflow; reconcile it manually")
    }
    return createResult(parsed.output as Stored | null)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createResult(null as Stored | null)
    }
    return createResultError(op, "Cannot safely read HTTP checkpoint; no step completed")
  }
}

async function save(directory: string, checkpoint: Stored) {
  const op = "nativeAuthHttpCheckpointSave"
  if (!v.safeParse(schema, checkpoint).success) {
    return createResultError(op, "Invalid HTTP checkpoint; no step completed")
  }
  const existing = await load(directory, checkpoint)
  if (!existing.success) return existing
  const previous = existing.data
  if (previous) {
    if (previous.runId !== checkpoint.runId || previous.createdAt !== checkpoint.createdAt) {
      return createResultError(op, "Cannot overwrite another HTTP run or an unreconciled attempt")
    }
    const from = steps.indexOf(previous.step)
    const to = steps.indexOf(checkpoint.step)
    if (to < from || to > from + 1) {
      return createResultError(op, "HTTP steps must advance one ordered step at a time and never rewind")
    }
    if (to === from && previous.status === "completed" && checkpoint.status !== "completed") {
      return createResultError(op, "Verified HTTP steps cannot be reopened")
    }
  } else if (checkpoint.step !== "authenticated-bootstrap") {
    return createResultError(op, "HTTP runs must persist bootstrap intent before any other step")
  }
  const path = pathGet(directory)
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
    return createResultError(op, "Unable to persist HTTP checkpoint; no further steps started")
  } finally {
    await rm(tempPath, { force: true }).catch(() => {})
  }
}

function isStepCompleted(checkpoint: Stored, step: Step): boolean {
  const at = steps.indexOf(checkpoint.step)
  const want = steps.indexOf(step)
  return at > want || (at === want && checkpoint.status === "completed")
}

/**
 * Success-barrier retirement for the single known owned HTTP state file. One
 * file per directory covers the current and any older run, so retiring it
 * retires both. Foreign, corrupt and mismatched state is refused and retained;
 * an absent file is already retired. Call before the caller auth/local
 * evidence clear, never from a per-test finally sweep.
 */
async function retire(directory: string, expected: Binding & { runId: string }) {
  const op = "nativeAuthHttpCheckpointRetire"
  const path = pathGet(directory)
  try {
    const stat = await lstat(path)
    if (!stat.isFile()) return createResultError(op, "HTTP checkpoint is not a file; reconcile it manually")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return createResult({ retired: false as const })
    return createResultError(op, "Cannot safely inspect HTTP checkpoint; reconcile it manually")
  }
  const stored = await load(directory, expected)
  if (!stored.success) return stored
  if (!stored.data) return createResult({ retired: false as const })
  if (stored.data.runId !== expected.runId) {
    return createResultError(op, "HTTP checkpoint belongs to another run; reconcile it manually")
  }
  try {
    await unlink(path)
    return createResult({ retired: true as const })
  } catch {
    return createResultError(op, "Verified HTTP checkpoint could not be removed; reconcile it manually")
  }
}

export const nativeAuthHttpCheckpoint = {
  schema,
  steps,
  workflow: "native auth HTTP" as const,
  fileName,
  path: pathGet,
  load,
  save,
  isStepCompleted,
  retire,
}

export type NativeAuthHttpCheckpoint = Stored
