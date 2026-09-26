import { e2eInvocationRun } from "./e2eInvocationRun.ts"

process.exitCode = await e2eInvocationRun({ target: process.argv[2] })
