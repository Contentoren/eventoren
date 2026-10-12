import { expect, test } from "bun:test"

test("event detail draft codes survive identical-URL transitions without leaking into the URL", async () => {
  const subprocess = Bun.spawn(
    ["bun", "--conditions=browser", "test", `${import.meta.dir}/eventDetailPageActivationCodeDraft.fixture.ts`],
    { stdout: "pipe", stderr: "pipe" },
  )
  const [exitCode, stdout, stderr] = await Promise.all([
    subprocess.exited,
    new Response(subprocess.stdout).text(),
    new Response(subprocess.stderr).text(),
  ])
  expect(exitCode, `${stdout}\n${stderr}`).toBe(0)
  expect(`${stdout}\n${stderr}`).toContain("5 pass")
})
