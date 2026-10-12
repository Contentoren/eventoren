import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, expect, test } from "@rstest/core"
import { e2eCheckpointSave } from "../checkpoint/e2eCheckpointSave.ts"
import type { E2eCheckpoint } from "../checkpoint/e2eCheckpointSchema.ts"
import { nativeAuthHttpCheckpoint } from "../workflows/nativeAuth/nativeAuthHttpCheckpoint.ts"
import { createResult } from "#result"
import { e2eSuccessCleanupRun } from "./e2eSuccessCleanupRun.ts"

const directories: string[] = []
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true })
})

async function successCheckpoint(directory: string, target: Pick<E2eCheckpoint, "target" | "baseUrl">) {
  const runId = "mtest-12345678-1234-1234-1234-123456789abc"
  const createdAt = Date.now() - 1000
  const selected = [
    "SSO",
    "native auth HTTP",
    "native auth lifecycle",
    "ticket purchase",
  ] as E2eCheckpoint["selectedWorkflows"]
  const initial: E2eCheckpoint = {
    version: 1,
    target: target.target,
    baseUrl: target.baseUrl,
    runId,
    createdAt,
    phase: "sso",
    selectedWorkflows: selected,
    completedWorkflows: [],
  }
  expect((await e2eCheckpointSave(directory, initial)).success).toBe(true)
  for (const count of [1, 2, 3]) {
    const completed = selected!.slice(0, count) as E2eCheckpoint["completedWorkflows"]
    const loaded = await (await import("../checkpoint/e2eCheckpointLoad.ts")).e2eCheckpointLoad(directory, target)
    if (!loaded.success || !loaded.data) throw new Error("Cannot build barrier")
    expect((await e2eCheckpointSave(directory, { ...loaded.data, completedWorkflows: completed })).success).toBe(true)
  }
  const withReady = await (await import("../checkpoint/e2eCheckpointLoad.ts")).e2eCheckpointLoad(directory, target)
  if (!withReady.success || !withReady.data) throw new Error("Cannot mark ticket ready")
  expect(
    (
      await e2eCheckpointSave(directory, {
        ...withReady.data,
        phase: "ticket-unreconciled",
        ticket: {
          step: "ready",
          status: "completed",
          eventKey: `ticket-e2e-${runId}`,
          eventTitle: `Ticket E2E ${runId}`,
          participantName: `E2E Participant ${runId}`,
          mailSince: createdAt,
        },
      })
    ).success,
  ).toBe(true)
  const ticketSteps = [
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
  for (const step of ticketSteps) {
    const loaded = await (await import("../checkpoint/e2eCheckpointLoad.ts")).e2eCheckpointLoad(directory, target)
    if (!loaded.success || !loaded.data?.ticket) throw new Error(`Cannot progress ticket to ${step}`)
    const next: E2eCheckpoint = {
      ...loaded.data,
      ticket: {
        ...loaded.data.ticket,
        step,
        status: "completed",
        eventId: `ticket-e2e-${runId}`,
        productId: "paid-ticket",
        orderId: "order-1",
        ticketId: "ticket-1",
        stripeSession: "cs_test_123456789",
        mailUid: 501,
        mailUidValidity: "42",
      },
    }
    expect((await e2eCheckpointSave(directory, next)).success).toBe(true)
  }
  const doneLoaded = await (await import("../checkpoint/e2eCheckpointLoad.ts")).e2eCheckpointLoad(directory, target)
  if (!doneLoaded.success || !doneLoaded.data) throw new Error("Cannot finalize barrier")
  const checkpoint: E2eCheckpoint = {
    ...doneLoaded.data,
    completedWorkflows: [...selected!] as E2eCheckpoint["completedWorkflows"],
    cleanupPhase: "pending",
  }
  expect((await e2eCheckpointSave(directory, checkpoint)).success).toBe(true)
  return checkpoint
}

function discoveryVerifyMocks() {
  return {
    catalogHistoricalDiscovery: async () => ({
      success: true,
      data: { isDone: true, continueCursor: null, candidates: [], scannedEvents: 0 },
    }),
    snapshotHistoricalDiscovery: async () => ({
      success: true,
      data: { isDone: true, continueCursor: null, candidates: [], scannedSnapshots: 0, activeVersion: 0 },
    }),
    snapshotHistoricalCleanup: async () => ({
      success: true,
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
    snapshotExportVerify: async () => ({ success: true, data: { status: "snapshot-export-clean" as const } }),
    historicalStripeVerify: async () => ({ success: true, data: { status: "stripe-historical-absent" as const } }),
    historicalMailVerify: async () => ({ success: true, data: { status: "imap-historical-absent" as const } }),
    authSessionDiscovery: async () => ({
      success: true,
      data: { isDone: true, continueCursor: null, sessions: [], scannedSessions: 0 },
    }),
    authSessionCleanup: async () => ({
      success: true,
      data: { deletedSessionIds: [], deletedCount: 0, callerDeleted: false, remainingMarkedOthers: 0 },
    }),
    authSessionMark: async () => ({ success: false, errorMessage: "unexpected mark without owned evidence" }),
  }
}

test("success cleanup bypasses the 24h gate and inventories current plus historical evidence", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-cleanup-"))
  directories.push(directory)
  const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
  await successCheckpoint(directory, target)
  let catalogCalls = 0
  let historicalCalls = 0
  let authDiscoveryCalls = 0
  const result = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    catalogCleanup: async (fixture) => {
      catalogCalls++
      expect(fixture.successfulOwnedCurrentRun).toBe(true)
      return { success: true, data: { deletedOrders: 1 } }
    },
    catalogHistoricalCleanup: async () => {
      historicalCalls++
      return { success: true, data: { truncated: false, cleaned: [{ eventKey: "ticket-e2e-old" }], scannedEvents: 4 } }
    },
    ...discoveryVerifyMocks(),
    authSessionDiscovery: async () => {
      authDiscoveryCalls++
      return { success: true, data: { isDone: true, continueCursor: null, sessions: [], scannedSessions: 0 } }
    },
    historicalStripeCleanup: async () => ({ success: true, data: { status: "stripe-historical-reconciled" as const } }),
    historicalMailCleanup: async () => ({ success: true, data: { status: "imap-historical-reconciled" as const } }),
    stripeReconcile: async () =>
      createResult({
        status: "stripe-reconciled-checkpoint-retained" as const,
        session: "cs_test_123456789",
        customer: "retained",
        subscriptionsCanceled: 0,
        chargesRetained: 0,
        invoicesRetained: 0,
        paymentIntentsRetained: 0,
      }),
    stripeKey: "sk_test_mock",
    stripeAccountId: "acct_mock",
    stripeOrganizationId: "org_mock",
    stripeOrderProof: async () => ({
      success: true,
      data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
    }),
    mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" },
    mailCleanup: async () => createResult({ status: "verified-deleted" as const }),
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  expect(catalogCalls).toBe(1)
  expect(historicalCalls).toBe(1)
  expect(authDiscoveryCalls).toBeGreaterThan(0)
})

test("success cleanup refuses no-op success without complete backend credentials", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-cleanup-"))
  directories.push(directory)
  const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
  await successCheckpoint(directory, target)
  const missing = await e2eSuccessCleanupRun({ directory, target })
  expect(missing.success).toBe(false)
  if (missing.success) throw new Error("expected failure")
})

test("success cleanup fails on truncated historical pages and retains the phase", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-cleanup-"))
  directories.push(directory)
  const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
  await successCheckpoint(directory, target)
  const truncated = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    catalogCleanup: async () => ({ success: true, data: {} }),
    catalogHistoricalCleanup: async () => ({
      success: true,
      data: { truncated: true, cleaned: [], scannedEvents: 100 },
    }),
    ...discoveryVerifyMocks(),
    stripeReconcile: async () =>
      createResult({
        status: "stripe-reconciled-checkpoint-retained" as const,
        session: "cs_test_123456789",
        customer: "retained",
        subscriptionsCanceled: 0,
        chargesRetained: 0,
        invoicesRetained: 0,
        paymentIntentsRetained: 0,
      }),
    stripeKey: "sk_test_mock",
    stripeAccountId: "acct_mock",
    stripeOrganizationId: "org_mock",
    stripeOrderProof: async () => ({
      success: true,
      data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
    }),
    mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" },
    mailCleanup: async () => createResult({ status: "verified-deleted" as const }),
  })
  expect(truncated.success).toBe(false)
  if (truncated.success) throw new Error("expected failure")
})

test("production success cleans historical catalog without a ticket purchase or live Stripe", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-cleanup-"))
  directories.push(directory)
  const target = { target: "production" as const, baseUrl: "https://eventoren.de" as const }
  const selected = ["SSO", "native auth HTTP", "native auth lifecycle"] as E2eCheckpoint["selectedWorkflows"]
  const initial: E2eCheckpoint = {
    version: 1,
    target: target.target,
    baseUrl: target.baseUrl,
    runId: "mtest-12345678-1234-1234-1234-123456789abc",
    createdAt: Date.now() - 1000,
    phase: "sso",
    selectedWorkflows: selected,
    completedWorkflows: [],
  }
  expect((await e2eCheckpointSave(directory, initial)).success).toBe(true)
  for (const count of [1, 2, 3]) {
    const { e2eCheckpointLoad } = await import("../checkpoint/e2eCheckpointLoad.ts")
    const loaded = await e2eCheckpointLoad(directory, target)
    if (!loaded.success || !loaded.data) throw new Error("Cannot build prod barrier")
    expect(
      (
        await e2eCheckpointSave(directory, {
          ...loaded.data,
          completedWorkflows: selected!.slice(0, count) as E2eCheckpoint["completedWorkflows"],
        })
      ).success,
    ).toBe(true)
  }
  const { e2eCheckpointLoad } = await import("../checkpoint/e2eCheckpointLoad.ts")
  const doneLoaded = await e2eCheckpointLoad(directory, target)
  if (!doneLoaded.success || !doneLoaded.data) throw new Error("Cannot finalize prod barrier")
  const checkpoint: E2eCheckpoint = { ...doneLoaded.data, cleanupPhase: "pending" }
  expect((await e2eCheckpointSave(directory, checkpoint)).success).toBe(true)
  let historicalCalls = 0
  const result = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    catalogHistoricalCleanup: async () => {
      historicalCalls++
      return { success: true, data: { truncated: false, cleaned: [], scannedEvents: 2 } }
    },
    ...discoveryVerifyMocks(),
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  expect(historicalCalls).toBe(1)
  expect(result.data?.stripe).toMatchObject({ status: "no-fixture" })
})

test("drains multiple event and orphan-order pages with staleAfterMs 0 across current and legacy fixtures", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-cleanup-"))
  directories.push(directory)
  const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
  const checkpoint = await successCheckpoint(directory, target)
  const currentEventKey = `ticket-e2e-${checkpoint.runId}`
  const legacyRunId = "mold-12345678-1234-1234-1234-123456789abc"
  const seenStale: (number | undefined)[] = []
  const eventPages: Record<string, { cleaned: unknown[]; continueCursor: string | null; isDone: boolean }> = {
    start: {
      cleaned: [{ eventKey: currentEventKey, runId: checkpoint.runId, kind: "ticket-e2e" }],
      continueCursor: "event-cursor-1",
      isDone: false,
    },
    "event-cursor-1": {
      cleaned: [
        { eventKey: `ticket-e2e-${legacyRunId}`, runId: legacyRunId, kind: "ticket-e2e" },
        {
          eventKey: "native-auth-12345678-1234-1234-1234-123456789abc",
          runId: "native-auth-12345678-1234-1234-1234-123456789abc",
          kind: "native-auth",
        },
      ],
      continueCursor: "event-cursor-2",
      isDone: false,
    },
    "event-cursor-2": {
      cleaned: [
        {
          eventKey: "readiness-technical-draft-20260914",
          runId: "readiness-technical-draft-20260914",
          kind: "readiness",
        },
        {
          eventKey: "technischer-checkout-test-keine-veranstaltung-e879ab05",
          runId: "technischer-checkout-test-keine-veranstaltung-e879ab05",
          kind: "technical-checkout",
        },
      ],
      continueCursor: null,
      isDone: true,
    },
  }
  const orphanPages: Record<string, { continueCursor: string | null; isDone: boolean }> = {
    start: { continueCursor: "orphan-cursor-1", isDone: false },
    "orphan-cursor-1": { continueCursor: null, isDone: true },
  }
  let providerCandidates: unknown = null
  const result = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    catalogCleanup: async () => ({ success: true, data: {} }),
    catalogHistoricalCleanup: async (args) => {
      seenStale.push(args.staleAfterMs)
      const key = args.cursor ?? "start"
      const page = eventPages[key]
      if (!page) return { success: false, errorMessage: "unexpected event cursor" }
      return {
        success: true,
        data: { scannedEvents: 100, skipped: [], ...page },
      }
    },
    orphanHistoricalCleanup: async (args) => {
      seenStale.push(args.staleAfterMs)
      const key = args.cursor ?? "start"
      const page = orphanPages[key]
      if (!page) return { success: false, errorMessage: "unexpected orphan cursor" }
      return {
        success: true,
        data: { scannedOrders: 100, orphanOrdersDeleted: 1, orphanTicketsDeleted: 1, ...page },
      }
    },
    stripeReconcile: async () =>
      createResult({
        status: "stripe-reconciled-checkpoint-retained" as const,
        session: "cs_test_123456789",
        customer: "retained",
        subscriptionsCanceled: 0,
        chargesRetained: 0,
        invoicesRetained: 0,
        paymentIntentsRetained: 0,
      }),
    stripeKey: "sk_test_mock",
    stripeAccountId: "acct_mock",
    stripeOrganizationId: "org_mock",
    stripeOrderProof: async () => ({
      success: true,
      data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
    }),
    mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" },
    mailCleanup: async () => createResult({ status: "verified-deleted" as const }),
    historicalStripeCleanup: async (args) => {
      providerCandidates = args.candidates
      return { success: true, data: { status: "stripe-historical-reconciled" as const } }
    },
    historicalMailCleanup: async () => ({ success: true, data: { status: "imap-historical-reconciled" as const } }),
    ...discoveryVerifyMocks(),
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  expect(seenStale.length).toBe(5)
  expect(seenStale.every((value) => value === 0)).toBe(true)
  const historical = (result.data as { historical: { cleaned: unknown[] } }).historical
  expect(historical.cleaned).toHaveLength(5)
  expect(providerCandidates).toHaveLength(5)
  expect(
    (result.data as { historical: { retainedOutsideOwnership: string } }).historical.retainedOutsideOwnership,
  ).toMatch(/generic test title alone/)
  expect((result.data as { historical: { orphanOrdersDeleted: number } }).historical.orphanOrdersDeleted).toBe(2)
})

test("fails on skipped identifiable candidates instead of silently leaving proven fixtures", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-cleanup-"))
  directories.push(directory)
  const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
  await successCheckpoint(directory, target)
  const skippedKey = "ticket-e2e-mold-12345678-1234-1234-1234-123456789abc"
  const result = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    catalogCleanup: async () => ({ success: true, data: {} }),
    catalogHistoricalCleanup: async () => ({
      success: true,
      data: {
        isDone: true,
        continueCursor: null,
        scannedEvents: 1,
        cleaned: [],
        skipped: [{ eventKey: skippedKey, reason: "Order lines do not prove the exact run product" }],
      },
    }),
    stripeReconcile: async () =>
      createResult({
        status: "stripe-reconciled-checkpoint-retained" as const,
        session: "cs_test_123456789",
        customer: "retained",
        subscriptionsCanceled: 0,
        chargesRetained: 0,
        invoicesRetained: 0,
        paymentIntentsRetained: 0,
      }),
    stripeKey: "sk_test_mock",
    stripeAccountId: "acct_mock",
    stripeOrganizationId: "org_mock",
    stripeOrderProof: async () => ({
      success: true,
      data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
    }),
    mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" },
    mailCleanup: async () => createResult({ status: "verified-deleted" as const }),
    ...discoveryVerifyMocks(),
  })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("expected failure")
  expect(result.errorMessage).toMatch(skippedKey)
})

test("retains ledger evidence when historical providers fail and resumes providers on retry", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-cleanup-"))
  directories.push(directory)
  const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
  const checkpoint = await successCheckpoint(directory, target)
  const historicalData = {
    isDone: true,
    continueCursor: null,
    scannedEvents: 1,
    cleaned: [{ eventKey: `ticket-e2e-${checkpoint.runId}`, runId: checkpoint.runId, kind: "ticket-e2e" }],
    skipped: [],
  }
  const base = {
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    catalogCleanup: async () => ({ success: true, data: {} }),
    catalogHistoricalCleanup: async () => ({ success: true, data: historicalData }),
    ...discoveryVerifyMocks(),
    stripeReconcile: async () =>
      createResult({
        status: "stripe-reconciled-checkpoint-retained" as const,
        session: "cs_test_123456789",
        customer: "retained",
        subscriptionsCanceled: 0,
        chargesRetained: 0,
        invoicesRetained: 0,
        paymentIntentsRetained: 0,
      }),
    stripeKey: "sk_test_mock",
    stripeAccountId: "acct_mock",
    stripeOrganizationId: "org_mock",
    stripeOrderProof: async () => ({
      success: true,
      data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
    }),
    mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" },
    mailCleanup: async () => createResult({ status: "verified-deleted" as const }),
  }
  const failed = await e2eSuccessCleanupRun({
    ...base,
    historicalStripeCleanup: async () => ({ success: false, errorMessage: "Stripe TEST expired-session unverified" }),
    historicalMailCleanup: async () => ({ success: true, data: { status: "imap-historical-reconciled" as const } }),
  })
  expect(failed.success).toBe(false)
  if (failed.success) throw new Error("expected failure")
  expect(failed.errorMessage).toMatch(/Historical provider cleanup unresolved/)
  const { readFile } = await import("node:fs/promises")
  const { join: joinPath } = await import("node:path")
  const ledger = JSON.parse(await readFile(joinPath(directory, `cleanup-ledger-${checkpoint.runId}.json`), "utf8"))
  expect(ledger.orderProof).toMatchObject({ paymentReference: "pi_1", orderReference: "order-1" })
  expect(ledger.historical.cleaned).toHaveLength(1)

  let mailCalls = 0
  const retried = await e2eSuccessCleanupRun({
    ...base,
    historicalStripeCleanup: async () => ({ success: true, data: { status: "stripe-historical-reconciled" as const } }),
    historicalMailCleanup: async () => {
      mailCalls++
      return { success: true, data: { status: "imap-historical-reconciled" as const } }
    },
  })
  expect(retried.success).toBe(true)
  if (!retried.success) throw new Error("expected success")
  expect(mailCalls).toBe(1)
})

test("preserves pre-deletion inventory across a lost deletion receipt and resumes providers on retry", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-crash-"))
  directories.push(directory)
  const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
  const checkpoint = await successCheckpoint(directory, target)
  const crashedKey = `ticket-e2e-${checkpoint.runId}`
  const preCandidates = [{ eventKey: crashedKey, runId: checkpoint.runId, kind: "ticket-e2e" }]
  const base = {
    ...discoveryVerifyMocks(),
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    catalogCleanup: async () => ({ success: true, data: {} }),
    catalogHistoricalDiscovery: async () => ({
      success: true,
      data: { isDone: true, continueCursor: null, candidates: preCandidates, scannedEvents: 1 },
    }),
    stripeReconcile: async () =>
      createResult({
        status: "stripe-reconciled-checkpoint-retained" as const,
        session: "cs_test_123456789",
        customer: "retained",
        subscriptionsCanceled: 0,
        chargesRetained: 0,
        invoicesRetained: 0,
        paymentIntentsRetained: 0,
      }),
    stripeKey: "sk_test_mock",
    stripeAccountId: "acct_mock",
    stripeOrganizationId: "org_mock",
    stripeOrderProof: async () => ({
      success: true,
      data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
    }),
    mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" },
    mailCleanup: async () => createResult({ status: "verified-deleted" as const }),
  }
  let providerCandidates: unknown = null
  const crashed = await e2eSuccessCleanupRun({
    ...base,
    catalogHistoricalDiscovery: async () => ({
      success: true,
      data: { isDone: true, continueCursor: null, candidates: preCandidates, scannedEvents: 1 },
    }),
    catalogHistoricalCleanup: async () => ({
      success: false,
      errorMessage: "lost mutation response after DB commit",
    }),
    historicalStripeCleanup: async (args: { candidates: unknown }) => {
      providerCandidates = args.candidates
      return { success: true, data: { status: "stripe-historical-reconciled" as const } }
    },
    historicalMailCleanup: async () => ({ success: true, data: { status: "imap-historical-reconciled" as const } }),
  })
  expect(crashed.success).toBe(false)
  if (crashed.success) throw new Error("expected failure")
  const { readFile } = await import("node:fs/promises")
  const { join: joinPath } = await import("node:path")
  const ledger = JSON.parse(await readFile(joinPath(directory, `cleanup-ledger-${checkpoint.runId}.json`), "utf8"))
  expect(ledger.preHistoricalCandidates.candidates).toMatchObject(preCandidates)

  const retried = await e2eSuccessCleanupRun({
    ...base,
    catalogHistoricalCleanup: async () => ({
      success: true,
      data: { isDone: true, continueCursor: null, scannedEvents: 1, cleaned: [], skipped: [] },
    }),
    catalogHistoricalDiscovery: async () => ({
      success: true,
      data: { isDone: true, continueCursor: null, candidates: [], scannedEvents: 1 },
    }),
    historicalStripeCleanup: async (args: { candidates: { eventKey: string }[] }) => {
      providerCandidates = args.candidates
      return { success: true, data: { status: "stripe-historical-reconciled" as const } }
    },
    historicalMailCleanup: async () => ({ success: true, data: { status: "imap-historical-reconciled" as const } }),
  })
  expect(retried.success).toBe(true)
  if (!retried.success) throw new Error("expected success")
  expect(providerCandidates).toContainEqual(expect.objectContaining({ eventKey: crashedKey }))
})

test("refuses to clear state while final absence verification retains disposable resources", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-verify-"))
  directories.push(directory)
  const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
  const checkpoint = await successCheckpoint(directory, target)
  const historicalData = {
    isDone: true,
    continueCursor: null,
    scannedEvents: 1,
    cleaned: [{ eventKey: `ticket-e2e-${checkpoint.runId}`, runId: checkpoint.runId, kind: "ticket-e2e" }],
    skipped: [],
  }
  const base = {
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    catalogCleanup: async () => ({ success: true, data: {} }),
    catalogHistoricalCleanup: async () => ({ success: true, data: historicalData }),
    catalogHistoricalDiscovery: async () => ({
      success: true,
      data: { isDone: true, continueCursor: null, candidates: [], scannedEvents: 1 },
    }),
    snapshotHistoricalDiscovery: async () => ({
      success: true,
      data: { isDone: true, continueCursor: null, candidates: [], scannedSnapshots: 1, activeVersion: 0 },
    }),
    snapshotHistoricalCleanup: async () => ({
      success: true,
      data: {
        isDone: true,
        continueCursor: null,
        scannedSnapshots: 1,
        activeVersion: 0,
        cleanedVersions: [],
        deletedChunks: 0,
        skippedVersions: [],
      },
    }),
    snapshotExportVerify: async () => ({ success: true, data: { status: "snapshot-export-clean" as const } }),
    stripeReconcile: async () =>
      createResult({
        status: "stripe-reconciled-checkpoint-retained" as const,
        session: "cs_test_123456789",
        customer: "retained",
        subscriptionsCanceled: 0,
        chargesRetained: 0,
        invoicesRetained: 0,
        paymentIntentsRetained: 0,
      }),
    stripeKey: "sk_test_mock",
    stripeAccountId: "acct_mock",
    stripeOrganizationId: "org_mock",
    stripeOrderProof: async () => ({
      success: true,
      data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
    }),
    mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" },
    mailCleanup: async () => createResult({ status: "verified-deleted" as const }),
    historicalStripeCleanup: async () => ({ success: true, data: { status: "stripe-historical-reconciled" as const } }),
    historicalMailCleanup: async () => ({ success: true, data: { status: "imap-historical-reconciled" as const } }),
    authSessionDiscovery: async () => ({
      success: true,
      data: { isDone: true, continueCursor: null, sessions: [], scannedSessions: 0 },
    }),
    authSessionCleanup: async () => ({
      success: true,
      data: { deletedSessionIds: [], deletedCount: 0, callerDeleted: false, remainingMarkedOthers: 0 },
    }),
    authSessionMark: async () => ({ success: false, errorMessage: "unexpected mark without owned evidence" }),
  }
  const residual = await e2eSuccessCleanupRun({
    ...base,
    historicalStripeVerify: async () => ({
      success: false,
      errorMessage: "Historical Stripe retains disposable open sessions",
    }),
  })
  expect(residual.success).toBe(false)
  if (residual.success) throw new Error("expected failure")
  expect(residual.errorMessage).toMatch(/Final absence verification unresolved/)

  const lingeringDb = await e2eSuccessCleanupRun({
    ...base,
    catalogHistoricalDiscovery: async () => ({
      success: true,
      data: {
        isDone: true,
        continueCursor: null,
        candidates: [{ eventKey: `ticket-e2e-${checkpoint.runId}` }],
        scannedEvents: 1,
      },
    }),
    historicalStripeVerify: async () => ({ success: true, data: { status: "stripe-historical-absent" as const } }),
    historicalMailVerify: async () => ({ success: true, data: { status: "imap-historical-absent" as const } }),
  })
  expect(lingeringDb.success).toBe(false)
  if (lingeringDb.success) throw new Error("expected failure")
  expect(lingeringDb.errorMessage).toMatch(/Final absence verification unresolved/)
})

test("cleans snapshot-only historical residue with no event candidate and persists versions before deletion", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-snapshot-"))
  directories.push(directory)
  const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
  const checkpoint = await successCheckpoint(directory, target)
  const snapshotCandidate = { version: 7, kind: "ticket-e2e", eventKey: "ticket-e2e-old", chunkCount: 2 }
  let discoveryCalls = 0
  let cleanupCalls = 0
  let ledgerPersistedBeforeCleanup = false
  const result = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    catalogCleanup: async () => ({ success: true, data: {} }),
    catalogHistoricalCleanup: async () => ({
      success: true,
      data: { isDone: true, continueCursor: null, scannedEvents: 1, cleaned: [], skipped: [] },
    }),
    ...discoveryVerifyMocks(),
    snapshotHistoricalDiscovery: async () => {
      discoveryCalls++
      if (discoveryCalls === 1)
        return {
          success: true,
          data: {
            isDone: true,
            continueCursor: null,
            candidates: [snapshotCandidate],
            scannedSnapshots: 20,
            activeVersion: 9,
          },
        }
      return {
        success: true,
        data: { isDone: true, continueCursor: null, candidates: [], scannedSnapshots: 20, activeVersion: 9 },
      }
    },
    snapshotHistoricalCleanup: async () => {
      cleanupCalls++
      const { readFile: readLedger } = await import("node:fs/promises")
      const { join: joinLedger } = await import("node:path")
      try {
        const ledger = JSON.parse(
          await readLedger(joinLedger(directory, `cleanup-ledger-${checkpoint.runId}.json`), "utf8"),
        )
        ledgerPersistedBeforeCleanup =
          Array.isArray(ledger?.preSnapshotCandidates?.candidates) &&
          ledger.preSnapshotCandidates.candidates.some((entry: { version: number }) => entry?.version === 7) &&
          ledger?.historical !== undefined
      } catch {
        ledgerPersistedBeforeCleanup = false
      }
      return {
        success: true,
        data: {
          isDone: true,
          continueCursor: null,
          scannedSnapshots: 20,
          activeVersion: 9,
          cleanedVersions: [
            { version: 7, kinds: ["ticket-e2e"], eventKeys: ["ticket-e2e-old"], chunkCount: 2, action: "deleted" },
          ],
          deletedChunks: 2,
          skippedVersions: [],
        },
      }
    },
    stripeReconcile: async () =>
      createResult({
        status: "stripe-reconciled-checkpoint-retained" as const,
        session: "cs_test_123456789",
        customer: "retained",
        subscriptionsCanceled: 0,
        chargesRetained: 0,
        invoicesRetained: 0,
        paymentIntentsRetained: 0,
      }),
    stripeKey: "sk_test_mock",
    stripeAccountId: "acct_mock",
    stripeOrganizationId: "org_mock",
    stripeOrderProof: async () => ({
      success: true,
      data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
    }),
    mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" },
    mailCleanup: async () => createResult({ status: "verified-deleted" as const }),
    historicalStripeCleanup: async () => ({ success: true, data: { status: "stripe-historical-reconciled" as const } }),
    historicalMailCleanup: async () => ({ success: true, data: { status: "imap-historical-reconciled" as const } }),
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  expect(cleanupCalls).toBe(1)
  expect(discoveryCalls).toBeGreaterThanOrEqual(2)
  expect(ledgerPersistedBeforeCleanup).toBe(true)
  expect((result.data as { snapshots: { cleanedVersions: unknown[] } }).snapshots.cleanedVersions).toMatchObject([
    { version: 7, action: "deleted" },
  ])
  expect((result.data as { preSnapshots: { candidates: unknown[] } }).preSnapshots.candidates).toMatchObject([
    snapshotCandidate,
  ])
})

test("retains the checkpoint and version ledger when snapshot deletion fails", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-snapshot-fail-"))
  directories.push(directory)
  const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
  const checkpoint = await successCheckpoint(directory, target)
  const snapshotCandidate = { version: 7, kind: "ticket-e2e", eventKey: "ticket-e2e-old", chunkCount: 2 }
  const result = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    catalogCleanup: async () => ({ success: true, data: {} }),
    catalogHistoricalCleanup: async () => ({
      success: true,
      data: { isDone: true, continueCursor: null, scannedEvents: 1, cleaned: [], skipped: [] },
    }),
    ...discoveryVerifyMocks(),
    snapshotHistoricalDiscovery: async () => ({
      success: true,
      data: {
        isDone: true,
        continueCursor: null,
        candidates: [snapshotCandidate],
        scannedSnapshots: 20,
        activeVersion: 9,
      },
    }),
    snapshotHistoricalCleanup: async () => ({ success: false, errorMessage: "snapshot page unavailable" }),
    stripeReconcile: async () =>
      createResult({
        status: "stripe-reconciled-checkpoint-retained" as const,
        session: "cs_test_123456789",
        customer: "retained",
        subscriptionsCanceled: 0,
        chargesRetained: 0,
        invoicesRetained: 0,
        paymentIntentsRetained: 0,
      }),
    stripeKey: "sk_test_mock",
    stripeAccountId: "acct_mock",
    stripeOrganizationId: "org_mock",
    stripeOrderProof: async () => ({
      success: true,
      data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
    }),
    mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" },
    mailCleanup: async () => createResult({ status: "verified-deleted" as const }),
    historicalStripeCleanup: async () => ({ success: true, data: { status: "stripe-historical-reconciled" as const } }),
    historicalMailCleanup: async () => ({ success: true, data: { status: "imap-historical-reconciled" as const } }),
  })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("expected failure")
  expect(result.errorMessage).toMatch(/Historical snapshot sweep unresolved/)
  const { readFile } = await import("node:fs/promises")
  const { join: joinPath } = await import("node:path")
  const ledger = JSON.parse(await readFile(joinPath(directory, `cleanup-ledger-${checkpoint.runId}.json`), "utf8"))
  expect(ledger.preSnapshotCandidates.candidates).toMatchObject([snapshotCandidate])
  const { e2eCheckpointLoad } = await import("../checkpoint/e2eCheckpointLoad.ts")
  const retained = await e2eCheckpointLoad(directory, target)
  expect(retained.success).toBe(true)
  if (!retained.success) throw new Error("expected success")
  expect(retained.data?.cleanupPhase).toBe("pending")
})

test("fails final verification while retaining the checkpoint when snapshot residue remains", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-snapshot-final-"))
  directories.push(directory)
  const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
  await successCheckpoint(directory, target)
  const snapshotCandidate = { version: 7, kind: "ticket-e2e", eventKey: "ticket-e2e-old", chunkCount: 2 }
  let discoveryCalls = 0
  const result = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    catalogCleanup: async () => ({ success: true, data: {} }),
    catalogHistoricalCleanup: async () => ({
      success: true,
      data: { isDone: true, continueCursor: null, scannedEvents: 1, cleaned: [], skipped: [] },
    }),
    ...discoveryVerifyMocks(),
    snapshotHistoricalDiscovery: async () => {
      discoveryCalls++
      return {
        success: true,
        data: {
          isDone: true,
          continueCursor: null,
          candidates: [snapshotCandidate],
          scannedSnapshots: 20,
          activeVersion: 9,
        },
      }
    },
    snapshotHistoricalCleanup: async () => ({
      success: true,
      data: {
        isDone: true,
        continueCursor: null,
        scannedSnapshots: 20,
        activeVersion: 9,
        cleanedVersions: [],
        deletedChunks: 0,
        skippedVersions: [],
      },
    }),
    stripeReconcile: async () =>
      createResult({
        status: "stripe-reconciled-checkpoint-retained" as const,
        session: "cs_test_123456789",
        customer: "retained",
        subscriptionsCanceled: 0,
        chargesRetained: 0,
        invoicesRetained: 0,
        paymentIntentsRetained: 0,
      }),
    stripeKey: "sk_test_mock",
    stripeAccountId: "acct_mock",
    stripeOrganizationId: "org_mock",
    stripeOrderProof: async () => ({
      success: true,
      data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
    }),
    mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" },
    mailCleanup: async () => createResult({ status: "verified-deleted" as const }),
    historicalStripeCleanup: async () => ({ success: true, data: { status: "stripe-historical-reconciled" as const } }),
    historicalMailCleanup: async () => ({ success: true, data: { status: "imap-historical-reconciled" as const } }),
  })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("expected failure")
  expect(result.errorMessage).toMatch(/Final snapshot absence verification unresolved/)
  expect(discoveryCalls).toBeGreaterThanOrEqual(2)
})

test("production historical TEST cleanup runs while live financial history stays excluded and current purchases stay zero", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-prod-historical-"))
  directories.push(directory)
  const target = { target: "production" as const, baseUrl: "https://eventoren.de" as const }
  const selected = ["SSO", "native auth HTTP", "native auth lifecycle"] as E2eCheckpoint["selectedWorkflows"]
  const initial: E2eCheckpoint = {
    version: 1,
    target: target.target,
    baseUrl: target.baseUrl,
    runId: "mtest-12345678-1234-1234-1234-123456789abc",
    createdAt: Date.now() - 1000,
    phase: "sso",
    selectedWorkflows: selected,
    completedWorkflows: [],
  }
  expect((await e2eCheckpointSave(directory, initial)).success).toBe(true)
  for (const count of [1, 2, 3]) {
    const { e2eCheckpointLoad } = await import("../checkpoint/e2eCheckpointLoad.ts")
    const loaded = await e2eCheckpointLoad(directory, target)
    if (!loaded.success || !loaded.data) throw new Error("Cannot build prod barrier")
    expect(
      (
        await e2eCheckpointSave(directory, {
          ...loaded.data,
          completedWorkflows: selected!.slice(0, count) as E2eCheckpoint["completedWorkflows"],
        })
      ).success,
    ).toBe(true)
  }
  const { e2eCheckpointLoad } = await import("../checkpoint/e2eCheckpointLoad.ts")
  const doneLoaded = await e2eCheckpointLoad(directory, target)
  if (!doneLoaded.success || !doneLoaded.data) throw new Error("Cannot finalize prod barrier")
  expect((await e2eCheckpointSave(directory, { ...doneLoaded.data, cleanupPhase: "pending" })).success).toBe(true)
  const ticketKey = "ticket-e2e-mold-12345678-1234-1234-1234-123456789abc"
  const technicalKey = "technischer-checkout-test-keine-veranstaltung-e879ab05"
  let stripeCleanupCalls = 0
  let stripeCleanupCandidates: { eventKey: string }[] = []
  let mailCleanupCalls = 0
  let stripeVerifyCalls = 0
  let mailVerifyCalls = 0
  const result = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    catalogHistoricalCleanup: async () => ({
      success: true,
      data: {
        truncated: false,
        cleaned: [
          { eventKey: ticketKey, runId: "mold-12345678-1234-1234-1234-123456789abc", kind: "ticket-e2e" },
          { eventKey: technicalKey, kind: "technical-checkout" },
        ],
        scannedEvents: 2,
      },
    }),
    ...discoveryVerifyMocks(),
    stripeKey: "sk_test_mock123",
    stripeAccountId: "acct_mock123",
    stripeOrganizationId: "org_mock",
    mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" },
    historicalStripeCleanup: async (args) => {
      stripeCleanupCalls++
      stripeCleanupCandidates = args.candidates as { eventKey: string }[]
      return {
        success: true,
        data: {
          status: "stripe-historical-reconciled" as const,
          sessionsExpired: 1,
          retainedLive: ["cs_live_technical"],
          chargesRetained: "untouched" as const,
          invoicesRetained: "untouched" as const,
          paymentIntentsRetained: "untouched" as const,
        },
      }
    },
    historicalMailCleanup: async () => {
      mailCleanupCalls++
      return { success: true, data: { status: "imap-historical-reconciled" as const } }
    },
    historicalStripeVerify: async () => {
      stripeVerifyCalls++
      return { success: true, data: { status: "stripe-historical-absent" as const } }
    },
    historicalMailVerify: async () => {
      mailVerifyCalls++
      return { success: true, data: { status: "imap-historical-absent" as const } }
    },
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  expect(stripeCleanupCalls).toBe(1)
  expect(stripeCleanupCandidates.map((entry) => entry.eventKey)).toContain(ticketKey)
  expect(mailCleanupCalls).toBe(1)
  expect(stripeVerifyCalls).toBe(1)
  expect(mailVerifyCalls).toBe(1)
  expect(result.data?.stripe).toMatchObject({ status: "no-fixture" })
  expect(result.data?.mail).toMatchObject({ status: "no-fixture" })
  expect(result.data?.historicalProviders).toMatchObject({
    stripe: { status: "stripe-historical-reconciled", retainedLive: ["cs_live_technical"] },
  })
  expect((result.data?.historicalProviders as { stripe: { chargesRetained: string } }).stripe.chargesRetained).toBe(
    "untouched",
  )
})

test("production historical provider failure retains the checkpoint for retry", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-prod-fail-"))
  directories.push(directory)
  const target = { target: "production" as const, baseUrl: "https://eventoren.de" as const }
  const selected = ["SSO", "native auth HTTP", "native auth lifecycle"] as E2eCheckpoint["selectedWorkflows"]
  const initial: E2eCheckpoint = {
    version: 1,
    target: target.target,
    baseUrl: target.baseUrl,
    runId: "mtest-12345678-1234-1234-1234-123456789abc",
    createdAt: Date.now() - 1000,
    phase: "sso",
    selectedWorkflows: selected,
    completedWorkflows: [],
  }
  expect((await e2eCheckpointSave(directory, initial)).success).toBe(true)
  for (const count of [1, 2, 3]) {
    const { e2eCheckpointLoad } = await import("../checkpoint/e2eCheckpointLoad.ts")
    const loaded = await e2eCheckpointLoad(directory, target)
    if (!loaded.success || !loaded.data) throw new Error("Cannot build prod barrier")
    expect(
      (
        await e2eCheckpointSave(directory, {
          ...loaded.data,
          completedWorkflows: selected!.slice(0, count) as E2eCheckpoint["completedWorkflows"],
        })
      ).success,
    ).toBe(true)
  }
  const { e2eCheckpointLoad: loadFinal } = await import("../checkpoint/e2eCheckpointLoad.ts")
  const doneLoaded = await loadFinal(directory, target)
  if (!doneLoaded.success || !doneLoaded.data) throw new Error("Cannot finalize prod barrier")
  expect((await e2eCheckpointSave(directory, { ...doneLoaded.data, cleanupPhase: "pending" })).success).toBe(true)
  const result = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    catalogHistoricalCleanup: async () => ({
      success: true,
      data: {
        truncated: false,
        cleaned: [{ eventKey: "ticket-e2e-mold-12345678-1234-1234-1234-123456789abc", kind: "ticket-e2e" }],
        scannedEvents: 1,
      },
    }),
    ...discoveryVerifyMocks(),
    stripeKey: "sk_test_mock123",
    stripeAccountId: "acct_mock123",
    stripeOrganizationId: "org_mock",
    mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" },
    historicalStripeCleanup: async () => ({ success: false, errorMessage: "Stripe TEST expired-session unverified" }),
    historicalMailCleanup: async () => ({ success: true, data: { status: "imap-historical-reconciled" as const } }),
  })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("expected failure")
  expect(result.errorMessage).toMatch(/Historical provider cleanup unresolved/)
  const { e2eCheckpointLoad: loadRetained } = await import("../checkpoint/e2eCheckpointLoad.ts")
  const retained = await loadRetained(directory, target)
  expect(retained.success).toBe(true)
  if (!retained.success) throw new Error("expected success")
  expect(retained.data?.cleanupPhase).toBe("pending")
})

test("empty historical providers verify absent without TEST credentials", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-empty-providers-"))
  directories.push(directory)
  const target = { target: "production" as const, baseUrl: "https://eventoren.de" as const }
  const selected = ["SSO", "native auth HTTP", "native auth lifecycle"] as E2eCheckpoint["selectedWorkflows"]
  const initial: E2eCheckpoint = {
    version: 1,
    target: target.target,
    baseUrl: target.baseUrl,
    runId: "mtest-12345678-1234-1234-1234-123456789abc",
    createdAt: Date.now() - 1000,
    phase: "sso",
    selectedWorkflows: selected,
    completedWorkflows: [],
  }
  expect((await e2eCheckpointSave(directory, initial)).success).toBe(true)
  for (const count of [1, 2, 3]) {
    const { e2eCheckpointLoad } = await import("../checkpoint/e2eCheckpointLoad.ts")
    const loaded = await e2eCheckpointLoad(directory, target)
    if (!loaded.success || !loaded.data) throw new Error("Cannot build prod barrier")
    expect(
      (
        await e2eCheckpointSave(directory, {
          ...loaded.data,
          completedWorkflows: selected!.slice(0, count) as E2eCheckpoint["completedWorkflows"],
        })
      ).success,
    ).toBe(true)
  }
  const { e2eCheckpointLoad } = await import("../checkpoint/e2eCheckpointLoad.ts")
  const doneLoaded = await e2eCheckpointLoad(directory, target)
  if (!doneLoaded.success || !doneLoaded.data) throw new Error("Cannot finalize prod barrier")
  expect((await e2eCheckpointSave(directory, { ...doneLoaded.data, cleanupPhase: "pending" })).success).toBe(true)
  const result = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    catalogHistoricalCleanup: async () => ({
      success: true,
      data: { truncated: false, cleaned: [], scannedEvents: 1 },
    }),
    ...discoveryVerifyMocks(),
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  expect(result.data?.historicalProviders).toMatchObject({
    stripe: { status: "no-fixture" },
    mail: { status: "no-fixture" },
  })
  // Empty DB/ledger with no proven TEST keys and no credentials legitimately
  // reports no-fixture/absent via the helpers (unverified provider inventory,
  // not a proven global zero when a provider is configured as required).
  // Provider scans/verifiers are still invoked with [] instead of early-return.
  expect(result.data?.finalAbsence).toMatchObject({
    stripe: { status: "stripe-historical-absent" },
    mail: { status: "imap-historical-absent" },
  })
})

test("empty DB/ledger still runs provider scans+verifiers incl prod; orphan TEST cleaned, live retained", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-empty-orphan-"))
  directories.push(directory)
  const target = { target: "production" as const, baseUrl: "https://eventoren.de" as const }
  const selected = ["SSO", "native auth HTTP", "native auth lifecycle"] as E2eCheckpoint["selectedWorkflows"]
  const initial: E2eCheckpoint = {
    version: 1,
    target: target.target,
    baseUrl: target.baseUrl,
    runId: "mtest-12345678-1234-1234-1234-123456789abc",
    createdAt: Date.now() - 1000,
    phase: "sso",
    selectedWorkflows: selected,
    completedWorkflows: [],
  }
  expect((await e2eCheckpointSave(directory, initial)).success).toBe(true)
  for (const count of [1, 2, 3]) {
    const { e2eCheckpointLoad } = await import("../checkpoint/e2eCheckpointLoad.ts")
    const loaded = await e2eCheckpointLoad(directory, target)
    if (!loaded.success || !loaded.data) throw new Error("Cannot build prod barrier")
    expect(
      (
        await e2eCheckpointSave(directory, {
          ...loaded.data,
          completedWorkflows: selected!.slice(0, count) as E2eCheckpoint["completedWorkflows"],
        })
      ).success,
    ).toBe(true)
  }
  const { e2eCheckpointLoad } = await import("../checkpoint/e2eCheckpointLoad.ts")
  const doneLoaded = await e2eCheckpointLoad(directory, target)
  if (!doneLoaded.success || !doneLoaded.data) throw new Error("Cannot finalize prod barrier")
  expect((await e2eCheckpointSave(directory, { ...doneLoaded.data, cleanupPhase: "pending" })).success).toBe(true)

  let stripeCleanupCalls = 0
  let stripeCleanupCandidates: unknown = null
  let mailCleanupCalls = 0
  let mailCleanupCandidates: unknown = null
  let stripeVerifyCalls = 0
  let stripeVerifyCandidates: unknown = null
  let mailVerifyCalls = 0
  let mailVerifyCandidates: unknown = null
  const result = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    catalogHistoricalCleanup: async () => ({
      success: true,
      data: { truncated: false, cleaned: [], scannedEvents: 1 },
    }),
    ...discoveryVerifyMocks(),
    // Valid registered TEST format: adapter must still invoke scans/verifiers
    // with [] so helpers can perform global owned-TEST discovery.
    stripeKey: "sk_test_mock123",
    stripeAccountId: "acct_mock123",
    stripeOrganizationId: "org_mock",
    mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" },
    historicalStripeCleanup: async (args) => {
      stripeCleanupCalls++
      stripeCleanupCandidates = args.candidates
      return {
        success: true,
        data: {
          status: "stripe-historical-reconciled" as const,
          sessionsExpired: 1,
          retainedLive: ["cs_live_orphan"],
          chargesRetained: "untouched" as const,
          invoicesRetained: "untouched" as const,
          paymentIntentsRetained: "untouched" as const,
        },
      }
    },
    historicalMailCleanup: async (args) => {
      mailCleanupCalls++
      mailCleanupCandidates = args.candidates
      return { success: true, data: { status: "imap-historical-reconciled" as const, verifiedDeleted: 1 } }
    },
    historicalStripeVerify: async (args) => {
      stripeVerifyCalls++
      stripeVerifyCandidates = args.candidates
      return { success: true, data: { status: "stripe-historical-absent" as const } }
    },
    historicalMailVerify: async (args) => {
      mailVerifyCalls++
      mailVerifyCandidates = args.candidates
      return { success: true, data: { status: "imap-historical-absent" as const } }
    },
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  // Empty DB/ledger must not skip provider discovery: all four hooks run with [].
  expect(stripeCleanupCalls).toBe(1)
  expect(mailCleanupCalls).toBe(1)
  expect(stripeVerifyCalls).toBe(1)
  expect(mailVerifyCalls).toBe(1)
  expect(stripeCleanupCandidates).toEqual([])
  expect(mailCleanupCandidates).toEqual([])
  expect(stripeVerifyCandidates).toEqual([])
  expect(mailVerifyCandidates).toEqual([])
  // Orphan TEST found+cleaned; live/financial history untouched, no refunds.
  expect(result.data?.historicalProviders).toMatchObject({
    stripe: { status: "stripe-historical-reconciled", retainedLive: ["cs_live_orphan"] },
  })
  expect((result.data?.historicalProviders as { stripe: { chargesRetained: string } }).stripe.chargesRetained).toBe(
    "untouched",
  )
})

test("empty DB/ledger provider verify failure retains phase", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-empty-verify-fail-"))
  directories.push(directory)
  const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
  await successCheckpoint(directory, target)
  let stripeVerifyCalls = 0
  let mailVerifyCalls = 0
  const result = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    catalogCleanup: async () => ({ success: true, data: {} }),
    catalogHistoricalCleanup: async () => ({
      success: true,
      data: { truncated: false, cleaned: [], scannedEvents: 1 },
    }),
    ...discoveryVerifyMocks(),
    stripeKey: "sk_test_mock123",
    stripeAccountId: "acct_mock123",
    stripeOrganizationId: "org_mock",
    mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" },
    mailCleanup: async () => createResult({ status: "verified-deleted" as const }),
    historicalStripeCleanup: async (args) => {
      expect(args.candidates).toEqual([])
      return { success: true, data: { status: "stripe-historical-reconciled" as const } }
    },
    historicalMailCleanup: async (args) => {
      expect(args.candidates).toEqual([])
      return { success: true, data: { status: "imap-historical-reconciled" as const } }
    },
    historicalStripeVerify: async (args) => {
      stripeVerifyCalls++
      expect(args.candidates).toEqual([])
      return { success: true, data: { status: "stripe-historical-absent" as const } }
    },
    historicalMailVerify: async (args) => {
      mailVerifyCalls++
      expect(args.candidates).toEqual([])
      return { success: false, errorMessage: "Historical IMAP retains disposable confirmations" }
    },
    stripeReconcile: async () =>
      createResult({
        status: "stripe-reconciled-checkpoint-retained" as const,
        session: "cs_test_123456789",
        customer: "retained",
        subscriptionsCanceled: 0,
        chargesRetained: 0,
        invoicesRetained: 0,
        paymentIntentsRetained: 0,
      }),
    stripeOrderProof: async () => ({
      success: true,
      data: { paymentReference: "pi_1", orderReference: "order-1", status: "paid", paymentStatus: "paid" },
    }),
  })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("expected failure")
  expect(result.errorMessage).toMatch(/Final absence verification unresolved/)
  // Verifiers ran even with []: failure is proven, not skipped.
  expect(stripeVerifyCalls).toBe(1)
  expect(mailVerifyCalls).toBe(1)
  const { e2eCheckpointLoad } = await import("../checkpoint/e2eCheckpointLoad.ts")
  const retained = await e2eCheckpointLoad(directory, target)
  expect(retained.success).toBe(true)
  if (!retained.success) throw new Error("expected success")
  expect(retained.data?.cleanupPhase).toBe("pending")
})

async function successPublicCheckpoint(directory: string, target: Pick<E2eCheckpoint, "target" | "baseUrl">) {
  const selected = ["SSO", "native auth HTTP", "native auth lifecycle"] as E2eCheckpoint["selectedWorkflows"]
  const initial: E2eCheckpoint = {
    version: 1,
    target: target.target,
    baseUrl: target.baseUrl,
    runId: "mhttp-12345678-1234-1234-1234-123456789abc",
    createdAt: Date.now() - 1000,
    phase: "sso",
    selectedWorkflows: selected,
    completedWorkflows: [],
  }
  expect((await e2eCheckpointSave(directory, initial)).success).toBe(true)
  for (const count of [1, 2, 3]) {
    const { e2eCheckpointLoad } = await import("../checkpoint/e2eCheckpointLoad.ts")
    const loaded = await e2eCheckpointLoad(directory, target)
    if (!loaded.success || !loaded.data) throw new Error("Cannot build public barrier")
    expect(
      (
        await e2eCheckpointSave(directory, {
          ...loaded.data,
          completedWorkflows: selected!.slice(0, count) as E2eCheckpoint["completedWorkflows"],
        })
      ).success,
    ).toBe(true)
  }
  const { e2eCheckpointLoad: loadFinal } = await import("../checkpoint/e2eCheckpointLoad.ts")
  const doneLoaded = await loadFinal(directory, target)
  if (!doneLoaded.success || !doneLoaded.data) throw new Error("Cannot finalize public barrier")
  expect((await e2eCheckpointSave(directory, { ...doneLoaded.data, cleanupPhase: "pending" })).success).toBe(true)
  return doneLoaded.data as E2eCheckpoint & { runId: string }
}

async function httpVerifiedWrite(directory: string, target: Pick<E2eCheckpoint, "target" | "baseUrl">, runId: string) {
  const createdAt = Date.now() - 1000
  const base = {
    version: 1 as const,
    target: target.target,
    baseUrl: target.baseUrl,
    runId,
    createdAt,
    workflow: "native auth HTTP" as const,
  }
  expect(
    (
      await nativeAuthHttpCheckpoint.save(directory, {
        ...base,
        step: "authenticated-bootstrap" as const,
        status: "started" as const,
      })
    ).success,
  ).toBe(true)
  expect(
    (
      await nativeAuthHttpCheckpoint.save(directory, {
        ...base,
        step: "authenticated-bootstrap" as const,
        status: "completed" as const,
      })
    ).success,
  ).toBe(true)
  expect(
    (
      await nativeAuthHttpCheckpoint.save(directory, {
        ...base,
        step: "anonymous-catalogue" as const,
        status: "completed" as const,
      })
    ).success,
  ).toBe(true)
}

test("retires the owned HTTP checkpoint after final absence and leaves only the main checkpoint", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-http-"))
  directories.push(directory)
  const target = { target: "production" as const, baseUrl: "https://eventoren.de" as const }
  const checkpoint = await successPublicCheckpoint(directory, target)
  await httpVerifiedWrite(directory, target, checkpoint.runId)
  await writeFile(join(directory, "native-auth-lifecycle-checkpoint.json"), JSON.stringify({ version: 1 }), {
    mode: 0o600,
  })
  let authDiscoveryCalls = 0
  const result = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    catalogCleanup: async () => ({ success: true, data: {} }),
    catalogHistoricalCleanup: async () => ({
      success: true,
      data: { truncated: false, cleaned: [], scannedEvents: 1 },
    }),
    ...discoveryVerifyMocks(),
    authSessionDiscovery: async () => {
      authDiscoveryCalls++
      return { success: true, data: { isDone: true, continueCursor: null, sessions: [], scannedSessions: 0 } }
    },
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  expect(result.data?.httpCheckpoint).toMatchObject({ retired: true })
  expect(authDiscoveryCalls).toBeGreaterThan(0)
  const reloaded = await nativeAuthHttpCheckpoint.load(directory, target)
  expect(reloaded.success).toBe(true)
  if (!reloaded.success) throw new Error("expected success")
  expect(reloaded.data).toBe(null)
  expect((await readdir(directory)).sort()).toEqual(["checkpoint.json"])
})

test("lingering provider absence failure retains the HTTP checkpoint for retry", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-http-lingering-"))
  directories.push(directory)
  const target = { target: "production" as const, baseUrl: "https://eventoren.de" as const }
  const checkpoint = await successPublicCheckpoint(directory, target)
  await httpVerifiedWrite(directory, target, checkpoint.runId)
  let authDiscoveryCalls = 0
  let authCleanupCalls = 0
  const result = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    catalogCleanup: async () => ({ success: true, data: {} }),
    catalogHistoricalCleanup: async () => ({
      success: true,
      data: { truncated: false, cleaned: [], scannedEvents: 1 },
    }),
    ...discoveryVerifyMocks(),
    historicalStripeVerify: async () => ({
      success: false,
      errorMessage: "Historical Stripe retains disposable open sessions",
    }),
    authSessionDiscovery: async () => {
      authDiscoveryCalls++
      return { success: true, data: { isDone: true, continueCursor: null, sessions: [], scannedSessions: 0 } }
    },
    authSessionCleanup: async () => {
      authCleanupCalls++
      return {
        success: true,
        data: { deletedSessionIds: [], deletedCount: 0, callerDeleted: false, remainingMarkedOthers: 0 },
      }
    },
  })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("expected failure")
  expect(result.errorMessage).toMatch(/Final absence verification unresolved/)
  expect(authDiscoveryCalls).toBe(0)
  expect(authCleanupCalls).toBe(0)
  const retained = await nativeAuthHttpCheckpoint.load(directory, target)
  expect(retained.success).toBe(true)
  if (!retained.success) throw new Error("expected success")
  expect(retained.data).toMatchObject({ runId: checkpoint.runId, step: "anonymous-catalogue" })
})

test("foreign HTTP checkpoint refuses retirement before any caller deletion", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-success-http-foreign-"))
  directories.push(directory)
  const target = { target: "production" as const, baseUrl: "https://eventoren.de" as const }
  const checkpoint = await successPublicCheckpoint(directory, target)
  const createdAt = Date.now() - 1000
  expect(
    (
      await nativeAuthHttpCheckpoint.save(directory, {
        version: 1,
        target: "development",
        baseUrl: "https://eventoren.leonardomora.de",
        runId: checkpoint.runId,
        createdAt,
        workflow: "native auth HTTP",
        step: "authenticated-bootstrap",
        status: "completed",
      })
    ).success,
  ).toBe(true)
  let authDiscoveryCalls = 0
  let authCleanupCalls = 0
  const result = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    catalogCleanup: async () => ({ success: true, data: {} }),
    catalogHistoricalCleanup: async () => ({
      success: true,
      data: { truncated: false, cleaned: [], scannedEvents: 1 },
    }),
    ...discoveryVerifyMocks(),
    authSessionDiscovery: async () => {
      authDiscoveryCalls++
      return { success: true, data: { isDone: true, continueCursor: null, sessions: [], scannedSessions: 0 } }
    },
    authSessionCleanup: async () => {
      authCleanupCalls++
      return {
        success: true,
        data: { deletedSessionIds: [], deletedCount: 0, callerDeleted: false, remainingMarkedOthers: 0 },
      }
    },
  })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("expected failure")
  expect(result.errorMessage).toMatch(/Verified HTTP checkpoint unresolved/)
  expect(authDiscoveryCalls).toBe(0)
  expect(authCleanupCalls).toBe(0)
  expect(await readdir(directory)).toContain("native-auth-http-checkpoint.json")
})
