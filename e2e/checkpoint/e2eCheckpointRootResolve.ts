import { constants } from "node:fs"
import { access, lstat, mkdir, readdir } from "node:fs/promises"
import { join, parse, resolve, sep } from "node:path"
import { createResult, createResultError } from "#result"
import { e2eEnvironmentRead } from "../config/e2eEnvironmentRead.ts"
import { nativeAuthHttpCheckpoint } from "../workflows/nativeAuth/nativeAuthHttpCheckpoint.ts"
import { nativeAuthLifecycleCheckpointLoad } from "../workflows/nativeAuth/nativeAuthLifecycleCheckpointLoad.ts"
import { e2eCheckpointLoad } from "./e2eCheckpointLoad.ts"

type Target = "production" | "development"
const bindings = [
  { target: "production", baseUrl: "https://eventoren.de" },
  { target: "development", baseUrl: "https://eventoren.leonardomora.de" },
] as const

/** Retain target-owned legacy state in place; all new runs use private target-scoped roots. */
export async function e2eCheckpointRootResolve(
  input: {
    preferred?: string
    fallback?: string
    target?: string
    baseUrl?: string
    directory?: string
    environment?: Record<string, string | undefined>
  } = {},
) {
  const op = "e2eCheckpointRootResolve"
  const environment = input.environment ?? process.env
  const selected = e2eEnvironmentRead({
    ...environment,
    E2E_TARGET: input.target ?? environment.E2E_TARGET,
    E2E_BASE_URL: input.baseUrl ?? environment.E2E_BASE_URL,
  })
  if (!selected.success) return selected
  const explicit = input.directory ?? environment.E2E_CHECKPOINT_DIRECTORY
  try {
    if (explicit !== undefined) {
      await rootPrepare(explicit, false)
      // Explicit overrides remain authoritative, not a reason to choose another root.
      const entries = await readdir(explicit)
      await rootLocksCheck(explicit, entries)
      const stored = await e2eCheckpointLoad(explicit, selected.data)
      if (!stored.success) return stored
      const identity = await checkpointsIdentityRead(explicit)
      if (identity && identity.target !== selected.data.target) throw new Error("Foreign explicit state")
      if (!identity) await explicitOrphanStateCheck(explicit, entries)
      return createResult({ directory: explicit, fallback: false, retainedRunId: identity?.runId })
    }
    const preferred = input.preferred ?? "/tmp/opencode/eventoren/e2e"
    const fallback = input.fallback ?? `/tmp/eventoren-e2e-${process.getuid?.() ?? process.pid}/e2e`
    if (resolve(preferred) === resolve(fallback)) return createResultError(op, "Checkpoint roots must differ")
    const candidates: { directory: string; fallback: boolean; retainedRunId: string | undefined }[] = []
    let preferredReady = false
    for (const [index, directory] of [preferred, fallback].entries()) {
      await rootAncestryCheck(directory)
      const exists = await pathExists(directory)
      if (exists) {
        // An existing unsafe legacy root is never silently abandoned for a fresh root.
        await rootPrepare(directory, index === 1)
      } else if (index === 0) {
        try {
          await rootPrepare(directory, false)
        } catch {
          // Shared-host preferred ancestry may be inaccessible; use the private fallback.
          continue
        }
      } else {
        continue
      }
      if (index === 0) preferredReady = true
      const legacy = await rootStateRead(directory, true)
      if (legacy?.target === selected.data.target)
        candidates.push({ directory, fallback: index === 1, retainedRunId: legacy.runId })
      const scoped = join(directory, selected.data.target)
      if (await pathExists(scoped)) {
        await rootPrepare(scoped, index === 1)
        const state = await rootStateRead(scoped, false)
        if (state && state.target !== selected.data.target) throw new Error("Foreign scoped state")
        if (state) candidates.push({ directory: scoped, fallback: index === 1, retainedRunId: state.runId })
      }
    }
    if (candidates.length > 1)
      return createResultError(op, "Multiple checkpoint roots contain state for this target; reconcile them manually")
    const retained = candidates[0]
    if (retained) return createResult(retained)
    const directory = join(preferredReady ? preferred : fallback, selected.data.target)
    await rootPrepare(directory, !preferredReady)
    return createResult({ directory, fallback: !preferredReady, retainedRunId: undefined as string | undefined })
  } catch {
    return createResultError(
      op,
      "No safely accessible unambiguous private checkpoint root; reconcile retained state manually; no workflows started",
    )
  }
}

/** Even missing leaves must not hide symlink/file ancestry behind fallback selection. */
async function rootAncestryCheck(directory: string): Promise<void> {
  if (resolve(directory) !== directory || directory === parse(directory).root) throw new Error("Unsafe root")
  let current = parse(directory).root
  for (const part of directory.slice(current.length).split(sep)) {
    current = join(current, part)
    if (!(await pathExists(current))) return
    if (!(await lstat(current)).isDirectory()) throw new Error("Unsafe root ancestry")
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false
    throw error
  }
}

/** Existing loaders enforce schemas, ownership, privacy and the canonical target/URL pair. */
async function rootStateRead(directory: string, legacy: boolean): Promise<{ target: Target; runId: string } | null> {
  const entries = (await readdir(directory)).filter(
    (entry) => !legacy || !["production", "development"].includes(entry),
  )
  if (entries.length === 0) return null
  await rootLocksCheck(directory, entries)
  const identity = await checkpointsIdentityRead(directory)
  // Locks, evidence, temporary files or unknown files alone cannot identify the target safely.
  if (!identity) throw new Error("Retained state has no validated target identity")
  return identity
}

async function rootLocksCheck(directory: string, entries: string[]): Promise<void> {
  for (const lock of ["invocation.lock", "ticket.lock"]) {
    if (!entries.includes(lock)) continue
    const stat = await lstat(join(directory, lock))
    if (!stat.isFile() || stat.uid !== process.getuid?.() || (stat.mode & 0o077) !== 0)
      throw new Error("Unsafe retained lock")
  }
}

/** Parent lock acquisition arbitrates known orphan locks; unknown orphan state still fails closed. */
async function explicitOrphanStateCheck(directory: string, entries: string[]): Promise<void> {
  for (const entry of entries) {
    if (["invocation.lock", "ticket.lock"].includes(entry)) continue
    if (!/^auth-session-evidence-[0-9a-z]+-[0-9a-f-]{36}\.json$/u.test(entry))
      throw new Error("Unknown explicit orphan state")
    const stat = await lstat(join(directory, entry))
    if (!stat.isFile() || stat.uid !== process.getuid?.() || (stat.mode & 0o077) !== 0)
      throw new Error("Unsafe explicit auth evidence")
  }
}

async function checkpointsIdentityRead(directory: string): Promise<{ target: Target; runId: string } | null> {
  let identity: { target: Target; runId: string } | null = null
  for (const load of [e2eCheckpointLoad, nativeAuthHttpCheckpoint.load, nativeAuthLifecycleCheckpointLoad]) {
    let owned: { target: Target; runId: string } | null = null
    let validated = false
    for (const binding of bindings) {
      const stored = await load(directory, binding)
      if (stored.success) {
        validated = true
        owned = stored.data
        break
      }
    }
    // An absent file succeeds with null; an invalid/foreign canonical pair fails both bindings.
    if (!validated) throw new Error("Invalid retained checkpoint")
    if (!owned) continue
    if (identity && (identity.target !== owned.target || identity.runId !== owned.runId))
      throw new Error("Ambiguous retained checkpoint identities")
    identity = owned
  }
  return identity
}

async function rootPrepare(directory: string, privateAncestors: boolean): Promise<void> {
  if (resolve(directory) !== directory || directory === parse(directory).root) throw new Error("Unsafe root")
  let current = parse(directory).root
  const parts = directory.slice(current.length).split(sep)
  for (const [index, part] of parts.entries()) {
    current = join(current, part)
    try {
      await mkdir(current, { mode: 0o700 })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
    }
    const stat = await lstat(current)
    if (!stat.isDirectory()) throw new Error("Checkpoint root contains a symlink or file")
    if (
      (index === parts.length - 1 || (privateAncestors && index > 0)) &&
      (stat.uid !== process.getuid?.() || (stat.mode & 0o077) !== 0)
    )
      throw new Error("Checkpoint root is not private")
    await access(current, constants.R_OK | constants.W_OK | constants.X_OK)
  }
}
