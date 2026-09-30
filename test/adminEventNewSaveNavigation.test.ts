import { expect, test } from "bun:test"

test("new event successful-save navigation regressions pass in isolation", async () => {
  const subprocess = Bun.spawn(["bun", "test", `${import.meta.dir}/adminEventNewSaveNavigation.fixture.ts`], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    subprocess.exited,
    new Response(subprocess.stdout).text(),
    new Response(subprocess.stderr).text(),
  ])
  const output = `${stdout}\n${stderr}`
  expect(exitCode, output).toBe(0)
  expect(output).toContain("8 pass")
  expect(output).toContain("0 fail")
})
