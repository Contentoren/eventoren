import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, expect, test } from "@rstest/core"
import { createResult } from "#result"
import { e2eCheckpointSave } from "../checkpoint/e2eCheckpointSave.ts"
import { e2eCheckpointLoad } from "../checkpoint/e2eCheckpointLoad.ts"
import type { E2eCheckpoint } from "../checkpoint/e2eCheckpointSchema.ts"
import { e2eSuccessCleanupRun } from "./e2eSuccessCleanupRun.ts"

const directories: string[] = []
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true })
})

const runId = "mtest-12345678-1234-1234-1234-123456789abc"
const genuineEvent = {
  eventKey: "pilates-christmas-event-2027-final",
  title: "Pilates Christmas Event",
  organizer: "Jennifer Kalus Hair Boutique",
  description: "Weihnachts-Pilates mit Flora Bonn",
  imageUrl: "",
}
const fixtureEvent = {
  eventKey: `ticket-e2e-${runId}`,
  title: `Ticket E2E ${runId}`,
  organizer: `Eventoren Ticket E2E ${runId}`,
  description: "",
  imageUrl: "",
}

async function successCheckpoint(directory: string) {
  const target = { target: "development" as const, baseUrl: "https://eventoren.leonardomora.de" as const }
  const selected = [
    "SSO",
    "native auth HTTP",
    "native auth lifecycle",
    "ticket purchase",
  ] as E2eCheckpoint["selectedWorkflows"]
  const createdAt = Date.now() - 1000
  expect(
    (
      await e2eCheckpointSave(directory, {
        version: 1,
        target: target.target,
        baseUrl: target.baseUrl,
        runId,
        createdAt,
        phase: "sso",
        selectedWorkflows: selected,
        completedWorkflows: [],
      })
    ).success,
  ).toBe(true)
  for (const count of [1, 2, 3]) {
    const loaded = await e2eCheckpointLoad(directory, target)
    if (!loaded.success || !loaded.data) throw new Error("Cannot build barrier")
    expect(
      (
        await e2eCheckpointSave(directory, {
          ...loaded.data,
          completedWorkflows: selected!.slice(0, count) as E2eCheckpoint["completedWorkflows"],
        })
      ).success,
    ).toBe(true)
  }
  const withReady = await e2eCheckpointLoad(directory, target)
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
    const loaded = await e2eCheckpointLoad(directory, target)
    if (!loaded.success || !loaded.data?.ticket) throw new Error(`Cannot progress ticket to ${step}`)
    expect(
      (
        await e2eCheckpointSave(directory, {
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
        })
      ).success,
    ).toBe(true)
  }
  const doneLoaded = await e2eCheckpointLoad(directory, target)
  if (!doneLoaded.success || !doneLoaded.data) throw new Error("Cannot finalize barrier")
  expect(
    (
      await e2eCheckpointSave(directory, {
        ...doneLoaded.data,
        completedWorkflows: [...selected!] as E2eCheckpoint["completedWorkflows"],
        cleanupPhase: "pending",
      })
    ).success,
  ).toBe(true)
  return target
}

function baseMocks() {
  return {
    catalogCleanup: async () => ({ success: true, data: {} }),
    catalogHistoricalCleanup: async () => ({
      success: true,
      data: { isDone: true, continueCursor: null, scannedEvents: 1, cleaned: [], skipped: [] },
    }),
    catalogHistoricalDiscovery: async () => ({
      success: true,
      data: { isDone: true, continueCursor: null, candidates: [], scannedEvents: 1 },
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

function fakeClock() {
  let nowValue = 1_000
  let sleeps = 0
  return {
    now: () => nowValue,
    sleep: async (ms: number) => {
      sleeps += 1
      nowValue += ms
    },
    sleepCount: () => sleeps,
  }
}

test("active version legitimately advanced during the sweep succeeds with a clean ready export", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-snapshot-advance-"))
  directories.push(directory)
  const target = await successCheckpoint(directory)
  let discoveryCalls = 0
  const result = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    ...baseMocks(),
    snapshotHistoricalDiscovery: async () => {
      discoveryCalls += 1
      if (discoveryCalls === 1)
        return {
          success: true,
          data: {
            isDone: true,
            continueCursor: null,
            candidates: [{ version: 9, kind: "ticket-e2e", eventKey: "ticket-e2e-old", chunkCount: 2 }],
            scannedSnapshots: 20,
            activeVersion: 9,
          },
        }
      return {
        success: true,
        data: { isDone: true, continueCursor: null, candidates: [], scannedSnapshots: 20, activeVersion: 10 },
      }
    },
    snapshotHistoricalCleanup: async () => ({
      success: true,
      data: {
        isDone: true,
        continueCursor: null,
        scannedSnapshots: 20,
        activeVersion: 10,
        cleanedVersions: [
          { version: 9, kinds: ["ticket-e2e"], eventKeys: ["ticket-e2e-old"], chunkCount: 2, action: "rebuilt" },
        ],
        deletedChunks: 2,
        skippedVersions: [],
      },
    }),
    snapshotExportRead: async () => ({
      success: true,
      data: { version: 10, events: [genuineEvent], isDone: true, continueCursor: null },
    }),
    snapshotActiveRefresh: async () => ({ success: true, data: 10 }),
    snapshotExportNow: () => 1_000,
    snapshotExportSleep: async () => {},
    snapshotExportDeadlineMs: 5_000,
    snapshotExportPollIntervalMs: 10,
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  expect(discoveryCalls).toBeGreaterThanOrEqual(2)
  expect(result.data?.snapshotFinal).toMatchObject({ status: "snapshot-export-clean", activeVersion: 10 })
})

test("building export becomes ready within the bounded poll without real waits", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-snapshot-building-"))
  directories.push(directory)
  const target = await successCheckpoint(directory)
  const clock = fakeClock()
  let reads = 0
  const result = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    ...baseMocks(),
    snapshotHistoricalDiscovery: async () => ({
      success: true,
      data: { isDone: true, continueCursor: null, candidates: [], scannedSnapshots: 20, activeVersion: 10 },
    }),
    snapshotHistoricalCleanup: async () => ({
      success: true,
      data: {
        isDone: true,
        continueCursor: null,
        scannedSnapshots: 20,
        activeVersion: 10,
        cleanedVersions: [
          { version: 10, kinds: ["ticket-e2e"], eventKeys: ["ticket-e2e-old"], chunkCount: 1, action: "rebuilt" },
        ],
        deletedChunks: 1,
        skippedVersions: [],
      },
    }),
    snapshotExportRead: async () => {
      reads += 1
      if (reads === 1) return { success: true, data: null }
      return { success: true, data: { version: 10, events: [genuineEvent], isDone: true, continueCursor: null } }
    },
    snapshotActiveRefresh: async () => ({ success: true, data: 10 }),
    snapshotExportNow: clock.now,
    snapshotExportSleep: clock.sleep,
    snapshotExportDeadlineMs: 1_000,
    snapshotExportPollIntervalMs: 10,
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  expect(reads).toBeGreaterThanOrEqual(2)
  expect(clock.sleepCount()).toBeGreaterThanOrEqual(1)
})

test("export deadline expiry retains the phase and the cleanup ledger", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-snapshot-deadline-"))
  directories.push(directory)
  const target = await successCheckpoint(directory)
  const clock = fakeClock()
  const result = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    ...baseMocks(),
    snapshotHistoricalDiscovery: async () => ({
      success: true,
      data: { isDone: true, continueCursor: null, candidates: [], scannedSnapshots: 20, activeVersion: 10 },
    }),
    snapshotHistoricalCleanup: async () => ({
      success: true,
      data: {
        isDone: true,
        continueCursor: null,
        scannedSnapshots: 20,
        activeVersion: 10,
        cleanedVersions: [
          { version: 10, kinds: ["ticket-e2e"], eventKeys: ["ticket-e2e-old"], chunkCount: 1, action: "rebuilt" },
        ],
        deletedChunks: 1,
        skippedVersions: [],
      },
    }),
    snapshotExportRead: async () => ({ success: true, data: null }),
    snapshotActiveRefresh: async () => ({ success: true, data: 10 }),
    snapshotExportNow: clock.now,
    snapshotExportSleep: clock.sleep,
    snapshotExportDeadlineMs: 50,
    snapshotExportPollIntervalMs: 10,
  })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("expected failure")
  expect(result.errorMessage).toMatch(/deadline|Final snapshot absence verification unresolved/)
  const retained = await e2eCheckpointLoad(directory, target)
  expect(retained.success).toBe(true)
  if (!retained.success || !retained.data) throw new Error("expected checkpoint")
  expect(retained.data.cleanupPhase).toBe("pending")
  const ledger = JSON.parse(await readFile(join(directory, `cleanup-ledger-${runId}.json`), "utf8"))
  expect(ledger.snapshotHistorical.cleanedVersions).toHaveLength(1)
})

test("completed ready export that still denormalizes an owned fixture refuses cleanup", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-snapshot-owned-"))
  directories.push(directory)
  const target = await successCheckpoint(directory)
  const result = await e2eSuccessCleanupRun({
    directory,
    target,
    convexUrl: "https://example.convex.cloud",
    adminToken: "admin-token",
    ...baseMocks(),
    snapshotHistoricalDiscovery: async () => ({
      success: true,
      data: { isDone: true, continueCursor: null, candidates: [], scannedSnapshots: 20, activeVersion: 10 },
    }),
    snapshotHistoricalCleanup: async () => ({
      success: true,
      data: {
        isDone: true,
        continueCursor: null,
        scannedSnapshots: 20,
        activeVersion: 10,
        cleanedVersions: [
          { version: 10, kinds: ["ticket-e2e"], eventKeys: [`ticket-e2e-${runId}`], chunkCount: 1, action: "rebuilt" },
        ],
        deletedChunks: 1,
        skippedVersions: [],
      },
    }),
    snapshotExportRead: async () => ({
      success: true,
      data: { version: 10, events: [fixtureEvent, genuineEvent], isDone: true, continueCursor: null },
    }),
    snapshotActiveRefresh: async () => ({ success: true, data: 10 }),
    snapshotExportNow: () => 1_000,
    snapshotExportSleep: async () => {},
    snapshotExportDeadlineMs: 5_000,
    snapshotExportPollIntervalMs: 10,
  })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("expected failure")
  expect(result.errorMessage).toMatch(/owned fixtures|Final snapshot absence verification unresolved/)
  const retained = await e2eCheckpointLoad(directory, target)
  expect(retained.success).toBe(true)
  if (!retained.success || !retained.data) throw new Error("expected checkpoint")
  expect(retained.data.cleanupPhase).toBe("pending")
})
