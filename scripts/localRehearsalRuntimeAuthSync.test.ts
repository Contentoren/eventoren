import { afterAll, describe, expect, test } from "bun:test"
import { chmodSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const helperScript = new URL("./localRehearsalRuntimeAuthSync.py", import.meta.url).pathname
const scratch = mkdtempSync(join(tmpdir(), "runtime-auth-sync-"))
afterAll(() => rmSync(scratch, { recursive: true, force: true }))

const goodSecret = `0123456789abcdef`.repeat(4)
const otherLines = [
  "PUBLIC_ENV_MODE=development",
  "CONVEX_REHEARSAL_MODE=local",
  "PUBLIC_BASE_URL_CONVEX=http://127.0.0.1:13470",
]

function writePrivate(fileName: string, body: string): string {
  const target = join(scratch, fileName)
  writeFileSync(target, body)
  chmodSync(target, 0o600)
  return target
}

function runHelper(args: ReadonlyArray<string>): { exitCode: number; output: string } {
  const spawned = Bun.spawnSync(["python3", helperScript, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const output = `${spawned.stdout.toString()}${spawned.stderr.toString()}`
  return { exitCode: spawned.exitCode ?? 1, output }
}

describe("localRehearsalRuntimeAuthSync fixtures", () => {
  test("sync replaces exactly the AUTH_SECRET line and keeps other env unchanged", () => {
    const runtime = writePrivate(
      `runtime-ok-${Math.random().toString(36).slice(2)}.env`,
      [...otherLines, "AUTH_SECRET=local-rehearsal-only-not-a-credential"].join("\n").concat("\n"),
    )
    const secretFile = writePrivate(`secret-ok-${Math.random().toString(36).slice(2)}.txt`, `${goodSecret}\n`)
    const { exitCode, output } = runHelper(["--runtime", runtime, "--secret-file", secretFile])
    expect(exitCode).toBe(0)
    const body = readFileSync(runtime, "utf-8")
    expect(body).toBe([...otherLines, `AUTH_SECRET=${goodSecret}`].join("\n").concat("\n"))
    expect(output).not.toContain(goodSecret)
  })

  test("check prevalidates without writing", () => {
    const before = [...otherLines, "AUTH_SECRET=local-rehearsal-only-not-a-credential"].join("\n").concat("\n")
    const runtime = writePrivate(`runtime-check-${Math.random().toString(36).slice(2)}.env`, before)
    const secretFile = writePrivate(`secret-check-${Math.random().toString(36).slice(2)}.txt`, goodSecret)
    const { exitCode, output } = runHelper(["--runtime", runtime, "--secret-file", secretFile, "--check"])
    expect(exitCode).toBe(0)
    expect(readFileSync(runtime, "utf-8")).toBe(before)
    expect(output).not.toContain(goodSecret)
  })

  test("missing or duplicated AUTH_SECRET lines refuse and leave the file unchanged", () => {
    const secretFile = writePrivate(`secret-dup-${Math.random().toString(36).slice(2)}.txt`, goodSecret)
    for (const body of [
      `${otherLines.join("\n")}\n`,
      [...otherLines, "AUTH_SECRET=a", "AUTH_SECRET=b"].join("\n").concat("\n"),
    ]) {
      const runtime = writePrivate(`runtime-bad-${Math.random().toString(36).slice(2)}.env`, body)
      const { exitCode, output } = runHelper(["--runtime", runtime, "--secret-file", secretFile])
      expect(exitCode).not.toBe(0)
      expect(readFileSync(runtime, "utf-8")).toBe(body)
      expect(output).not.toContain(goodSecret)
    }
  })

  test("group-readable runtime, symlinked runtime, and symlinked secret refuse", () => {
    const secretFile = writePrivate(`secret-link-${Math.random().toString(36).slice(2)}.txt`, goodSecret)
    const plainRuntime = writePrivate(
      `runtime-plain-${Math.random().toString(36).slice(2)}.env`,
      [...otherLines, "AUTH_SECRET=x"].join("\n").concat("\n"),
    )
    const publicRuntime = writePrivate(
      `runtime-public-${Math.random().toString(36).slice(2)}.env`,
      [...otherLines, "AUTH_SECRET=x"].join("\n").concat("\n"),
    )
    chmodSync(publicRuntime, 0o640)
    const linkRuntime = join(scratch, `runtime-link-${Math.random().toString(36).slice(2)}.env`)
    symlinkSync(plainRuntime, linkRuntime)
    const linkSecret = join(scratch, `secret-link-${Math.random().toString(36).slice(2)}.txt`)
    symlinkSync(secretFile, linkSecret)
    expect(runHelper(["--runtime", publicRuntime, "--secret-file", secretFile]).exitCode).not.toBe(0)
    expect(runHelper(["--runtime", linkRuntime, "--secret-file", secretFile]).exitCode).not.toBe(0)
    expect(runHelper(["--runtime", plainRuntime, "--secret-file", linkSecret]).exitCode).not.toBe(0)
    expect(readFileSync(plainRuntime, "utf-8")).toContain("AUTH_SECRET=x")
  })

  test("malformed secret refuses without leaking it", () => {
    const runtime = writePrivate(
      `runtime-malformed-${Math.random().toString(36).slice(2)}.env`,
      [...otherLines, "AUTH_SECRET=x"].join("\n").concat("\n"),
    )
    const leaked = `deadbeef`.repeat(4).concat("!")
    const secretFile = writePrivate(`secret-malformed-${Math.random().toString(36).slice(2)}.txt`, leaked)
    const { exitCode, output } = runHelper(["--runtime", runtime, "--secret-file", secretFile])
    expect(exitCode).not.toBe(0)
    expect(output).not.toContain(leaked)
    expect(readFileSync(runtime, "utf-8")).toContain("AUTH_SECRET=x")
  })
})
