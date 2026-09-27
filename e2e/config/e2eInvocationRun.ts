import { spawn } from "node:child_process"
import { lstat, unlink } from "node:fs/promises"
import { join } from "node:path"
import { e2eCheckpointLoad } from "../checkpoint/e2eCheckpointLoad.ts"
import { e2eCheckpointRootResolve } from "../checkpoint/e2eCheckpointRootResolve.ts"
import { e2eCheckpointSave } from "../checkpoint/e2eCheckpointSave.ts"
import { e2eCheckpointSsoClear } from "../checkpoint/e2eCheckpointSsoClear.ts"
import type { E2eCheckpoint } from "../checkpoint/e2eCheckpointSchema.ts"
import { e2eCatalogCleanupScan } from "../catalog/e2eCatalogCleanupScan.ts"
import { e2eCatalogCleanupRun } from "../catalog/e2eCatalogCleanupRun.ts"
import { ticketE2eImapCleanupScan } from "../mail/ticketE2eImapCleanupScan.ts"
import { e2eStripeCleanupScan } from "../stripe/e2eStripeCleanupScan.ts"
import { e2eStripeTicketReconcile } from "../stripe/e2eStripeTicketReconcile.ts"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../convex/_generated/api.js"
import { e2eEnvironmentLoad } from "./e2eEnvironmentLoad.ts"
import { e2eEnvironmentRead } from "./e2eEnvironmentRead.ts"
import { e2eInvocationLockAcquire } from "./e2eInvocationLockAcquire.ts"
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
    catalogCleanup?: Parameters<typeof e2eCatalogCleanupScan>[0]["cleanup"]
    mailCleanup?: Parameters<typeof ticketE2eImapCleanupScan>[0]["remove"]
    stripeReconcile?: typeof e2eStripeTicketReconcile
    stripeOrderProof?: Parameters<typeof e2eStripeTicketReconcile>[0]["orderProof"]
    stripeClient?: Parameters<typeof e2eStripeTicketReconcile>[0]["stripe"]
  } = {},
): Promise<number> {
  if (!input.environment) e2eEnvironmentLoad()
  const environment = { ...(input.environment ?? process.env), E2E_TARGET: input.target ?? "production" }
  const target = e2eEnvironmentRead(environment)
  if (!target.success) {
    console.error(target.errorMessage)
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
  const acquired = await e2eInvocationLockAcquire(root.data.directory)
  if (!acquired.success) {
    console.error(acquired.errorMessage)
    return 1
  }
  try {
    // Older ticket children used their own lock. Never silently replace that uncertain attempt.
    try {
      await lstat(join(root.data.directory, "ticket.lock"))
      console.error("Legacy ticket lock exists; reconcile it manually before starting another invocation")
      return 1
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Cannot safely inspect legacy ticket lock; reconcile it manually")
        return 1
      }
    }
    const ssoOnly = target.data.target === "production"
    // Production runs are deliberately read-only SSO smoke tests. Development keeps
    // the existing combined workflow and its explicit ticket-target check.
    if (!ssoOnly) {
      const ticketSafety = e2eTicketTargetCheck(target.data.target)
      if (!ticketSafety.success) {
        console.error(ticketSafety.errorMessage)
        return 1
      }
    }
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
    if (checkpoint.phase === "ticket-unreconciled" && !checkpoint.ticket) {
      console.error(
        `Ticket attempt ${checkpoint.runId} requires app, Stripe TEST, mail and PDF reconciliation before another run; checkpoint retained at ${root.data.directory}`,
      )
      return 1
    }
    if (
      checkpoint.ticket?.status === "started" &&
      ["event", "product", "publication", "checkout", "payment", "checkin"].includes(checkpoint.ticket.step)
    ) {
      console.error(
        `Ticket ${checkpoint.ticket.step} for ${checkpoint.runId} has uncertain external effects; reconcile before rerunning`,
      )
      return 1
    }
    if (checkpoint.phase === "sso" && Date.now() - checkpoint.createdAt > 24 * 60 * 60_000) {
      // Ticket resources, including old read-only assertions, are never aged out automatically.
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
      E2E_INVOCATION_PID: String(process.pid),
    } as Record<string, string>
    for (const workflow of ssoOnly ? [sso] : [sso, ticket]) {
      if (workflow === ticket && checkpoint.phase === "sso") {
        // The suite records individual effects before performing them. A legacy checkpoint without step evidence stays blocked.
        checkpoint = {
          ...checkpoint,
          phase: "ticket-unreconciled",
          ticket: {
            step: "ready",
            status: "completed",
            eventKey: `ticket-e2e-${checkpoint.runId}`,
            eventTitle: `Ticket E2E ${checkpoint.runId}`,
            participantName: `E2E Participant ${checkpoint.runId}`,
            mailSince: Date.now(),
          },
        }
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
    if (ssoOnly) return 0
    console.error(
      `Browser workflows passed, but owned ticket resources have not been cleaned. Checkpoint ${checkpoint.runId} retained; rollout incomplete.`,
    )
    return 1
  } finally {
    if (target.data.target !== "production") {
      try {
        const convexUrl = environment.E2E_CLEANUP_CONVEX_URL
        const adminToken = environment.E2E_CLEANUP_ADMIN_TOKEN
        const orderProof: Parameters<typeof e2eStripeTicketReconcile>[0]["orderProof"] =
          input.stripeOrderProof ??
          (async (orderId, eventKey, runId, runCreatedAt) => {
            if (!convexUrl || !adminToken)
              return { success: false, errorMessage: "Missing app order verification credentials" }
            const client = new ConvexHttpClient(convexUrl)
            return client.query(api.ticketing.ticketE2eOrderProofQuery, {
              token: adminToken,
              orderId,
              eventKey,
              runId,
              runCreatedAt,
            })
          })
        const stripe = await e2eStripeCleanupScan({
          directory: root.data.directory,
          target: target.data,
          reconcile: input.stripeReconcile ?? e2eStripeTicketReconcile,
          config:
            environment.E2E_STRIPE_TEST_SECRET_KEY &&
            environment.E2E_STRIPE_TEST_ACCOUNT_ID &&
            environment.E2E_BILLING_ORGANIZATION_ID
              ? {
                  key: environment.E2E_STRIPE_TEST_SECRET_KEY,
                  accountId: environment.E2E_STRIPE_TEST_ACCOUNT_ID,
                  organizationId: environment.E2E_BILLING_ORGANIZATION_ID,
                  orderProof,
                  stripe: input.stripeClient,
                }
              : undefined,
        })
        if (!stripe.success)
          console.error(`Owned Stripe TEST cleanup unresolved: ${stripe.errorMessage}; checkpoint retained`)
        else if (stripe.data.status === "stripe-reconciled-checkpoint-retained")
          console.log(
            "Exact Stripe TEST checkout reconciled; charges/invoices retained; checkpoint retained",
            stripe.data,
          )
      } catch {
        console.error("Owned Stripe TEST cleanup failed; checkpoint retained")
      }
      try {
        const host = environment.TEST_CUSTOMER_MAILCOW_HOST?.trim()
        const user = environment.TEST_CUSTOMER_MAILCOW_USER?.trim()
        const password = environment.TEST_CUSTOMER_MAILCOW_PASS
        const port = Number(environment.TEST_CUSTOMER_MAILCOW_IMAP_PORT?.trim() || "993")
        const mail = host && user && password ? { host, user, password, port } : undefined
        const result = await ticketE2eImapCleanupScan({
          directory: root.data.directory,
          target: target.data,
          mail,
          remove: input.mailCleanup,
        })
        if (!result.success) console.error(`Owned IMAP cleanup unresolved: ${result.errorMessage}; checkpoint retained`)
        else if (result.data.status === "verified-deleted" || result.data.status === "verified-absent")
          console.log(`Exact IMAP confirmation ${result.data.status}; Resend's immutable copy retained`)
      } catch {
        console.error("Owned IMAP cleanup failed; checkpoint retained")
      }
      // Scan under the same lock on *every* exit, including interrupted/failed workflows.
      // No credentials means no mutation; never confuse archival with provider cleanup.
      try {
        const cleanup = input.catalogCleanup
          ? await e2eCatalogCleanupScan({
              directory: root.data.directory,
              target: target.data,
              cleanup: input.catalogCleanup,
            })
          : environment.E2E_CLEANUP_ADMIN_TOKEN && environment.E2E_CLEANUP_CONVEX_URL
            ? await e2eCatalogCleanupRun({
                directory: root.data.directory,
                target: target.data,
                convexUrl: environment.E2E_CLEANUP_CONVEX_URL,
                adminToken: environment.E2E_CLEANUP_ADMIN_TOKEN,
              })
            : await e2eCatalogCleanupScan({
                directory: root.data.directory,
                target: target.data,
                cleanup: async () => ({
                  success: false,
                  errorMessage: "Missing explicit E2E cleanup admin token/Convex URL",
                }),
              })
        if (!cleanup.success)
          console.error(`Owned catalog cleanup unresolved: ${cleanup.errorMessage}; checkpoint retained`)
        else if (cleanup.data.status === "catalog-archived-checkpoint-retained")
          console.log(
            "Exact run catalog archived; paid history and external provider artifacts remain retained",
            cleanup.data.verification,
          )
      } catch (error) {
        console.error("Owned catalog cleanup failed; checkpoint retained", error)
      }
    }
    try {
      await unlink(join(root.data.directory, "invocation.lock"))
    } catch {
      console.error("Unable to remove invocation lock; reconcile it manually before retrying")
    }
    await acquired.data.close()
  }
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
