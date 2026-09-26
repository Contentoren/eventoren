import { constants } from "node:fs"
import { access, lstat, mkdir, readdir } from "node:fs/promises"
import { join, parse, resolve, sep } from "node:path"
import { createResult, createResultError } from "#result"

/** A stable private fallback cannot strand state when the preferred root later becomes available. */
export async function e2eCheckpointRootResolve(paths: { preferred?: string; fallback?: string } = {}) {
  const op = "e2eCheckpointRootResolve"
  const preferred = paths.preferred ?? "/tmp/opencode/eventoren/e2e"
  const fallback = paths.fallback ?? `/tmp/eventoren-e2e-${process.getuid?.() ?? process.pid}/e2e`
  if (preferred === fallback) return createResultError(op, "Checkpoint roots must differ")
  let preferredReady = false
  try {
    await rootPrepare(preferred, false)
    preferredReady = true
  } catch {
    // /tmp/opencode may be owned by another user on shared hosts.
  }
  try {
    if (!preferredReady) {
      await rootPrepare(fallback, true)
      return createResult({ directory: fallback, fallback: true })
    }
    try {
      await lstat(fallback)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return createResult({ directory: preferred, fallback: false })
      }
      throw error
    }
    await rootPrepare(fallback, true)
    const fallbackState = (await readdir(fallback)).includes("checkpoint.json")
    if (!fallbackState) return createResult({ directory: preferred, fallback: false })
    if ((await readdir(preferred)).includes("checkpoint.json")) {
      return createResultError(op, "Both checkpoint roots contain state; reconcile them manually")
    }
    return createResult({ directory: fallback, fallback: true })
  } catch {
    return createResultError(op, "No safely accessible private checkpoint root; no workflows started")
  }
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
