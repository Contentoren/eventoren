import { spawn } from "node:child_process"
import { lstat, unlink } from "node:fs/promises"
import { join } from "node:path"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../convex/_generated/api.js"
import { e2eCatalogCleanupScan } from "../catalog/e2eCatalogCleanupScan.ts"
import { e2eCheckpointLoad } from "../checkpoint/e2eCheckpointLoad.ts"
import { e2eCheckpointRootResolve } from "../checkpoint/e2eCheckpointRootResolve.ts"
import { e2eCheckpointSave } from "../checkpoint/e2eCheckpointSave.ts"
import type { E2eCheckpoint } from "../checkpoint/e2eCheckpointSchema.ts"
import { e2eInvocationCleanupSessionCreate } from "../auth/e2eInvocationCleanupSessionCreate.ts"
import type { ticketE2eImapCleanupScan } from "../mail/ticketE2eImapCleanupScan.ts"
import type { e2eStripeCleanupScan } from "../stripe/e2eStripeCleanupScan.ts"
import { e2eStripeHistoricalConfigResolve } from "../stripe/e2eStripeHistoricalConfigResolve.ts"
import { e2eStripeTicketReconcile } from "../stripe/e2eStripeTicketReconcile.ts"
import { e2eCleanupConvexUrlResolve } from "./e2eCleanupConvexUrlResolve.ts"
import { e2eEnvironmentLoad } from "./e2eEnvironmentLoad.ts"
import { e2eEnvironmentRead } from "./e2eEnvironmentRead.ts"
import { e2eInvocationLockAcquire } from "./e2eInvocationLockAcquire.ts"
import { e2eSuccessCleanupRun } from "./e2eSuccessCleanupRun.ts"
import { e2eTicketTargetCheck } from "./e2eTicketTargetCheck.ts"
import { e2eTraceCleanup } from "./e2eTraceCleanup.ts"

type Workflow = { name: string; config: string }
const sso: Workflow = { name: "SSO", config: "e2e/rstest.config.ts" }
const nativeAuth: Workflow = { name: "native auth HTTP", config: "e2e/native-auth-rstest.config.ts" }
const nativeAuthLifecycle: Workflow = {
  name: "native auth lifecycle",
  config: "e2e/native-auth-lifecycle-rstest.config.ts",
}
const ticket: Workflow = { name: "ticket purchase", config: "e2e/ticket-rstest.config.ts" }

/** Refuse unsafe targets before the first browser opens; never substitute preview for production. */
export async function e2eInvocationRun(
  input: {
    target?: string
    environment?: Record<string, string | undefined>
    checkpointDirectory?: string
    commandRun?: (workflow: Workflow, environment: Record<string, string>) => Promise<number>
    catalogCleanup?: Parameters<typeof e2eCatalogCleanupScan>[0]["cleanup"]
    catalogHistoricalCleanup?: Parameters<typeof e2eSuccessCleanupRun>[0]["catalogHistoricalCleanup"]
    orphanHistoricalCleanup?: Parameters<typeof e2eSuccessCleanupRun>[0]["orphanHistoricalCleanup"]
    catalogHistoricalDiscovery?: Parameters<typeof e2eSuccessCleanupRun>[0]["catalogHistoricalDiscovery"]
    orphanHistoricalDiscovery?: Parameters<typeof e2eSuccessCleanupRun>[0]["orphanHistoricalDiscovery"]
    snapshotHistoricalDiscovery?: Parameters<typeof e2eSuccessCleanupRun>[0]["snapshotHistoricalDiscovery"]
    snapshotHistoricalCleanup?: Parameters<typeof e2eSuccessCleanupRun>[0]["snapshotHistoricalCleanup"]
    snapshotExportVerify?: Parameters<typeof e2eSuccessCleanupRun>[0]["snapshotExportVerify"]
    historicalStripeCleanup?: Parameters<typeof e2eSuccessCleanupRun>[0]["historicalStripeCleanup"]
    historicalStripeVerify?: Parameters<typeof e2eSuccessCleanupRun>[0]["historicalStripeVerify"]
    historicalMailCleanup?: Parameters<typeof e2eSuccessCleanupRun>[0]["historicalMailCleanup"]
    historicalMailVerify?: Parameters<typeof e2eSuccessCleanupRun>[0]["historicalMailVerify"]
    historicalMailSearch?: Parameters<typeof e2eSuccessCleanupRun>[0]["historicalMailSearch"]
    authSessionDiscovery?: Parameters<typeof e2eSuccessCleanupRun>[0]["authSessionDiscovery"]
    authSessionCleanup?: Parameters<typeof e2eSuccessCleanupRun>[0]["authSessionCleanup"]
    authSessionMark?: Parameters<typeof e2eSuccessCleanupRun>[0]["authSessionMark"]
    customerExclusive?: Parameters<typeof e2eSuccessCleanupRun>[0]["customerExclusive"]
    cleanupSessionCreate?: typeof e2eInvocationCleanupSessionCreate
    historicalStripeConfigResolve?: typeof e2eStripeHistoricalConfigResolve
    mailCleanup?: Parameters<typeof ticketE2eImapCleanupScan>[0]["remove"]
    stripeReconcile?: typeof e2eStripeTicketReconcile
    stripeOrderProof?: Parameters<typeof e2eStripeTicketReconcile>[0]["orderProof"]
    stripeClient?: Parameters<typeof e2eStripeTicketReconcile>[0]["stripe"]
    traceCleanup?: typeof e2eTraceCleanup
  } = {},
): Promise<number> {
  if (!input.environment) e2eEnvironmentLoad()
  const environment: Record<string, string | undefined> = {
    ...(input.environment ?? process.env),
    E2E_TARGET: input.target ?? "production",
  }
  const target = e2eEnvironmentRead(environment)
  if (!target.success) {
    console.error(target.errorMessage)
    return 1
  }
  const root = await e2eCheckpointRootResolve({
    target: target.data.target,
    baseUrl: target.data.baseUrl,
    directory: input.checkpointDirectory,
    environment,
  })
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
    const production = target.data.target === "production"
    const selected = production
      ? [sso, nativeAuth, nativeAuthLifecycle]
      : [sso, nativeAuth, nativeAuthLifecycle, ticket]
    const selectedNames = selected.map((workflow) => workflow.name) as unknown as E2eCheckpoint["selectedWorkflows"]
    // Production runs only the SSO, public-cache/native-auth, and exact-owned-draft
    // lifecycle workflows. Never start a paid fixture under live Stripe; development
    // additionally keeps its ticket-target check. Never switch payment mode.
    if (!production) {
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
    let checkpoint: E2eCheckpoint =
      stored.data ??
      ({
        version: 1,
        target: target.data.target,
        baseUrl: target.data.baseUrl as E2eCheckpoint["baseUrl"],
        runId: root.data.retainedRunId ?? `${Date.now().toString(36)}-${crypto.randomUUID()}`,
        createdAt: Date.now(),
        phase: "sso",
        selectedWorkflows: selectedNames,
        completedWorkflows: [],
      } as E2eCheckpoint)
    if (!checkpoint.selectedWorkflows) {
      // Legacy checkpoint without an ordered barrier reruns every selected step.
      checkpoint = { ...checkpoint, selectedWorkflows: selectedNames, completedWorkflows: [] }
    }
    if (JSON.stringify(checkpoint.selectedWorkflows) !== JSON.stringify(selectedNames)) {
      console.error(
        `Checkpoint ${checkpoint.runId} selected ${JSON.stringify(checkpoint.selectedWorkflows)} does not match the ${target.data.target} invocation; reconcile it manually`,
      )
      return 1
    }
    if (checkpoint.phase === "ticket-unreconciled" && !checkpoint.ticket) {
      console.error(
        `Ticket attempt ${checkpoint.runId} requires app, Stripe TEST, mail and PDF reconciliation before another run; checkpoint retained at ${root.data.directory}`,
      )
      return 1
    }
    // Uncertain ticket writes stay blocked before any child runs, except the
    // event, product, checkout and payment steps: their exact-marker proofs live in
    // the ticket child (ticketPurchaseEventStep, ticketPurchaseProductStep,
    // the checkout read-only proof in ticketPurchaseCheckoutStep and the
    // started-payment read-only proof in ticketPurchasePaymentStep), which
    // adopts a proven existing own row/session or creates once on positively
    // authorized absence with the same run intent. A proven open/unpaid
    // payment with no intent retries the SAME hosted session URL; paid
    // adopts success; every other payment state retains. Other
    // payment-adjacent started steps still require their existing Stripe proof
    // and reconcile separately. Publication/checkin stay blocked until their
    // appropriate proof lands.
    if (checkpoint.ticket?.status === "started" && ["publication", "checkin"].includes(checkpoint.ticket.step)) {
      console.error(
        `Ticket ${checkpoint.ticket.step} for ${checkpoint.runId} has uncertain external effects; reconcile before rerunning`,
      )
      return 1
    }
    // A failed SSO attempt retains its run: zero completed workflows does not
    // prove the Zitadel callback created no provider app session (the SSO
    // child marks a fresh session via e2eAuthSessionMark before its
    // assertions run). Aged zero-progress SSO checkpoints are therefore
    // resumed/reconciled under the same runId, never expired automatically.
    // Explicit manual clearing stays available via e2eCheckpointSsoClear only
    // with proven-owned same-run evidence.
    if (!checkpoint.completedWorkflows) checkpoint = { ...checkpoint, completedWorkflows: [] }
    const initial = await e2eCheckpointSave(root.data.directory, checkpoint)
    if (!initial.success) {
      console.error(initial.errorMessage)
      return 1
    }

    const completed: string[] = [...(checkpoint.completedWorkflows ?? [])]
    const resumeCleanupOnly =
      completed.length === selected.length &&
      JSON.stringify(completed) === JSON.stringify(selectedNames) &&
      (checkpoint.cleanupPhase === "pending" || checkpoint.cleanupPhase === "failed")

    const {
      E2E_STRIPE_TEST_SECRET_KEY: _strippedTestKey,
      E2E_STRIPE_TEST_ACCOUNT_ID: _strippedTestAccount,
      E2E_BILLING_ORGANIZATION_ID: _strippedTestOrg,
      ...nonSecretEnvironment
    } = environment
    void _strippedTestKey
    void _strippedTestAccount
    void _strippedTestOrg
    const childEnvironment = {
      ...nonSecretEnvironment,
      E2E_BASE_URL: target.data.baseUrl,
      E2E_RUN_ID: checkpoint.runId,
      E2E_CHECKPOINT_DIRECTORY: root.data.directory,
      E2E_INVOCATION_PID: String(process.pid),
    } as Record<string, string>
    const convexUrl = e2eCleanupConvexUrlResolve(environment, target.data.target)
    if (convexUrl) childEnvironment.E2E_CLEANUP_CONVEX_URL = convexUrl
    // Validated DEV ticket TEST config, resolved lazily only before the first
    // unfinished ticket child and reused for the whole-success historical phase.
    // SSO/HTTP/lifecycle children never receive TEST credentials; production
    // never resolves a ticket config.
    let cachedTicketStripeConfig: { key: string; accountId: string; organizationId: string } | undefined

    if (!resumeCleanupOnly) {
      if (checkpoint.cleanupPhase === "pending" || checkpoint.cleanupPhase === "failed") {
        console.error(
          `Checkpoint ${checkpoint.runId} has a persisted cleanup phase without complete workflow evidence; reconcile it manually`,
        )
        return 1
      }
      for (const workflow of selected) {
        if (completed.includes(workflow.name)) {
          console.log(`Skipping completed ${workflow.name} E2E for run ${checkpoint.runId}`)
          continue
        }
        if (completed.length > 0) {
          const expected = selected.slice(0, completed.length).map((entry) => entry.name)
          if (JSON.stringify(completed) !== JSON.stringify(expected)) {
            console.error(`Checkpoint ${checkpoint.runId} completion is not an ordered prefix; reconcile it manually`)
            return 1
          }
        }
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
        let workflowEnvironment = childEnvironment
        if (workflow === ticket && !workflowEnvironment.E2E_CLEANUP_CONVEX_URL && convexUrl) {
          // Forward the canonical invocation backend key to the ticket child
          // when the shared child environment does not already carry it. The
          // child binds its reconciliation to this explicit pair and refuses
          // foreign/missing backends before any query; ambient VITE URLs are
          // never consulted there.
          workflowEnvironment = { ...childEnvironment, E2E_CLEANUP_CONVEX_URL: convexUrl }
        }
        if (workflow === ticket && !production) {
          // Resolve the validated TEST config only when the first unfinished DEV
          // ticket child is about to execute, using the existing helper with the
          // same target config. The raw key stays in the isolated private child
          // env only (never argv/file/stdout/logs); SSO/HTTP/lifecycle children
          // never receive it. A resolve failure retains the checkpoint with no
          // provider cleanup. The validated config is cached in memory for the
          // whole-success historical phase. Underlying account mode is always
          // TEST; never fall back to a LIVE key.
          if (!cachedTicketStripeConfig) {
            const ticketConfigResolve =
              input.historicalStripeConfigResolve ??
              (input.historicalStripeCleanup && input.historicalStripeVerify
                ? undefined
                : e2eStripeHistoricalConfigResolve)
            if (ticketConfigResolve) {
              const resolved = await ticketConfigResolve({ target: target.data.target, environment })
              if (!resolved.success) {
                console.error(`${resolved.errorMessage}; checkpoint ${checkpoint.runId} retained with no cleanup`)
                return 1
              }
              cachedTicketStripeConfig = resolved.data
            }
          }
          if (cachedTicketStripeConfig) {
            workflowEnvironment = {
              ...childEnvironment,
              E2E_STRIPE_TEST_SECRET_KEY: cachedTicketStripeConfig.key,
              E2E_STRIPE_TEST_ACCOUNT_ID: cachedTicketStripeConfig.accountId,
              E2E_BILLING_ORGANIZATION_ID: cachedTicketStripeConfig.organizationId,
            }
          }
        }
        let exitCode: number
        try {
          exitCode = await (input.commandRun ?? e2eWorkflowSpawn)(workflow, workflowEnvironment)
        } catch {
          console.error(`${workflow.name} E2E could not complete; subsequent workflows were not started`)
          return 1
        }
        if (exitCode !== 0) {
          // Failure retains fixtures and the ordered completion prefix; no provider cleanup.
          console.error(`${workflow.name} E2E failed (exit ${exitCode}); subsequent workflows were not started`)
          return 1
        }
        if (workflow === ticket) {
          const reloaded = await e2eCheckpointLoad(root.data.directory, target.data)
          if (!reloaded.success) {
            console.error(reloaded.errorMessage)
            return 1
          }
          const ticketCheckpoint = reloaded.data
          if (
            !ticketCheckpoint?.ticket ||
            ticketCheckpoint.ticket.step !== "done" ||
            ticketCheckpoint.ticket.status !== "completed"
          ) {
            console.error(
              `Ticket purchase exited 0 without done evidence; checkpoint ${checkpoint.runId} retained with no cleanup`,
            )
            return 1
          }
          checkpoint = ticketCheckpoint
        }
        completed.push(workflow.name)
        checkpoint = {
          ...checkpoint,
          completedWorkflows: [...completed] as unknown as E2eCheckpoint["completedWorkflows"],
        } as E2eCheckpoint
        const saved = await e2eCheckpointSave(root.data.directory, checkpoint)
        if (!saved.success) {
          console.error(saved.errorMessage)
          return 1
        }
      }
    } else {
      const reloaded = await e2eCheckpointLoad(root.data.directory, target.data)
      if (!reloaded.success) {
        console.error(reloaded.errorMessage)
        return 1
      }
      if (!reloaded.data) {
        console.error(`Cleanup retry found no checkpoint for ${checkpoint.runId}; reconcile it manually`)
        return 1
      }
      checkpoint = reloaded.data
      console.log(`Resuming cleanup for completed run ${checkpoint.runId} without rerunning verified workflows`)
    }

    if (
      checkpoint.selectedWorkflows?.includes("ticket purchase") &&
      !(checkpoint.ticket && checkpoint.ticket.step === "done" && checkpoint.ticket.status === "completed")
    ) {
      console.error(
        `Browser workflows passed, but owned ticket resources have not reached done. Checkpoint ${checkpoint.runId} retained; rollout incomplete.`,
      )
      return 1
    }

    checkpoint = { ...checkpoint, cleanupPhase: "pending" } as E2eCheckpoint
    const pending = await e2eCheckpointSave(root.data.directory, checkpoint)
    if (!pending.success) {
      console.error(pending.errorMessage)
      return 1
    }

    const cleanupConvexUrl = environment["E2E_CLEANUP_CONVEX_URL"] ?? convexUrl
    // Resolve the cleanup admin token behind the complete-invocation success
    // barrier only. An explicit E2E_CLEANUP_ADMIN_TOKEN is verified as live
    // admin and returned unmarked (never adopted); otherwise fresh testadmin
    // credentials drive a new SSO browser login that is verified and marked
    // for the same outer run (digest/session evidence only, token in memory).
    // Failed workflows never reach this seam. A resolve failure retains the
    // checkpoint/business fixtures with a redacted error; never log the token.
    const sessionCreate = input.cleanupSessionCreate ?? e2eInvocationCleanupSessionCreate
    let cleanupSession: Awaited<ReturnType<typeof e2eInvocationCleanupSessionCreate>>
    try {
      cleanupSession = await sessionCreate({
        targetBaseUrl: checkpoint.baseUrl,
        convexUrl: cleanupConvexUrl ?? "",
        runId: checkpoint.runId,
        env: { ...environment, E2E_CHECKPOINT_DIRECTORY: root.data.directory },
      })
    } catch {
      cleanupSession = {
        success: false as const,
        op: "e2eInvocationCleanupSessionCreate",
        errorMessage: "Cleanup admin session unavailable; server session retained",
      }
    }
    if (!cleanupSession.success) {
      checkpoint = { ...checkpoint, cleanupPhase: "failed" } as E2eCheckpoint
      const retained = await e2eCheckpointSave(root.data.directory, checkpoint)
      if (!retained.success) console.error(retained.errorMessage)
      console.error(`${cleanupSession.errorMessage}; checkpoint ${checkpoint.runId} retained for cleanup retry`)
      return 1
    }
    const adminToken = cleanupSession.data.token
    // Default historical Stripe TEST credentials resolve behind the
    // whole-selected success barrier only: an injected config seam is honored
    // exactly, caller-mocked historical providers keep their explicit
    // environment (offline fixture seams, no service reads), and real runs
    // resolve explicit E2E_TEST credentials or the registered Billing TEST
    // default with a read-only TEST account check. Failed workflows never
    // reach this seam, so no secret or provider HTTP call happens before
    // success; production still never starts a paid fixture and the resolved
    // key stays in process only (never logged; only the isolated DEV ticket
    // child receives it via its private env where explicitly required).
    // A validated DEV ticket config cached in memory is reused here without a
    // second resolve.
    const stripeConfigResolve =
      input.historicalStripeConfigResolve ??
      (input.historicalStripeCleanup && input.historicalStripeVerify ? undefined : e2eStripeHistoricalConfigResolve)
    let stripeKey = environment["E2E_STRIPE_TEST_SECRET_KEY"]
    let stripeAccountId = environment["E2E_STRIPE_TEST_ACCOUNT_ID"]
    let stripeOrganizationId = environment["E2E_BILLING_ORGANIZATION_ID"]
    if (cachedTicketStripeConfig) {
      stripeKey = cachedTicketStripeConfig.key
      stripeAccountId = cachedTicketStripeConfig.accountId
      stripeOrganizationId = cachedTicketStripeConfig.organizationId
    } else if (stripeConfigResolve) {
      const resolved = await stripeConfigResolve({ target: target.data.target, environment })
      if (!resolved.success) {
        checkpoint = { ...checkpoint, cleanupPhase: "failed" } as E2eCheckpoint
        const retained = await e2eCheckpointSave(root.data.directory, checkpoint)
        if (!retained.success) console.error(retained.errorMessage)
        console.error(`${resolved.errorMessage}; checkpoint ${checkpoint.runId} retained for cleanup retry`)
        return 1
      }
      stripeKey = resolved.data.key
      stripeAccountId = resolved.data.accountId
      stripeOrganizationId = resolved.data.organizationId
    }
    const stripeOrderProof: Parameters<typeof e2eStripeTicketReconcile>[0]["orderProof"] =
      input.stripeOrderProof ??
      (async (orderId, eventKey, runId, runCreatedAt) => {
        if (!cleanupConvexUrl || !adminToken)
          return { success: false, errorMessage: "Missing app order verification credentials" }
        const client = new ConvexHttpClient(cleanupConvexUrl)
        return client.query(api.ticketing.ticketE2eOrderProofQuery, {
          token: adminToken,
          orderId,
          eventKey,
          runId,
          runCreatedAt,
        })
      })
    const mailHost = environment["TEST_CUSTOMER_MAILCOW_HOST"]?.trim()
    const mailUser = environment["TEST_CUSTOMER_MAILCOW_USER"]?.trim()
    const mailPassword = environment["TEST_CUSTOMER_MAILCOW_PASS"]
    const mailPort = Number(environment["TEST_CUSTOMER_MAILCOW_IMAP_PORT"]?.trim() || "993")
    const mail =
      mailHost && mailUser && mailPassword
        ? { host: mailHost, user: mailUser, password: mailPassword, port: mailPort }
        : undefined

    const cleaned = await e2eSuccessCleanupRun({
      directory: root.data.directory,
      target: target.data,
      convexUrl: cleanupConvexUrl,
      adminToken,
      catalogCleanup: input.catalogCleanup,
      catalogHistoricalCleanup: input.catalogHistoricalCleanup,
      orphanHistoricalCleanup: input.orphanHistoricalCleanup,
      catalogHistoricalDiscovery: input.catalogHistoricalDiscovery,
      orphanHistoricalDiscovery: input.orphanHistoricalDiscovery,
      snapshotHistoricalDiscovery: input.snapshotHistoricalDiscovery,
      snapshotHistoricalCleanup: input.snapshotHistoricalCleanup,
      snapshotExportVerify: input.snapshotExportVerify,
      historicalStripeCleanup: input.historicalStripeCleanup,
      historicalStripeVerify: input.historicalStripeVerify,
      historicalMailCleanup: input.historicalMailCleanup,
      historicalMailVerify: input.historicalMailVerify,
      historicalMailSearch: input.historicalMailSearch,
      authSessionDiscovery: input.authSessionDiscovery,
      authSessionCleanup: input.authSessionCleanup,
      authSessionMark: input.authSessionMark,
      customerExclusive: input.customerExclusive,
      stripeReconcile: input.stripeReconcile,
      stripeOrderProof,
      stripeClient: input.stripeClient,
      stripeKey,
      stripeAccountId,
      stripeOrganizationId,
      mail,
      mailCleanup: input.mailCleanup,
    })
    if (!cleaned.success) {
      checkpoint = { ...checkpoint, cleanupPhase: "failed" } as E2eCheckpoint
      const retained = await e2eCheckpointSave(root.data.directory, checkpoint)
      if (!retained.success) console.error(retained.errorMessage)
      console.error(`${cleaned.errorMessage}; checkpoint ${checkpoint.runId} retained for cleanup retry`)
      return 1
    }
    console.log(`Selected E2E succeeded and owned fixtures verified absent for run ${checkpoint.runId}`, cleaned.data)
    try {
      await unlink(join(root.data.directory, "checkpoint.json"))
    } catch {
      console.error(`Cleanup verified but checkpoint ${checkpoint.runId} could not be removed; reconcile it manually`)
      return 1
    }
    return 0
  } finally {
    // Trace sweep is local-only; fixture/provider cleanup runs only behind the success barrier above.
    try {
      const traces = await (input.traceCleanup ?? e2eTraceCleanup)()
      if (!traces.success) console.error(`Playwright trace cleanup failed: ${traces.errorMessage}`)
      else if (traces.removed?.length)
        console.log(`Expired Playwright trace directories removed: ${traces.removed.join(", ")}`)
    } catch (error) {
      console.error("Playwright trace cleanup failed", error)
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
