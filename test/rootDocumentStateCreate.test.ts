import { expect, test } from "bun:test"

test("root document theme regressions pass in an isolated Bun subprocess", async () => {
  const subprocess = Bun.spawn(["bun", "test", `${import.meta.dir}/rootDocumentStateCreate.fixture.ts`], {
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
