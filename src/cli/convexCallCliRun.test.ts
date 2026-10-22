import { expect, test } from "bun:test"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { convexCallCliRun } from "./convexCallCliRun.js"

function harness(urls: string[]) {
  const calls: { url: string; method: string; args: unknown }[] = []
  const lines: string[] = []
  const errors: string[] = []
  const clientFromUrl = (url: string) => {
    urls.push(url)
    const run = async (method: string, args: unknown) => {
      calls.push({ url, method, args })
      return { ok: true }
    }
    return {
      query: (reference: never, args: never) => run("query", args),
      mutation: (reference: never, args: never) => run("mutation", args),
      action: (reference: never, args: never) => run("action", args),
    }
  }
  return {
    calls,
    clientFromUrl,
    stdout: (text: string) => {
      lines.push(text)
    },
    stderr: (text: string) => {
      errors.push(text)
    },
    lines,
    errors,
  }
}

test("convexCallCliRun rejects invalid targets", async () => {
  const h = harness([])
  expect(await convexCallCliRun({ argv: [], ...h })).toBe(1)
  expect(await convexCallCliRun({ argv: ["not-a-target"], ...h })).toBe(1)
  expect(h.errors.join("")).toContain("error:")
})

test("convexCallCliRun requires a Convex URL", async () => {
  const h = harness([])
  const dir = mkdtempSync(join(tmpdir(), "convex-call-"))
  const code = await convexCallCliRun({ argv: ["publicProjectInfo:publicProjectInfo"], env: {}, envDir: dir, ...h })
  expect(code).toBe(1)
  expect(h.errors.join("")).toContain("no Convex URL")
})

test("convexCallCliRun loads .env.development and calls the function", async () => {
  const urls: string[] = []
  const h = harness(urls)
  const dir = mkdtempSync(join(tmpdir(), "convex-call-"))
  writeFileSync(join(dir, ".env.development"), "CONVEX_URL=https://dev.invalid\n")
  const code = await convexCallCliRun({
    argv: ["publicProjectInfo:publicProjectInfo", "--env", "development"],
    env: {},
    envDir: dir,
    stdinText: "",
    ...h,
  })
  expect(code).toBe(0)
  expect(urls).toEqual(["https://dev.invalid"])
  expect(h.calls[0]?.method).toBe("query")
  expect(h.lines.join("")).toContain('"ok": true')
})

test("convexCallCliRun prefers --url and injects EVENTOREN_API_KEY", async () => {
  const urls: string[] = []
  const h = harness(urls)
  const code = await convexCallCliRun({
    argv: ["auth:apiKeyListQuery", "--url", "https://flag.invalid"],
    env: { EVENTOREN_API_KEY: "agent-key" },
    envDir: tmpdir(),
    stdinText: '{"paginationOpts":{"numItems":1,"cursor":null}}',
    ...h,
  })
  expect(code).toBe(0)
  expect(urls).toEqual(["https://flag.invalid"])
  expect(h.calls[0]?.args).toEqual({ paginationOpts: { numItems: 1, cursor: null }, token: "agent-key" })
})

test("convexCallCliRun reports unknown and internal functions", async () => {
  const h = harness([])
  expect(
    await convexCallCliRun({
      argv: ["nope:missing", "--url", "https://flag.invalid"],
      env: {},
      envDir: tmpdir(),
      ...h,
    }),
  ).toBe(1)
  expect(
    await convexCallCliRun({
      argv: ["auth:apiKeyExpireInternalMutation", "--url", "https://flag.invalid"],
      env: {},
      envDir: tmpdir(),
      ...h,
    }),
  ).toBe(1)
  expect(h.calls).toHaveLength(0)
})
