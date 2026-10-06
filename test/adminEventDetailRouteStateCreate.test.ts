import { expect, test } from "bun:test"

test("initialized event detail edits survive live refresh and route navigation with reactive Solid state", async () => {
  const subprocess = Bun.spawn(
    ["bun", "--conditions=browser", "test", `${import.meta.dir}/adminEventDetailRouteStateCreate.fixture.ts`],
    { stdout: "pipe", stderr: "pipe" },
  )
  const [exitCode, stdout, stderr] = await Promise.all([
    subprocess.exited,
    new Response(subprocess.stdout).text(),
    new Response(subprocess.stderr).text(),
  ])
  const output = `${stdout}\n${stderr}`
  expect(exitCode, output).toBe(0)
  expect(output).toContain("2 pass")
  expect(output).toContain("0 fail")
})
