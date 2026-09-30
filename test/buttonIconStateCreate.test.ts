import { expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

test("button icon children cache each JSX-producing getter value across reads and react to updates or missing children", async () => {
  const directory = await mkdtemp(join(tmpdir(), "button-icon-state-"))
  try {
    // Bundle the factory and fixture together so both use the same browser Solid runtime.
    // The subprocess avoids changing module resolution or mocking Solid in other tests.
    const bundle = await Bun.build({
      entrypoints: [join(import.meta.dir, "buttonIconStateCreate.fixture.ts")],
      target: "browser",
      conditions: ["browser"],
      external: ["node:assert"],
      outdir: directory,
    })
    expect(bundle.success).toBe(true)
    expect(bundle.logs).toEqual([])

    const subprocess = Bun.spawn([process.execPath, bundle.outputs[0]!.path], {
      stdout: "pipe",
      stderr: "pipe",
    })
    const [exitCode, stderr] = await Promise.all([subprocess.exited, new Response(subprocess.stderr).text()])
    expect(stderr).toBe("")
    expect(exitCode).toBe(0)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
