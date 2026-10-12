import { expect, test } from "bun:test"

test("ticket bag item card gate holds in the real Solid client", async () => {
  const subprocess = Bun.spawn(
    ["bun", "--conditions=browser", "test", `${import.meta.dir}/ticketBagItemCardGate.fixture.ts`],
    { stdout: "pipe", stderr: "pipe" },
  )
  const [exitCode, stdout, stderr] = await Promise.all([
    subprocess.exited,
    new Response(subprocess.stdout).text(),
    new Response(subprocess.stderr).text(),
  ])
  expect(exitCode, `${stdout}\n${stderr}`).toBe(0)
  expect(`${stdout}\n${stderr}`).toContain("8 pass")
})
