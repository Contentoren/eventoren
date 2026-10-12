import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "@rstest/core"
import { createResult } from "#result"
import { e2eCheckpointLoad } from "../checkpoint/e2eCheckpointLoad.ts"
import { e2eCheckpointSave } from "../checkpoint/e2eCheckpointSave.ts"
import type { E2eCheckpoint } from "../checkpoint/e2eCheckpointSchema.ts"
import { e2eInvocationRun } from "./e2eInvocationRun.ts"

async function ticketProgressToDone(directory: string, target: Pick<E2eCheckpoint, "target" | "baseUrl">) {
  const steps = [
    "event",
    "product",
    "publication",
    "checkout",
    "payment",
    "delivery",
    "pdf",
    "access",
    "checkin",
    "duplicate",
    "done",
  ] as const
  for (const step of steps) {
    const loaded = await e2eCheckpointLoad(directory, target)
    if (!loaded.success || !loaded.data?.ticket) throw new Error(`Cannot progress ticket to ${step}`)
    const ticket = loaded.data.ticket
    const next: E2eCheckpoint = {
      ...loaded.data,
      ticket: {
        ...ticket,
        step,
        status: "completed",
        eventId: `ticket-e2e-${loaded.data.runId}`,
        productId: "paid-ticket",
        orderId: "order-1",
        ticketId: "ticket-1",
        stripeSession: "cs_test_123456789",
        mailUid: 501,
        mailUidValidity: "42",
      },
    }
    const saved = await e2eCheckpointSave(directory, next)
    if (!saved.success) throw new Error(`Cannot save ticket ${step}: ${saved.errorMessage}`)
  }
}

function mockStripeReconcile() {
  return async () =>
    createResult({
      status: "stripe-reconciled-checkpoint-retained" as const,
      session: "cs_test_123456789",
      customer: "retained",
      subscriptionsCanceled: 0,
      chargesRetained: 0,
      invoicesRetained: 0,
      paymentIntentsRetained: 0,
    })
}

function mockCleanupSessionCreate(token = "admin-token") {
  return async () =>
    createResult({
      token,
      sessionId: "sess_mock",
      owned: false as const,
      tokenDigest: `digest-${token}`,
    })
}

function invocationDiscoveryMocks() {
  return {
    catalogHistoricalDiscovery: async () => ({
      success: true as const,
      data: { isDone: true, continueCursor: null, candidates: [], scannedEvents: 0 },
    }),
    orphanHistoricalDiscovery: async () => ({
      success: true as const,
      data: { isDone: true, continueCursor: null, candidates: [], scannedEvents: 0, scannedOrders: 0 },
    }),
    snapshotHistoricalDiscovery: async () => ({
      success: true as const,
      data: { isDone: true, continueCursor: null, candidates: [], scannedSnapshots: 0, activeVersion: 0 },
    }),
    snapshotHistoricalCleanup: async () => ({
      success: true as const,
      data: {
        isDone: true,
        continueCursor: null,
        scannedSnapshots: 0,
        activeVersion: 0,
        cleanedVersions: [],
        deletedChunks: 0,
        skippedVersions: [],
      },
    }),
    snapshotExportVerify: async () => ({
      success: true as const,
      data: { status: "snapshot-export-clean" as const },
    }),
    historicalStripeCleanup: async () => ({
      success: true as const,
      data: { status: "stripe-historical-reconciled" as const },
    }),
    historicalMailCleanup: async () => ({
      success: true as const,
      data: { status: "imap-historical-reconciled" as const },
    }),
    historicalStripeVerify: async () => ({
      success: true as const,
      data: { status: "stripe-historical-absent" as const },
    }),
    historicalMailVerify: async () => ({
      success: true as const,
      data: { status: "imap-historical-absent" as const },
    }),
    authSessionDiscovery: async () => ({
      success: true as const,
      data: { isDone: true, continueCursor: null, sessions: [], scannedSessions: 0 },
    }),
    authSessionCleanup: async () => ({
      success: true as const,
      data: { deletedSessionIds: [], deletedCount: 0, callerDeleted: false, remainingMarkedOthers: 0 },
    }),
    authSessionMark: async () => ({ success: false as const, errorMessage: "unexpected mark without owned evidence" }),
  }
}

describe("Eventoren E2E runner", () => {
  it("runs production SSO and native auth with historical cleanup and no ticket purchase", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-test-"))
    const started: { name: string; config: string }[] = []
    let historicalCalls = 0
    let catalogCalls = 0
    let stripeCalls = 0
    try {
      expect(
        await e2eInvocationRun({
          environment: {
            E2E_CLEANUP_CONVEX_URL: "https://example.convex.cloud",
            E2E_CLEANUP_ADMIN_TOKEN: "admin-token",
          },
          checkpointDirectory: directory,
          cleanupSessionCreate: mockCleanupSessionCreate(),
          commandRun: async (workflow) => {
            started.push(workflow)
            return 0
          },
          catalogCleanup: async () => {
            catalogCalls++
            return { success: true }
          },
          catalogHistoricalCleanup: async () => {
            historicalCalls++
            return { success: true, data: { truncated: false, cleaned: [], scannedEvents: 3 } }
          },
          ...invocationDiscoveryMocks(),
          stripeReconcile: async () => {
            stripeCalls++
            return createResult({
              status: "stripe-reconciled-checkpoint-retained" as const,
              session: "cs_test_123456789",
              customer: "retained",
              subscriptionsCanceled: 0,
              chargesRetained: 0,
              invoicesRetained: 0,
              paymentIntentsRetained: 0,
            })
          },
        }),
      ).toBe(0)
      expect(started).toEqual([
        { name: "SSO", config: "e2e/rstest.config.ts" },
        { name: "native auth HTTP", config: "e2e/native-auth-rstest.config.ts" },
        { name: "native auth lifecycle", config: "e2e/native-auth-lifecycle-rstest.config.ts" },
      ])
      // Production never starts a paid fixture and never touches live Stripe.
      expect(started.some((workflow) => workflow.name === "ticket purchase")).toBe(false)
      expect(stripeCalls).toBe(0)
      // Non-purchase success still sweeps historical catalog fixtures.
      expect(historicalCalls).toBe(1)
      expect(catalogCalls).toBe(0)
      await expect(readFile(join(directory, "checkpoint.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("returns failure for a failed production SSO smoke without starting ticket purchase or cleanup", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-test-"))
    const started: string[] = []
    try {
      let tracesSwept = false
      let historicalCalls = 0
      expect(
        await e2eInvocationRun({
          environment: {
            E2E_CLEANUP_CONVEX_URL: "https://example.convex.cloud",
            E2E_CLEANUP_ADMIN_TOKEN: "admin-token",
          },
          checkpointDirectory: directory,
          commandRun: async (workflow) => {
            started.push(workflow.name)
            return 1
          },
          catalogHistoricalCleanup: async () => {
            historicalCalls++
            return { success: true, data: { truncated: false } }
          },
          traceCleanup: async () => {
            tracesSwept = true
            return { success: true, removed: [] }
          },
        }),
      ).toBe(1)
      expect(tracesSwept).toBe(true)
      expect(started).toEqual(["SSO"])
      expect(historicalCalls).toBe(0)
      const checkpoint = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"))
      expect(checkpoint.phase).toBe("sso")
      expect(checkpoint.ticket).toBeUndefined()
      expect(checkpoint.selectedWorkflows).toEqual(["SSO", "native auth HTTP", "native auth lifecycle"])
      expect(checkpoint.completedWorkflows).toEqual([])
      expect(checkpoint.cleanupPhase).toBeUndefined()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("runs preview SSO then ticket, retaining unreconciled effects and resuming at ticket only", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-test-"))
    try {
      const started: string[] = []
      const ticketResolver = (async () =>
        createResult({
          key: "sk_test_mock",
          accountId: "acct_mock",
          organizationId: "org_mock",
        })) as never
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {},
          checkpointDirectory: directory,
          historicalStripeConfigResolve: ticketResolver,
          commandRun: async (workflow, environment) => {
            expect(environment.E2E_BASE_URL).toBe("https://eventoren.leonardomora.de")
            expect(environment.E2E_RUN_ID).toMatch(/^[0-9a-z]+-[0-9a-f-]{36}$/u)
            started.push(workflow.name)
            return 0
          },
        }),
      ).toBe(1)
      expect(started).toEqual(["SSO", "native auth HTTP", "native auth lifecycle", "ticket purchase"])
      const retained = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"))
      expect(retained.phase).toBe("ticket-unreconciled")
      expect(retained.completedWorkflows).toEqual(["SSO", "native auth HTTP", "native auth lifecycle"])
      expect(retained.cleanupPhase).toBeUndefined()
      started.length = 0
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {},
          checkpointDirectory: directory,
          historicalStripeConfigResolve: ticketResolver,
          commandRun: async (workflow) => {
            started.push(workflow.name)
            return 0
          },
        }),
      ).toBe(1)
      // Same-run resume skips verified workflows and retries only the unfinished ticket.
      expect(started).toEqual(["ticket purchase"])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("stops before subsequent workflows when either native auth workflow fails without cleanup", async () => {
    for (const failedWorkflow of ["native auth HTTP", "native auth lifecycle"]) {
      const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-native-auth-failure-"))
      try {
        const started: string[] = []
        let historicalCalls = 0
        expect(
          await e2eInvocationRun({
            target: "development",
            environment: {
              E2E_CLEANUP_CONVEX_URL: "https://example.convex.cloud",
              E2E_CLEANUP_ADMIN_TOKEN: "admin-token",
            },
            checkpointDirectory: directory,
            commandRun: async (workflow) => {
              started.push(workflow.name)
              return workflow.name === failedWorkflow ? 1 : 0
            },
            catalogHistoricalCleanup: async () => {
              historicalCalls++
              return { success: true, data: { truncated: false } }
            },
          }),
        ).toBe(1)
        expect(started).toEqual(
          failedWorkflow === "native auth HTTP"
            ? ["SSO", "native auth HTTP"]
            : ["SSO", "native auth HTTP", "native auth lifecycle"],
        )
        expect(historicalCalls).toBe(0)
        const checkpoint = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"))
        expect(checkpoint.phase).toBe("sso")
        expect(checkpoint.ticket).toBeUndefined()
        expect(checkpoint.completedWorkflows).toEqual(
          failedWorkflow === "native auth HTTP" ? ["SSO"] : ["SSO", "native auth HTTP"],
        )
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    }
  })

  it("resumes the same SSO run after a failure without starting a ticket", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-test-"))
    try {
      const runIds: string[] = []
      for (let attempt = 0; attempt < 2; attempt += 1) {
        expect(
          await e2eInvocationRun({
            target: "development",
            environment: {},
            checkpointDirectory: directory,
            commandRun: async (workflow, environment) => {
              runIds.push(environment.E2E_RUN_ID!)
              expect(workflow.name).toBe("SSO")
              return 1
            },
          }),
        ).toBe(1)
      }
      expect(runIds).toHaveLength(2)
      expect(runIds[0]).toBe(runIds[1]!)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("skips completed workflows on same-run resume and runs no cleanup until the barrier", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-resume-"))
    try {
      const firstStarted: string[] = []
      let historicalCalls = 0
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {
            E2E_CLEANUP_CONVEX_URL: "https://example.convex.cloud",
            E2E_CLEANUP_ADMIN_TOKEN: "admin-token",
          },
          checkpointDirectory: directory,
          cleanupSessionCreate: async () => {
            throw new Error("cleanup session must not resolve before the success barrier")
          },
          commandRun: async (workflow) => {
            firstStarted.push(workflow.name)
            return workflow.name === "native auth lifecycle" ? 1 : 0
          },
          catalogHistoricalCleanup: async () => {
            historicalCalls++
            return { success: true, data: { truncated: false } }
          },
        }),
      ).toBe(1)
      expect(firstStarted).toEqual(["SSO", "native auth HTTP", "native auth lifecycle"])
      expect(historicalCalls).toBe(0)
      const retained = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"))
      expect(retained.completedWorkflows).toEqual(["SSO", "native auth HTTP"])

      const secondStarted: string[] = []
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {
            E2E_CLEANUP_CONVEX_URL: "https://example.convex.cloud",
            E2E_CLEANUP_ADMIN_TOKEN: "admin-token",
            E2E_STRIPE_TEST_SECRET_KEY: "sk_test_mock",
            E2E_STRIPE_TEST_ACCOUNT_ID: "acct_mock",
            E2E_BILLING_ORGANIZATION_ID: "org_mock",
            TEST_CUSTOMER_MAILCOW_HOST: "localhost",
            TEST_CUSTOMER_MAILCOW_USER: "buyer@example.test",
            TEST_CUSTOMER_MAILCOW_PASS: "unused",
          },
          checkpointDirectory: directory,
          cleanupSessionCreate: mockCleanupSessionCreate(),
          commandRun: async (workflow) => {
            secondStarted.push(workflow.name)
            if (workflow.name === "ticket purchase") {
              await ticketProgressToDone(directory, {
                target: "development",
                baseUrl: "https://eventoren.leonardomora.de",
              })
            }
            return 0
          },
          catalogCleanup: async () => ({ success: true, data: { deleted: 1 } }),
          catalogHistoricalCleanup: async () => {
            historicalCalls++
            return { success: true, data: { truncated: false, cleaned: [], scannedEvents: 5 } }
          },
          ...invocationDiscoveryMocks(),
          stripeReconcile: mockStripeReconcile(),
          stripeOrderProof: async () => ({
            success: true,
            data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
          }),
          mailCleanup: async () => ({ success: true, data: { status: "verified-deleted" as const } }),
        }),
      ).toBe(0)
      expect(secondStarted).toEqual(["native auth lifecycle", "ticket purchase"])
      expect(historicalCalls).toBe(1)
      await expect(readFile(join(directory, "checkpoint.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("retries persisted cleanup without rerunning verified workflows after a cleanup failure", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-cleanup-retry-"))
    const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
    try {
      let historicalAttempts = 0
      const runWorkflows = async (workflow: { name: string }, environment: Record<string, string>) => {
        if (workflow.name === "ticket purchase") await ticketProgressToDone(directory, target)
        return 0
      }
      const baseEnvironment = {
        E2E_CLEANUP_CONVEX_URL: "https://example.convex.cloud",
        E2E_CLEANUP_ADMIN_TOKEN: "admin-token",
        E2E_STRIPE_TEST_SECRET_KEY: "sk_test_mock",
        E2E_STRIPE_TEST_ACCOUNT_ID: "acct_mock",
        E2E_BILLING_ORGANIZATION_ID: "org_mock",
        TEST_CUSTOMER_MAILCOW_HOST: "localhost",
        TEST_CUSTOMER_MAILCOW_USER: "buyer@example.test",
        TEST_CUSTOMER_MAILCOW_PASS: "unused",
      }
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: baseEnvironment,
          checkpointDirectory: directory,
          cleanupSessionCreate: mockCleanupSessionCreate(),
          commandRun: runWorkflows,
          catalogCleanup: async () => ({ success: true, data: {} }),
          catalogHistoricalCleanup: async () => {
            historicalAttempts++
            return { success: false, errorMessage: "Historical sweep unavailable" }
          },
          ...invocationDiscoveryMocks(),
          stripeReconcile: mockStripeReconcile(),
          stripeOrderProof: async () => ({
            success: true,
            data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
          }),
          mailCleanup: async () => ({ success: true, data: { status: "verified-deleted" as const } }),
        }),
      ).toBe(1)
      expect(historicalAttempts).toBe(1)
      const retained = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"))
      expect(retained.completedWorkflows).toEqual([
        "SSO",
        "native auth HTTP",
        "native auth lifecycle",
        "ticket purchase",
      ])
      expect(retained.cleanupPhase).toBe("failed")
      expect(retained.ticket.step).toBe("done")

      let reruns = 0
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: baseEnvironment,
          checkpointDirectory: directory,
          cleanupSessionCreate: mockCleanupSessionCreate(),
          commandRun: async () => {
            reruns++
            return 0
          },
          catalogCleanup: async () => ({ success: true, data: {} }),
          catalogHistoricalCleanup: async () => {
            historicalAttempts++
            return { success: true, data: { truncated: false, cleaned: [], scannedEvents: 2 } }
          },
          ...invocationDiscoveryMocks(),
          stripeReconcile: mockStripeReconcile(),
          stripeOrderProof: async () => ({
            success: true,
            data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
          }),
          mailCleanup: async () => ({ success: true, data: { status: "verified-deleted" as const } }),
        }),
      ).toBe(0)
      expect(reruns).toBe(0)
      expect(historicalAttempts).toBe(2)
      await expect(readFile(join(directory, "checkpoint.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("performs no fixture or provider cleanup when a selected workflow fails", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-no-cleanup-"))
    try {
      let catalogCalls = 0
      let historicalCalls = 0
      let stripeCalls = 0
      let mailCalls = 0
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {
            E2E_CLEANUP_CONVEX_URL: "https://example.convex.cloud",
            E2E_CLEANUP_ADMIN_TOKEN: "admin-token",
            E2E_STRIPE_TEST_SECRET_KEY: "sk_test_mock",
            E2E_STRIPE_TEST_ACCOUNT_ID: "acct_mock",
            E2E_BILLING_ORGANIZATION_ID: "org_mock",
            TEST_CUSTOMER_MAILCOW_HOST: "localhost",
            TEST_CUSTOMER_MAILCOW_USER: "buyer@example.test",
            TEST_CUSTOMER_MAILCOW_PASS: "unused",
          },
          checkpointDirectory: directory,
          cleanupSessionCreate: async () => {
            throw new Error("cleanup session must not resolve when a workflow failed")
          },
          commandRun: async (workflow) => (workflow.name === "SSO" ? 0 : 1),
          catalogCleanup: async () => {
            catalogCalls++
            return { success: true }
          },
          catalogHistoricalCleanup: async () => {
            historicalCalls++
            return { success: true, data: { truncated: false } }
          },
          stripeReconcile: async () => {
            stripeCalls++
            return createResult({
              status: "stripe-reconciled-checkpoint-retained" as const,
              session: "cs_test_123456789",
              customer: "retained",
              subscriptionsCanceled: 0,
              chargesRetained: 0,
              invoicesRetained: 0,
              paymentIntentsRetained: 0,
            })
          },
          mailCleanup: async () => {
            mailCalls++
            return { success: true, data: { status: "verified-deleted" as const } }
          },
        }),
      ).toBe(1)
      expect(catalogCalls).toBe(0)
      expect(historicalCalls).toBe(0)
      expect(stripeCalls).toBe(0)
      expect(mailCalls).toBe(0)
      const checkpoint = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"))
      expect(checkpoint.completedWorkflows).toEqual(["SSO"])
      expect(checkpoint.cleanupPhase).toBeUndefined()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("completes a successful development run and verifies absence before removing the checkpoint", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-dev-success-"))
    const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
    try {
      const started: string[] = []
      let catalogCalls = 0
      let historicalCalls = 0
      let mailCalls = 0
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {
            E2E_CLEANUP_CONVEX_URL: "https://example.convex.cloud",
            E2E_CLEANUP_ADMIN_TOKEN: "admin-token",
            E2E_STRIPE_TEST_SECRET_KEY: "sk_test_mock",
            E2E_STRIPE_TEST_ACCOUNT_ID: "acct_mock",
            E2E_BILLING_ORGANIZATION_ID: "org_mock",
            TEST_CUSTOMER_MAILCOW_HOST: "localhost",
            TEST_CUSTOMER_MAILCOW_USER: "buyer@example.test",
            TEST_CUSTOMER_MAILCOW_PASS: "unused",
          },
          checkpointDirectory: directory,
          cleanupSessionCreate: mockCleanupSessionCreate(),
          commandRun: async (workflow) => {
            started.push(workflow.name)
            if (workflow.name === "ticket purchase") await ticketProgressToDone(directory, target)
            return 0
          },
          catalogCleanup: async (fixture) => {
            catalogCalls++
            expect(fixture.orderId).toBe("order-1")
            return { success: true, data: { deletedOrders: 1 } }
          },
          catalogHistoricalCleanup: async () => {
            historicalCalls++
            // No historical fixtures remain here: historical provider
            // reconciliation for non-empty sweeps is covered at the adapter
            // level with dedicated mocks; the caller forwards Convex results.
            return {
              success: true,
              data: { truncated: false, cleaned: [], scannedEvents: 4 },
            }
          },
          ...invocationDiscoveryMocks(),
          stripeReconcile: mockStripeReconcile(),
          stripeOrderProof: async () => ({
            success: true,
            data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
          }),
          mailCleanup: async (input) => {
            mailCalls++
            expect(input.uid).toBe(501)
            return { success: true, data: { status: "verified-deleted" as const } }
          },
        }),
      ).toBe(0)
      expect(started).toEqual(["SSO", "native auth HTTP", "native auth lifecycle", "ticket purchase"])
      expect(catalogCalls).toBe(1)
      expect(historicalCalls).toBe(1)
      expect(mailCalls).toBe(1)
      await expect(readFile(join(directory, "checkpoint.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("refuses success cleanup without complete backend credentials instead of claiming no-op success", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-no-backend-"))
    const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
    try {
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {
            E2E_CLEANUP_CONVEX_URL: "https://example.convex.cloud",
          },
          checkpointDirectory: directory,
          // Fully offline: stub the default browser cleanup session (no real
          // browser) and the TEST config resolver (no live provider/file reads).
          cleanupSessionCreate: (async () => ({
            success: false as const,
            op: "e2eInvocationCleanupSessionCreate",
            errorMessage: "Cleanup admin session unavailable; server session retained",
          })) as never,
          historicalStripeConfigResolve: (async () =>
            createResult({
              key: "sk_test_mock",
              accountId: "acct_mock",
              organizationId: "org_mock",
            })) as never,
          commandRun: async (workflow) => {
            if (workflow.name === "ticket purchase") await ticketProgressToDone(directory, target)
            return 0
          },
        }),
      ).toBe(1)
      const retained = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"))
      expect(retained.completedWorkflows).toEqual([
        "SSO",
        "native auth HTTP",
        "native auth lifecycle",
        "ticket purchase",
      ])
      expect(retained.cleanupPhase).toBe("failed")
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("locks checkpoint loading and both workflows against a second invocation", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-test-"))
    try {
      let entered!: () => void
      const started = new Promise<void>((resolve) => {
        entered = resolve
      })
      let release!: () => void
      const held = new Promise<void>((resolve) => {
        release = resolve
      })
      const first = e2eInvocationRun({
        target: "development",
        environment: {},
        checkpointDirectory: directory,
        commandRun: async () => {
          entered()
          await held
          return 1
        },
      })
      await started
      const before = await readFile(join(directory, "checkpoint.json"), "utf8")
      let secondStarted = false
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {},
          checkpointDirectory: directory,
          commandRun: async () => {
            secondStarted = true
            return 0
          },
        }),
      ).toBe(1)
      expect(secondStarted).toBe(false)
      expect(await readFile(join(directory, "checkpoint.json"), "utf8")).toBe(before)
      release()
      expect(await first).toBe(1)
      expect(await readFile(join(directory, "checkpoint.json"), "utf8")).toBe(before)
      await expect(readFile(join(directory, "invocation.lock"), "utf8")).rejects.toMatchObject({ code: "ENOENT" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("keeps an interrupted invocation lock and refuses to overwrite its state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-test-"))
    try {
      await writeFile(join(directory, "invocation.lock"), "interrupted", { mode: 0o600 })
      let started = false
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {},
          checkpointDirectory: directory,
          commandRun: async () => {
            started = true
            return 0
          },
        }),
      ).toBe(1)
      expect(started).toBe(false)
      expect(await readFile(join(directory, "invocation.lock"), "utf8")).toBe("interrupted")
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("refuses to bypass a surviving legacy ticket lock", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-test-"))
    try {
      await writeFile(join(directory, "ticket.lock"), "previous attempt", { mode: 0o600 })
      let started = false
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {},
          checkpointDirectory: directory,
          commandRun: async () => {
            started = true
            return 0
          },
        }),
      ).toBe(1)
      expect(started).toBe(false)
      expect(await readFile(join(directory, "ticket.lock"), "utf8")).toBe("previous attempt")
      await expect(readFile(join(directory, "checkpoint.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("refuses an uncertain payment before rerunning even read-only SSO", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-test-"))
    try {
      const runId = "abc-12345678-1234-1234-1234-123456789abc"
      expect(
        (
          await e2eCheckpointSave(directory, {
            version: 1,
            target: "development",
            baseUrl: "https://eventoren.leonardomora.de",
            runId,
            createdAt: 1_000_000,
            phase: "ticket-unreconciled",
            ticket: {
              step: "payment",
              status: "started",
              eventKey: `ticket-e2e-${runId}`,
              eventTitle: `Ticket E2E ${runId}`,
              participantName: `E2E Participant ${runId}`,
              mailSince: 1_000_000,
              orderId: "order-1",
              stripeSession: "cs_test_123456789",
            },
          })
        ).success,
      ).toBe(true)
      const started: string[] = []
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {},
          checkpointDirectory: directory,
          commandRun: async (workflow) => {
            started.push(workflow.name)
            return 0
          },
        }),
      ).toBe(1)
      expect(started).toEqual([])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("retains a stale uncertain ticket without provider cleanup on a blocked retry", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-test-"))
    try {
      const runId = "abc-12345678-1234-1234-1234-123456789abc"
      const createdAt = Date.now() - 25 * 60 * 60_000
      expect(
        (
          await e2eCheckpointSave(directory, {
            version: 1,
            target: "development",
            baseUrl: "https://eventoren.leonardomora.de",
            runId,
            createdAt,
            phase: "ticket-unreconciled",
            ticket: {
              step: "payment",
              status: "started",
              eventKey: `ticket-e2e-${runId}`,
              eventTitle: `Ticket E2E ${runId}`,
              participantName: `E2E Participant ${runId}`,
              mailSince: createdAt,
              eventId: `ticket-e2e-${runId}`,
              productId: "paid-ticket",
              orderId: "order-1",
            },
          })
        ).success,
      ).toBe(true)
      const before = await readFile(join(directory, "checkpoint.json"), "utf8")
      let called = 0
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {},
          checkpointDirectory: directory,
          commandRun: async () => {
            throw new Error("must not run browser")
          },
          catalogCleanup: async () => {
            called++
            return { success: false, errorMessage: "PDF/provider reconciliation pending" }
          },
        }),
      ).toBe(1)
      expect(called).toBe(0)
      expect(await readFile(join(directory, "checkpoint.json"), "utf8")).toBe(before)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("retains a stale Stripe checkout without provider cleanup when the browser is blocked", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-stripe-invocation-"))
    try {
      const runId = "abc-12345678-1234-1234-1234-123456789abc"
      const createdAt = Date.now() - 25 * 60 * 60_000
      expect(
        (
          await e2eCheckpointSave(directory, {
            version: 1,
            target: "development",
            baseUrl: "https://eventoren.leonardomora.de",
            runId,
            createdAt,
            phase: "ticket-unreconciled",
            ticket: {
              step: "payment",
              status: "started",
              eventKey: `ticket-e2e-${runId}`,
              eventTitle: `Ticket E2E ${runId}`,
              participantName: `E2E Participant ${runId}`,
              mailSince: createdAt,
              orderId: "order-1",
              stripeSession: "cs_test_123456789",
            },
          })
        ).success,
      ).toBe(true)
      const before = await readFile(join(directory, "checkpoint.json"), "utf8")
      let swept = 0
      expect(
        await e2eInvocationRun({
          target: "development",
          checkpointDirectory: directory,
          environment: {
            E2E_STRIPE_TEST_SECRET_KEY: "sk_test_mock",
            E2E_STRIPE_TEST_ACCOUNT_ID: "acct_mock",
            E2E_BILLING_ORGANIZATION_ID: "org_mock",
          },
          commandRun: async () => {
            throw new Error("browser must not run")
          },
          stripeReconcile: async () => {
            swept++
            return createResult({
              status: "stripe-reconciled-checkpoint-retained" as const,
              session: "cs_test_123456789",
              customer: "retained",
              subscriptionsCanceled: 0,
              chargesRetained: 0,
              invoicesRetained: 0,
              paymentIntentsRetained: 0,
            })
          },
        }),
      ).toBe(1)
      expect(swept).toBe(0)
      expect(await readFile(join(directory, "checkpoint.json"), "utf8")).toBe(before)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("does not silently redirect a production run with a preview env file", async () => {
    expect(
      await e2eInvocationRun({
        environment: { E2E_BASE_URL: "https://eventoren.leonardomora.de" },
        commandRun: async () => 0,
      }),
    ).toBe(1)
  })

  it("retains stale mail evidence without provider cleanup on a blocked retry", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-imap-test-"))
    try {
      const runId = "abc-12345678-1234-1234-1234-123456789abc"
      const createdAt = Date.now() - 25 * 60 * 60_000
      expect(
        (
          await e2eCheckpointSave(directory, {
            version: 1,
            target: "development",
            baseUrl: "https://eventoren.leonardomora.de",
            runId,
            createdAt,
            phase: "ticket-unreconciled",
            ticket: {
              step: "payment",
              status: "started",
              eventKey: `ticket-e2e-${runId}`,
              eventTitle: `Ticket E2E ${runId}`,
              participantName: `E2E Participant ${runId}`,
              mailSince: createdAt,
              mailUid: 501,
              mailUidValidity: "42",
              stripeSession: "cs_test_123456789",
            },
          })
        ).success,
      ).toBe(true)
      const previous = await readFile(join(directory, "checkpoint.json"), "utf8")
      let scanned = false
      expect(
        await e2eInvocationRun({
          target: "development",
          checkpointDirectory: directory,
          environment: {
            TEST_CUSTOMER_MAILCOW_HOST: "localhost",
            TEST_CUSTOMER_MAILCOW_USER: "buyer@example.test",
            TEST_CUSTOMER_MAILCOW_PASS: "unused",
          },
          commandRun: async () => {
            throw new Error("browser must not start")
          },
          mailCleanup: async () => {
            scanned = true
            return { success: true, data: { status: "verified-deleted" } }
          },
        }),
      ).toBe(1)
      expect(scanned).toBe(false)
      expect(await readFile(join(directory, "checkpoint.json"), "utf8")).toBe(previous)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("forwards snapshot typed seams and cleans snapshot-only residue without live fetching", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-snapshot-forward-"))
    const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
    try {
      const snapshotCandidate = { version: 7, kind: "ticket-e2e", eventKey: "ticket-e2e-old", chunkCount: 2 }
      let discoveryCalls = 0
      let cleanupCalls = 0
      let exportCalls = 0
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {
            E2E_CLEANUP_CONVEX_URL: "https://example.convex.cloud",
            E2E_CLEANUP_ADMIN_TOKEN: "admin-token",
            E2E_STRIPE_TEST_SECRET_KEY: "sk_test_mock",
            E2E_STRIPE_TEST_ACCOUNT_ID: "acct_mock",
            E2E_BILLING_ORGANIZATION_ID: "org_mock",
            TEST_CUSTOMER_MAILCOW_HOST: "localhost",
            TEST_CUSTOMER_MAILCOW_USER: "buyer@example.test",
            TEST_CUSTOMER_MAILCOW_PASS: "unused",
          },
          checkpointDirectory: directory,
          cleanupSessionCreate: mockCleanupSessionCreate(),
          commandRun: async (workflow) => {
            if (workflow.name === "ticket purchase") await ticketProgressToDone(directory, target)
            return 0
          },
          catalogCleanup: async () => ({ success: true, data: {} }),
          catalogHistoricalCleanup: async () => ({
            success: true,
            data: { truncated: false, cleaned: [], scannedEvents: 2 },
          }),
          ...invocationDiscoveryMocks(),
          snapshotHistoricalDiscovery: async () => {
            discoveryCalls++
            if (discoveryCalls === 1)
              return {
                success: true as const,
                data: {
                  isDone: true,
                  continueCursor: null,
                  candidates: [snapshotCandidate],
                  scannedSnapshots: 20,
                  activeVersion: 9,
                },
              }
            return {
              success: true as const,
              data: { isDone: true, continueCursor: null, candidates: [], scannedSnapshots: 20, activeVersion: 9 },
            }
          },
          snapshotHistoricalCleanup: async () => {
            cleanupCalls++
            return {
              success: true as const,
              data: {
                isDone: true,
                continueCursor: null,
                scannedSnapshots: 20,
                activeVersion: 9,
                cleanedVersions: [
                  {
                    version: 7,
                    kinds: ["ticket-e2e"],
                    eventKeys: ["ticket-e2e-old"],
                    chunkCount: 2,
                    action: "deleted" as const,
                  },
                ],
                deletedChunks: 2,
                skippedVersions: [],
              },
            }
          },
          snapshotExportVerify: async () => {
            exportCalls++
            return { success: true as const, data: { status: "snapshot-export-clean" as const } }
          },
          stripeReconcile: mockStripeReconcile(),
          stripeOrderProof: async () => ({
            success: true,
            data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
          }),
          mailCleanup: async () => ({ success: true, data: { status: "verified-deleted" as const } }),
        }),
      ).toBe(0)
      expect(cleanupCalls).toBe(1)
      expect(discoveryCalls).toBeGreaterThanOrEqual(2)
      expect(exportCalls).toBe(0)
      await expect(readFile(join(directory, "checkpoint.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("retains redacted cleanup session failure and retries cleanup-only without rerunning workflows", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-auto-session-"))
    const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
    const freshToken = "fresh-auto-cleanup-token-abc"
    const password = "e2e-password"
    try {
      const sessionInputs: Array<{
        targetBaseUrl: string
        convexUrl: string
        runId: string
        env: Record<string, string | undefined>
      }> = []
      let sessionCalls = 0
      const forwardedAdminTokens: string[] = []
      let attempt = 0
      const sessionCreate = async (input: {
        targetBaseUrl: string
        convexUrl: string
        runId: string
        env: Record<string, string | undefined>
      }) => {
        sessionCalls++
        sessionInputs.push(input)
        attempt++
        if (attempt === 1) {
          return {
            success: false as const,
            op: "e2eInvocationCleanupSessionCreate",
            errorMessage: "Cleanup session verification rejected; server session retained",
          }
        }
        return createResult({
          token: freshToken,
          sessionId: "sess_auto",
          owned: true as const,
          tokenDigest: `digest-${freshToken}`,
        })
      }
      const baseEnvironment = {
        E2E_CLEANUP_CONVEX_URL: "https://example.convex.cloud",
        E2E_AUTH_USERNAME: "e2e-user",
        E2E_AUTH_PASSWORD: password,
        E2E_STRIPE_TEST_SECRET_KEY: "sk_test_mock",
        E2E_STRIPE_TEST_ACCOUNT_ID: "acct_mock",
        E2E_BILLING_ORGANIZATION_ID: "org_mock",
        TEST_CUSTOMER_MAILCOW_HOST: "localhost",
        TEST_CUSTOMER_MAILCOW_USER: "buyer@example.test",
        TEST_CUSTOMER_MAILCOW_PASS: "unused",
      }
      const runWorkflows = async (workflow: { name: string }) => {
        if (workflow.name === "ticket purchase") await ticketProgressToDone(directory, target)
        return 0
      }
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: baseEnvironment,
          checkpointDirectory: directory,
          cleanupSessionCreate: sessionCreate as never,
          commandRun: runWorkflows as never,
          catalogCleanup: async () => ({ success: true, data: {} }),
          catalogHistoricalCleanup: async () => ({
            success: true,
            data: { truncated: false, cleaned: [], scannedEvents: 1 },
          }),
          ...invocationDiscoveryMocks(),
          stripeReconcile: mockStripeReconcile(),
          stripeOrderProof: async () => ({
            success: true,
            data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
          }),
          mailCleanup: async () => ({ success: true, data: { status: "verified-deleted" as const } }),
        }),
      ).toBe(1)
      expect(sessionCalls).toBe(1)
      const retained = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"))
      expect(retained.completedWorkflows).toEqual([
        "SSO",
        "native auth HTTP",
        "native auth lifecycle",
        "ticket purchase",
      ])
      expect(retained.cleanupPhase).toBe("failed")
      expect(retained.ticket.step).toBe("done")
      // Resolve failure retains business fixtures with a redacted error: no token/secret in the checkpoint.
      expect(JSON.stringify(retained)).not.toContain(freshToken)
      expect(JSON.stringify(retained)).not.toContain(password)
      expect(sessionInputs[0]!.targetBaseUrl).toBe("https://eventoren.leonardomora.de")
      expect(sessionInputs[0]!.convexUrl).toBe("https://example.convex.cloud")
      expect(sessionInputs[0]!.runId).toMatch(/^[0-9a-z]+-[0-9a-f-]{36}$/u)
      expect(sessionInputs[0]!.runId).toBe(retained.runId)
      expect(sessionInputs[0]!.env.E2E_AUTH_USERNAME).toBe("e2e-user")
      expect(sessionInputs[0]!.env.E2E_RUN_ID).toBeUndefined()

      let reruns = 0
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: baseEnvironment,
          checkpointDirectory: directory,
          cleanupSessionCreate: sessionCreate as never,
          commandRun: async () => {
            reruns++
            return 0
          },
          catalogCleanup: async () => ({ success: true, data: {} }),
          catalogHistoricalCleanup: async (input) => {
            forwardedAdminTokens.push(input.adminToken)
            return { success: true, data: { truncated: false, cleaned: [], scannedEvents: 2 } }
          },
          ...invocationDiscoveryMocks(),
          stripeReconcile: mockStripeReconcile(),
          stripeOrderProof: async () => ({
            success: true,
            data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
          }),
          mailCleanup: async () => ({ success: true, data: { status: "verified-deleted" as const } }),
        }),
      ).toBe(0)
      // Cleanup-only retry resolves the automatic session without rerunning verified workflows.
      expect(reruns).toBe(0)
      expect(sessionCalls).toBe(2)
      expect(forwardedAdminTokens).toEqual([freshToken])
      expect(sessionInputs[1]!.targetBaseUrl).toBe("https://eventoren.leonardomora.de")
      expect(sessionInputs[1]!.runId).toBe(retained.runId)
      await expect(readFile(join(directory, "checkpoint.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("makes zero cleanup session calls when a selected workflow fails", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-session-not-called-"))
    try {
      let sessionCalls = 0
      let historicalCalls = 0
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {
            E2E_CLEANUP_CONVEX_URL: "https://example.convex.cloud",
            E2E_CLEANUP_ADMIN_TOKEN: "admin-token",
          },
          checkpointDirectory: directory,
          cleanupSessionCreate: (async () => {
            sessionCalls++
            return createResult({
              token: "must-not-resolve",
              sessionId: "sess_must_not_resolve",
              owned: false as const,
              tokenDigest: "digest-must-not-resolve",
            })
          }) as never,
          commandRun: async (workflow) => (workflow.name === "SSO" ? 0 : 1),
          catalogHistoricalCleanup: async () => {
            historicalCalls++
            return { success: true, data: { truncated: false } }
          },
        }),
      ).toBe(1)
      expect(sessionCalls).toBe(0)
      expect(historicalCalls).toBe(0)
      const checkpoint = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"))
      expect(checkpoint.completedWorkflows).toEqual(["SSO"])
      expect(checkpoint.cleanupPhase).toBeUndefined()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("retains expired SSO progress and resumes at the first unfinished workflow without clearing", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-expired-progress-"))
    try {
      const runId = "abc-12345678-1234-1234-1234-123456789abc"
      const createdAt = Date.now() - 25 * 60 * 60_000
      const base = {
        version: 1 as const,
        target: "development" as const,
        baseUrl: "https://eventoren.leonardomora.de" as const,
        runId,
        createdAt,
        phase: "sso" as const,
        selectedWorkflows: ["SSO", "native auth HTTP", "native auth lifecycle", "ticket purchase"] as const,
        completedWorkflows: [] as unknown as E2eCheckpoint["completedWorkflows"],
      }
      expect((await e2eCheckpointSave(directory, base as never)).success).toBe(true)
      const progressed = {
        ...base,
        completedWorkflows: ["SSO"] as unknown as E2eCheckpoint["completedWorkflows"],
      }
      expect((await e2eCheckpointSave(directory, progressed as never)).success).toBe(true)
      const { e2eCheckpointSsoClear } = await import("../checkpoint/e2eCheckpointSsoClear.ts")
      const loaded = await e2eCheckpointLoad(directory, {
        target: "development",
        baseUrl: "https://eventoren.leonardomora.de",
      })
      if (!loaded.success || !loaded.data) throw new Error("Cannot load expired progress checkpoint")
      expect((await e2eCheckpointSsoClear(directory, loaded.data)).success).toBe(false)
      const started: string[] = []
      const runIds: string[] = []
      let historicalCalls = 0
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {},
          checkpointDirectory: directory,
          commandRun: async (workflow, environment) => {
            started.push(workflow.name)
            runIds.push(environment.E2E_RUN_ID!)
            return 1
          },
          catalogHistoricalCleanup: async () => {
            historicalCalls++
            return { success: true, data: { truncated: false } }
          },
        }),
      ).toBe(1)
      // Verified SSO is skipped; the same expired run resumes at native auth HTTP.
      expect(started).toEqual(["native auth HTTP"])
      expect(runIds).toEqual([runId])
      expect(historicalCalls).toBe(0)
      const retained = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"))
      expect(retained.runId).toBe(runId)
      expect(retained.completedWorkflows).toEqual(["SSO"])
      expect(retained.cleanupPhase).toBeUndefined()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("retains an aged zero-completed failed SSO run with its attempt ownership instead of expiring", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-aged-sso-"))
    try {
      const runId = "abc-12345678-1234-1234-1234-123456789abc"
      const createdAt = Date.now() - 25 * 60 * 60_000
      const base = {
        version: 1 as const,
        target: "development" as const,
        baseUrl: "https://eventoren.leonardomora.de" as const,
        runId,
        createdAt,
        phase: "sso" as const,
        selectedWorkflows: ["SSO", "native auth HTTP", "native auth lifecycle", "ticket purchase"] as const,
        completedWorkflows: [] as unknown as E2eCheckpoint["completedWorkflows"],
      }
      expect((await e2eCheckpointSave(directory, base as never)).success).toBe(true)
      // Simulate the marked provider app session a failed first SSO may have
      // created via e2eAuthSessionMark before its assertions failed.
      const evidencePath = join(directory, `auth-session-evidence-${runId}.json`)
      const evidence = JSON.stringify({
        version: 1,
        runId,
        sessions: [
          {
            sessionId: "sess_aged_sso_attempt",
            creationTime: createdAt + 1_000,
            runId,
            tokenDigest: "digest-aged-sso-attempt",
            markedAt: new Date(createdAt + 1_000).toISOString(),
          },
        ],
      })
      await writeFile(evidencePath, evidence, { mode: 0o600 })
      const runIds: string[] = []
      const started: string[][] = []
      let historicalCalls = 0
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const attemptStarted: string[] = []
        expect(
          await e2eInvocationRun({
            target: "development",
            environment: {},
            checkpointDirectory: directory,
            commandRun: async (workflow, environment) => {
              attemptStarted.push(workflow.name)
              runIds.push(environment.E2E_RUN_ID!)
              return 1
            },
            catalogHistoricalCleanup: async () => {
              historicalCalls++
              return { success: true, data: { truncated: false } }
            },
          }),
        ).toBe(1)
        started.push(attemptStarted)
      }
      // Same aged run resumes at SSO with the same attempt ownership; no new run.
      expect(started).toEqual([["SSO"], ["SSO"]])
      expect(runIds).toEqual([runId, runId])
      expect(historicalCalls).toBe(0)
      const retained = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"))
      expect(retained.runId).toBe(runId)
      expect(retained.createdAt).toBe(createdAt)
      expect(retained.phase).toBe("sso")
      expect(retained.completedWorkflows).toEqual([])
      expect(retained.ticket).toBeUndefined()
      expect(retained.cleanupPhase).toBeUndefined()
      expect(JSON.parse(await readFile(evidencePath, "utf8")).sessions[0].sessionId).toBe("sess_aged_sso_attempt")
      // Production/development target mismatch still rejects without touching the retained run.
      const before = await readFile(join(directory, "checkpoint.json"), "utf8")
      let productionStarted = false
      expect(
        await e2eInvocationRun({
          target: "production",
          environment: {},
          checkpointDirectory: directory,
          commandRun: async () => {
            productionStarted = true
            return 0
          },
        }),
      ).toBe(1)
      expect(productionStarted).toBe(false)
      expect(await readFile(join(directory, "checkpoint.json"), "utf8")).toBe(before)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
