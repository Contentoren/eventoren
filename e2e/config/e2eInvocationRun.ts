import { spawn } from "node:child_process"
import { e2eCheckpointLoad } from "../checkpoint/e2eCheckpointLoad.ts"
import { e2eCheckpointRootResolve } from "../checkpoint/e2eCheckpointRootResolve.ts"
import { e2eCheckpointSave } from "../checkpoint/e2eCheckpointSave.ts"
import { e2eCheckpointSsoClear } from "../checkpoint/e2eCheckpointSsoClear.ts"
import type { E2eCheckpoint } from "../checkpoint/e2eCheckpointSchema.ts"
import { e2eEnvironmentLoad } from "./e2eEnvironmentLoad.ts"
import { e2eEnvironmentRead } from "./e2eEnvironmentRead.ts"
import { e2eTicketTargetCheck } from "./e2eTicketTargetCheck.ts"

type Workflow = { name: string; config: string }
const sso: Workflow = { name: "SSO", config: "e2e/rstest.config.ts" }
const ticket: Workflow = { name: "ticket purchase", config: "e2e/ticket-rstest.config.ts" }

/** Refuse unsafe targets before the first browser opens; never substitute preview for production. */
export async function e2eInvocationRun(
  input: {
    target?: string
    environment?: Record<string, string | undefined>
    checkpointDirectory?: string
    commandRun?: (workflow: Workflow, environment: Record<string, string>) => Promise<number>
  } = {},
): Promise<number> {
  if (!input.environment) e2eEnvironmentLoad()
  const environment = { ...(input.environment ?? process.env), E2E_TARGET: input.target ?? "production" }
  const target = e2eEnvironmentRead(environment)
  if (!target.success) {
    console.error(target.errorMessage)
    return 1
  }
  const ticketSafety = e2eTicketTargetCheck(target.data.target)
  if (!ticketSafety.success) {
    console.error(ticketSafety.errorMessage)
    return 1
  }

  const root = input.checkpointDirectory
    ? { success: true as const, data: { directory: input.checkpointDirectory, fallback: false } }
    : await e2eCheckpointRootResolve()
  if (!root.success) {
    console.error(root.errorMessage)
    return 1
  }
  if (root.data.fallback)
    console.warn(`Preferred E2E checkpoint root unavailable; using private fallback ${root.data.directory}`)
  const stored = await e2eCheckpointLoad(root.data.directory, target.data)
  if (!stored.success) {
    console.error(stored.errorMessage)
    return 1
  }
  let checkpoint: E2eCheckpoint = stored.data ?? {
    version: 1,
    target: target.data.target,
    baseUrl: target.data.baseUrl as E2eCheckpoint["baseUrl"],
    runId: `${Date.now().toString(36)}-${crypto.randomUUID()}`,
    createdAt: Date.now(),
    phase: "sso",
  }
  if (checkpoint.phase === "ticket-unreconciled") {
    console.error(
      `Ticket attempt ${checkpoint.runId} requires app, Stripe TEST, mail and PDF reconciliation before another run; checkpoint retained at ${root.data.directory}`,
    )
    return 1
  }
  if (Date.now() - checkpoint.createdAt > 24 * 60 * 60_000) {
    // The read-only SSO attempt has no owned fixture. Ticket attempts never reach here.
    const cleared = await e2eCheckpointSsoClear(root.data.directory, checkpoint)
    if (!cleared.success) {
      console.error(cleared.errorMessage)
      return 1
    }
    console.log(`Expired read-only SSO checkpoint ${checkpoint.runId} cleared`)
    checkpoint = { ...checkpoint, runId: `${Date.now().toString(36)}-${crypto.randomUUID()}`, createdAt: Date.now() }
  }
  const initial = await e2eCheckpointSave(root.data.directory, checkpoint)
  if (!initial.success) {
    console.error(initial.errorMessage)
    return 1
  }

  const childEnvironment = {
    ...environment,
    E2E_BASE_URL: target.data.baseUrl,
    E2E_RUN_ID: checkpoint.runId,
  } as Record<string, string>
  for (const workflow of [sso, ticket]) {
    if (workflow === ticket) {
      // Mark the external effect uncertain BEFORE checkout can be initiated. Never retry blindly.
      checkpoint = { ...checkpoint, phase: "ticket-unreconciled" }
      const marked = await e2eCheckpointSave(root.data.directory, checkpoint)
      if (!marked.success) {
        console.error(marked.errorMessage)
        return 1
      }
    }
    console.log(`Running ${workflow.name} E2E against ${target.data.baseUrl}`)
    try {
      const exitCode = await (input.commandRun ?? e2eWorkflowSpawn)(workflow, childEnvironment)
      if (exitCode === 0) continue
      console.error(`${workflow.name} E2E failed (exit ${exitCode}); subsequent workflows were not started`)
      return 1
    } catch {
      console.error(`${workflow.name} E2E could not complete; subsequent workflows were not started`)
      return 1
    }
  }
  console.error(
    `Browser workflows passed, but owned ticket resources have not been cleaned. Checkpoint ${checkpoint.runId} retained; rollout incomplete.`,
  )
  return 1
}

async function e2eWorkflowSpawn(workflow: Workflow, environment: Record<string, string>): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn("bunx", ["rstest", "run", "--config", workflow.config], {
      env: environment,
      stdio: "inherit",
    })
    child.once("error", reject)
    child.once("close", (code) => resolve(code ?? 1))
  })
}
