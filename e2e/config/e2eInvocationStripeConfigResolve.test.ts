import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "@rstest/core"
import { createResult, createResultError } from "#result"
import { e2eCheckpointLoad } from "../checkpoint/e2eCheckpointLoad.ts"
import { e2eCheckpointSave } from "../checkpoint/e2eCheckpointSave.ts"
import type { E2eCheckpoint } from "../checkpoint/e2eCheckpointSchema.ts"
import { e2eInvocationRun } from "./e2eInvocationRun.ts"

const resolvedKey = "sk_test_resolved01"
const resolvedAccountId = "acct_resolved01"
const resolvedOrganizationId = "org_resolved01"

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

function mockCleanupSessionCreate(token = "admin-token") {
  return async () =>
    createResult({
      token,
      sessionId: "sess_mock",
      owned: false as const,
      tokenDigest: `digest-${token}`,
    })
}

function mockStripeReconcile(captured: { key?: string; accountId?: string; organizationId?: string }) {
  return async (input: { key: string; accountId: string; organizationId: string }) => {
    captured.key = input.key
    captured.accountId = input.accountId
    captured.organizationId = input.organizationId
    return createResult({
      status: "stripe-reconciled-checkpoint-retained" as const,
      session: "cs_test_123456789",
      customer: "retained",
      subscriptionsCanceled: 0,
      chargesRetained: 0,
      invoicesRetained: 0,
      paymentIntentsRetained: 0,
    })
  }
}

function discoveryMocks(calls: string[]) {
  const record =
    (name: string) =>
    async (...args: unknown[]) => {
      calls.push(name)
      void args
      return { success: true as const, data: {} }
    }
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
    historicalStripeCleanup: record("historicalStripeCleanup"),
    historicalMailCleanup: record("historicalMailCleanup"),
    historicalStripeVerify: record("historicalStripeVerify"),
    historicalMailVerify: record("historicalMailVerify"),
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

const mailEnvironment = {
  TEST_CUSTOMER_MAILCOW_HOST: "localhost",
  TEST_CUSTOMER_MAILCOW_USER: "buyer@example.test",
  TEST_CUSTOMER_MAILCOW_PASS: "unused",
}

describe("Eventoren E2E historical Stripe TEST default", () => {
  it("resolves config behind the success barrier and forwards it to provider cleanup", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-stripe-config-"))
    const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
    const calls: string[] = []
    const captured: { key?: string; accountId?: string; organizationId?: string } = {}
    const seenTargets: unknown[] = []
    try {
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {
            E2E_CLEANUP_CONVEX_URL: "https://example.convex.cloud",
            E2E_CLEANUP_ADMIN_TOKEN: "admin-token",
            ...mailEnvironment,
          },
          checkpointDirectory: directory,
          cleanupSessionCreate: mockCleanupSessionCreate(),
          historicalStripeConfigResolve: (async (args: { target: "production" | "development" }) => {
            calls.push("config")
            seenTargets.push(args.target)
            return createResult({
              key: resolvedKey,
              accountId: resolvedAccountId,
              organizationId: resolvedOrganizationId,
            })
          }) as never,
          commandRun: async (workflow) => {
            if (workflow.name === "ticket purchase") await ticketProgressToDone(directory, target)
            return 0
          },
          catalogCleanup: async () => ({ success: true, data: {} }),
          catalogHistoricalCleanup: async () => ({
            success: true,
            data: { truncated: false, cleaned: [], scannedEvents: 2 },
          }),
          ...discoveryMocks(calls),
          stripeReconcile: mockStripeReconcile(captured) as never,
          stripeOrderProof: async () => ({
            success: true,
            data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
          }),
          mailCleanup: async () => ({ success: true, data: { status: "verified-deleted" as const } }),
        }),
      ).toBe(0)
      expect(calls.filter((entry) => entry === "config")).toHaveLength(1)
      expect(seenTargets).toEqual(["development"])
      expect(calls.indexOf("config")).toBeLessThan(calls.indexOf("historicalStripeCleanup"))
      expect(captured).toMatchObject({
        key: resolvedKey,
        accountId: resolvedAccountId,
        organizationId: resolvedOrganizationId,
      })
      await expect(readFile(join(directory, "checkpoint.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("fails the DEV ticket with the checkpoint retained when default config resolution fails before providers", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-stripe-config-fail-"))
    const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
    const calls: string[] = []
    let resolveCalls = 0
    try {
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {
            E2E_CLEANUP_CONVEX_URL: "https://example.convex.cloud",
            E2E_CLEANUP_ADMIN_TOKEN: "admin-token",
            ...mailEnvironment,
          },
          checkpointDirectory: directory,
          cleanupSessionCreate: mockCleanupSessionCreate(),
          historicalStripeConfigResolve: (async () => {
            resolveCalls++
            return createResultError(
              "e2eStripeHistoricalConfigResolve",
              "Historical Stripe TEST default unavailable; checkpoint retained",
            )
          }) as never,
          commandRun: async (workflow) => {
            if (workflow.name === "ticket purchase") await ticketProgressToDone(directory, target)
            return 0
          },
          catalogCleanup: async () => ({ success: true, data: {} }),
          catalogHistoricalCleanup: async () => {
            calls.push("catalogHistoricalCleanup")
            return { success: true, data: { truncated: false } }
          },
          ...discoveryMocks(calls),
          stripeReconcile: mockStripeReconcile({}) as never,
          stripeOrderProof: async () => ({
            success: true,
            data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
          }),
          mailCleanup: async () => ({ success: true, data: { status: "verified-deleted" as const } }),
        }),
      ).toBe(1)
      expect(resolveCalls).toBe(1)
      expect(calls).toEqual([])
      const retained = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"))
      // DEV ticket resolve happens before the ticket child; a failure retains
      // the ordered prefix with provider fixtures and never reaches cleanup.
      expect(retained.completedWorkflows).toEqual(["SSO", "native auth HTTP", "native auth lifecycle"])
      expect(retained.cleanupPhase).toBeUndefined()
      expect(retained.ticket.step).toBe("ready")
      expect(JSON.stringify(retained)).not.toContain("sk_test_")
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("makes zero config calls when a selected workflow fails", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-stripe-config-not-called-"))
    try {
      let resolveCalls = 0
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {
            E2E_CLEANUP_CONVEX_URL: "https://example.convex.cloud",
            E2E_CLEANUP_ADMIN_TOKEN: "admin-token",
          },
          checkpointDirectory: directory,
          cleanupSessionCreate: (async () => {
            throw new Error("cleanup session must not resolve when a workflow failed")
          }) as never,
          historicalStripeConfigResolve: (async () => {
            resolveCalls++
            return createResult({
              key: resolvedKey,
              accountId: resolvedAccountId,
              organizationId: resolvedOrganizationId,
            })
          }) as never,
          commandRun: async (workflow) => (workflow.name === "SSO" ? 0 : 1),
        }),
      ).toBe(1)
      expect(resolveCalls).toBe(0)
      const checkpoint = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"))
      expect(checkpoint.completedWorkflows).toEqual(["SSO"])
      expect(checkpoint.cleanupPhase).toBeUndefined()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("makes zero config calls and leaks no TEST credentials when SSO fails first", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-stripe-config-sso-fail-"))
    try {
      let resolveCalls = 0
      const childEnvs: Record<string, Record<string, string>> = {}
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {
            E2E_CLEANUP_CONVEX_URL: "https://example.convex.cloud",
            E2E_CLEANUP_ADMIN_TOKEN: "admin-token",
          },
          checkpointDirectory: directory,
          cleanupSessionCreate: (async () => {
            throw new Error("cleanup session must not resolve when SSO failed")
          }) as never,
          historicalStripeConfigResolve: (async () => {
            resolveCalls++
            return createResult({
              key: resolvedKey,
              accountId: resolvedAccountId,
              organizationId: resolvedOrganizationId,
            })
          }) as never,
          commandRun: async (workflow, environment) => {
            childEnvs[workflow.name] = { ...environment }
            return 1
          },
        }),
      ).toBe(1)
      expect(resolveCalls).toBe(0)
      expect(Object.keys(childEnvs)).toEqual(["SSO"])
      expect(childEnvs["SSO"]!["E2E_STRIPE_TEST_SECRET_KEY"]).toBeUndefined()
      expect(childEnvs["SSO"]!["E2E_STRIPE_TEST_ACCOUNT_ID"]).toBeUndefined()
      expect(childEnvs["SSO"]!["E2E_BILLING_ORGANIZATION_ID"]).toBeUndefined()
      const checkpoint = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"))
      expect(checkpoint.completedWorkflows).toEqual([])
      expect(checkpoint.cleanupPhase).toBeUndefined()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("attaches validated TEST config only to the DEV ticket child and reuses it for historical cleanup", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-stripe-ticket-env-"))
    const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
    const calls: string[] = []
    const captured: { key?: string; accountId?: string; organizationId?: string } = {}
    const childEnvs: Record<string, Record<string, string>> = {}
    let resolveCalls = 0
    const seenTargets: unknown[] = []
    try {
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {
            E2E_CLEANUP_CONVEX_URL: "https://example.convex.cloud",
            E2E_CLEANUP_ADMIN_TOKEN: "admin-token",
            ...mailEnvironment,
          },
          checkpointDirectory: directory,
          cleanupSessionCreate: mockCleanupSessionCreate(),
          historicalStripeConfigResolve: (async (args: { target: "production" | "development" }) => {
            resolveCalls++
            calls.push("config")
            seenTargets.push(args.target)
            return createResult({
              key: resolvedKey,
              accountId: resolvedAccountId,
              organizationId: resolvedOrganizationId,
            })
          }) as never,
          commandRun: async (workflow, environment) => {
            childEnvs[workflow.name] = { ...environment }
            if (workflow.name === "ticket purchase") await ticketProgressToDone(directory, target)
            return 0
          },
          catalogCleanup: async () => ({ success: true, data: {} }),
          catalogHistoricalCleanup: async () => ({
            success: true,
            data: { truncated: false, cleaned: [], scannedEvents: 2 },
          }),
          ...discoveryMocks(calls),
          stripeReconcile: mockStripeReconcile(captured) as never,
          stripeOrderProof: async () => ({
            success: true,
            data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
          }),
          mailCleanup: async () => ({ success: true, data: { status: "verified-deleted" as const } }),
        }),
      ).toBe(0)
      // Single validated resolve: ticket child first, historical phase reuses it.
      expect(resolveCalls).toBe(1)
      expect(seenTargets).toEqual(["development"])
      expect(calls.filter((entry) => entry === "config")).toHaveLength(1)
      expect(calls.indexOf("config")).toBeLessThan(calls.indexOf("historicalStripeCleanup"))
      // SSO/HTTP/lifecycle children never receive TEST credentials.
      for (const name of ["SSO", "native auth HTTP", "native auth lifecycle"]) {
        expect(childEnvs[name]!["E2E_STRIPE_TEST_SECRET_KEY"]).toBeUndefined()
        expect(childEnvs[name]!["E2E_STRIPE_TEST_ACCOUNT_ID"]).toBeUndefined()
        expect(childEnvs[name]!["E2E_BILLING_ORGANIZATION_ID"]).toBeUndefined()
      }
      // DEV ticket child receives only the validated TEST env + org.
      const ticketEnv = childEnvs["ticket purchase"]!
      expect(ticketEnv["E2E_STRIPE_TEST_SECRET_KEY"]).toBe(resolvedKey)
      expect(ticketEnv["E2E_STRIPE_TEST_ACCOUNT_ID"]).toBe(resolvedAccountId)
      expect(ticketEnv["E2E_BILLING_ORGANIZATION_ID"]).toBe(resolvedOrganizationId)
      expect(ticketEnv["E2E_STRIPE_TEST_SECRET_KEY"]).toMatch(/^(sk|rk)_test_[A-Za-z0-9]+$/u)
      expect(ticketEnv["E2E_STRIPE_TEST_ACCOUNT_ID"]).toMatch(/^acct_[A-Za-z0-9]+$/u)
      expect(JSON.stringify(ticketEnv)).not.toContain("sk_live_")
      // Historical reuse forwards the same cached config in process only.
      expect(captured).toMatchObject({
        key: resolvedKey,
        accountId: resolvedAccountId,
        organizationId: resolvedOrganizationId,
      })
      await expect(readFile(join(directory, "checkpoint.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("runs production workflows without ticket credentials and without a ticket resolve", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-stripe-config-prod-"))
    try {
      const started: string[] = []
      const childEnvs: Record<string, Record<string, string>> = {}
      let resolveCalls = 0
      let stripeCalls = 0
      expect(
        await e2eInvocationRun({
          target: "production",
          environment: {
            E2E_CLEANUP_CONVEX_URL: "https://example.convex.cloud",
            E2E_CLEANUP_ADMIN_TOKEN: "admin-token",
          },
          checkpointDirectory: directory,
          cleanupSessionCreate: mockCleanupSessionCreate(),
          historicalStripeConfigResolve: (async () => {
            resolveCalls++
            return createResult({
              key: resolvedKey,
              accountId: resolvedAccountId,
              organizationId: resolvedOrganizationId,
            })
          }) as never,
          commandRun: async (workflow, environment) => {
            started.push(workflow.name)
            childEnvs[workflow.name] = { ...environment }
            return 0
          },
          catalogCleanup: async () => ({ success: true, data: {} }),
          catalogHistoricalCleanup: async () => ({
            success: true,
            data: { truncated: false, cleaned: [], scannedEvents: 3 },
          }),
          ...discoveryMocks([]),
          stripeReconcile: (async () => {
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
          }) as never,
          stripeOrderProof: async () => ({
            success: true,
            data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
          }),
          mailCleanup: async () => ({ success: true, data: { status: "verified-deleted" as const } }),
        }),
      ).toBe(0)
      expect(started).toEqual(["SSO", "native auth HTTP", "native auth lifecycle"])
      expect(started).not.toContain("ticket purchase")
      // Production ticket is still forbidden: no ticket child and no TEST creds leak.
      for (const name of started) {
        expect(childEnvs[name]!["E2E_STRIPE_TEST_SECRET_KEY"]).toBeUndefined()
        expect(childEnvs[name]!["E2E_STRIPE_TEST_ACCOUNT_ID"]).toBeUndefined()
        expect(childEnvs[name]!["E2E_BILLING_ORGANIZATION_ID"]).toBeUndefined()
      }
      expect(childEnvs["ticket purchase"]).toBeUndefined()
      // Only the whole-success historical phase may resolve; never for a ticket child.
      expect(resolveCalls).toBe(1)
      expect(stripeCalls).toBe(0)
      await expect(readFile(join(directory, "checkpoint.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
