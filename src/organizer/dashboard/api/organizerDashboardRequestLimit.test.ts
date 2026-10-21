import { expect, test } from "bun:test"
import { organizerDashboardCliRun } from "#src/cli/organizerDashboardCliRun.ts"
import { organizerDashboardHonoCreate } from "./organizerDashboardHonoCreate.ts"
import { organizerDashboardMockBackendCreate } from "./organizerDashboardMockBackend.fixture.ts"
import { organizerDashboardRequestMaxBytes } from "./organizerDashboardRequestMaxBytes.ts"
import { organizerDashboardOperations } from "./organizerDashboardOperations.ts"

const credential = "limit-test-credential-429a"
const base = JSON.stringify({ operation: "context", orgId: "org_ü" })
const bytes = new TextEncoder().encode(base).byteLength
const exactBody = base + " ".repeat(organizerDashboardRequestMaxBytes - bytes)

test("shared request cap is 512 KiB and HTTP/CLI accept exact UTF-8 byte boundary but reject one byte more", async () => {
  expect(organizerDashboardRequestMaxBytes).toBe(524288)
  expect(new TextEncoder().encode(exactBody).byteLength).toBe(organizerDashboardRequestMaxBytes)
  for (const oversize of [false, true]) {
    const body = exactBody + (oversize ? " " : "")
    const mocks = organizerDashboardMockBackendCreate()
    const response = await organizerDashboardHonoCreate(mocks.backend).request("/api/veranstalter", {
      method: "POST",
      headers: { authorization: "Bearer " + credential, "content-type": "application/json" },
      body,
    })
    expect(response.status).toBe(oversize ? 400 : 200)
    const text = await response.text()
    if (oversize) expect(JSON.parse(text)).toMatchObject({ error: { message: "Request body too large" } })
    for (const source of ["stdin", "json"] as const) {
      const output: string[] = []
      const exitCode = await organizerDashboardCliRun({
        argv: [
          "context",
          "--url",
          "https://convex.example.org",
          "--token-env",
          "LIMIT_TEST_CRED",
          ...(source === "json" ? ["--json", body] : []),
        ],
        env: { LIMIT_TEST_CRED: credential },
        stdinText: source === "stdin" ? body : "",
        stdout: (line) => output.push(line),
        backendFromUrl: () => mocks.backend,
      })
      expect(exitCode).toBe(oversize ? 2 : 0)
      if (oversize) expect(JSON.parse(output.join(""))).toMatchObject({ error: { message: "Request body too large" } })
      expect(output.join("")).not.toContain(credential)
    }
    expect(mocks.calls).toHaveLength(oversize ? 0 : 3)
  }
})

test("HTTP lying Content-Length cannot bypass streaming limit and reading stops early", async () => {
  const mocks = organizerDashboardMockBackendCreate()
  const chunk = new Uint8Array(8192).fill(32)
  let count = 0
  let cancelled = false
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      count += 1
      controller.enqueue(chunk)
      if (count === 100) controller.close()
    },
    cancel() {
      cancelled = true
    },
  })
  const request = new Request("http://localhost/api/veranstalter", {
    method: "POST",
    headers: { authorization: "Bearer " + credential, "content-type": "application/json", "content-length": "1" },
    body: stream,
    duplex: "half",
  } as RequestInit)
  const response = await organizerDashboardHonoCreate(mocks.backend).request(request)
  expect(response.status).toBe(400)
  expect(await response.json()).toMatchObject({ error: { message: "Request body too large" } })
  expect(cancelled).toBe(true)
  expect(count).toBeLessThan(100)
  expect(mocks.calls).toEqual([])
})

test("CLI entry streaming stdin uses the same exact byte cap before handling --help without starting a server", async () => {
  for (const oversize of [false, true]) {
    const body = exactBody + (oversize ? " " : "")
    const child = Bun.spawn([process.execPath, "--no-env-file", "src/cli.ts", "organizer-dashboard", "--help"], {
      cwd: new URL("../../../../", import.meta.url).pathname,
      env: { HOME: process.env.HOME ?? "", PATH: process.env.PATH ?? "", NODE_ENV: "test" },
      stdin: new Blob([body]),
      stdout: "pipe",
      stderr: "pipe",
    })
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    expect(stderr).toBe("")
    expect(exitCode).toBe(oversize ? 2 : 0)
    if (oversize)
      expect(JSON.parse(stdout)).toMatchObject({
        error: {
          code: "organizer-dashboard.invalid-body",
          op: "organizerDashboardStdinRead",
          message: "Request body too large",
        },
      })
    if (!oversize) expect(stdout).toContain(`Operations (${organizerDashboardOperations.length})`)
  }
})
