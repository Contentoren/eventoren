import { spawn } from "node:child_process"
import { e2eTraceCleanup } from "./e2eTraceCleanup.ts"

export async function e2eHelpersRun(
  input: { commandRun?: () => Promise<number>; traceCleanup?: typeof e2eTraceCleanup } = {},
): Promise<number> {
  let exitCode = 1
  try {
    exitCode = await (input.commandRun ?? e2eHelpersSpawn)()
  } catch (error) {
    console.error("E2E helper tests could not complete", error)
  } finally {
    try {
      const traces = await (input.traceCleanup ?? e2eTraceCleanup)()
      if (!traces.success) console.error(`Playwright trace cleanup failed: ${traces.errorMessage}`)
      else if (traces.removed?.length)
        console.log(`Expired Playwright trace directories removed: ${traces.removed.join(", ")}`)
    } catch (error) {
      console.error("Playwright trace cleanup failed", error)
    }
  }
  return exitCode
}

function e2eHelpersSpawn(): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn("bunx", ["rstest", "run", "--config", "e2e/helpers-rstest.config.ts"], {
      stdio: "inherit",
    })
    child.once("error", reject)
    child.once("close", (code) => resolve(code ?? 1))
  })
}
