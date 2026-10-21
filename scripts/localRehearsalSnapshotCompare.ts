import { spawnSync } from "node:child_process"
import * as a from "valibot"
import { createResult, createResultError, type Result } from "#result"

const localRehearsalSnapshotCompareInputSchema = a.object({
  originalZip: a.pipe(a.string(), a.minLength(1, "Original snapshot path is required")),
  reexportZip: a.pipe(a.string(), a.minLength(1, "Re-export path is required")),
  allowedEmptyTables: a.array(a.pipe(a.string(), a.minLength(1, "Allowlisted table name is required"))),
  comparatorScript: a.pipe(a.string(), a.minLength(1, "Comparator script path is required")),
})

const localRehearsalSnapshotCompareTablePattern = /^[A-Za-z_][A-Za-z0-9_]*$/

export type LocalRehearsalSnapshotCompareSummary = {
  readonly tables: number
  readonly docs: number
  readonly allowedExtra: ReadonlyArray<string>
}

export function localRehearsalSnapshotCompare(input: {
  originalZip: string
  reexportZip: string
  allowedEmptyTables: ReadonlyArray<string>
  comparatorScript: string
}): Result<LocalRehearsalSnapshotCompareSummary> {
  const op = "localRehearsalSnapshotCompare"
  const parsed = a.safeParse(localRehearsalSnapshotCompareInputSchema, {
    originalZip: input.originalZip,
    reexportZip: input.reexportZip,
    allowedEmptyTables: [...input.allowedEmptyTables],
    comparatorScript: input.comparatorScript,
  })
  if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
  const seen = new Set<string>()
  for (const name of parsed.output.allowedEmptyTables) {
    if (!localRehearsalSnapshotCompareTablePattern.test(name))
      return createResultError(op, `Allowlisted table name is not a plain table identifier: ${name}`)
    if (name === "_tables" || name.startsWith("_system") || name.startsWith("_storage"))
      return createResultError(op, `Allowlisted table name is reserved and can never be an extra: ${name}`)
    if (seen.has(name)) return createResultError(op, `Allowlisted table name is duplicated: ${name}`)
    seen.add(name)
  }
  const args = [
    parsed.output.comparatorScript,
    "--original",
    parsed.output.originalZip,
    "--reexport",
    parsed.output.reexportZip,
  ]
  for (const name of seen) args.push("--allow-empty-extra", name)
  const spawned = spawnSync("python3", args, { encoding: "utf-8" })
  if (spawned.error) return createResultError(op, `Comparator process failed to start: ${spawned.error.message}`)
  const stdout = spawned.stdout ?? ""
  const stderr = spawned.stderr ?? ""
  if (spawned.status !== 0) {
    const detail = stderr.trim().split("\n").at(-1) ?? "comparator reported a mismatch"
    return createResultError(op, `Snapshot comparison failed: ${detail}`, {
      stdoutTail: stdout.trim().split("\n").slice(-5),
    })
  }
  const summary = stdout.trim().split("\n").at(-1) ?? ""
  const match = summary.match(/^verify=ok tables=(\d+) docs=(\d+) allowed_extra=(.*)$/)
  if (!match) return createResultError(op, "Comparator passed but its summary line was unreadable")
  return createResult({
    tables: Number(match[1]),
    docs: Number(match[2]),
    allowedExtra: match[3] === "none" ? [] : match[3].split(","),
  })
}
