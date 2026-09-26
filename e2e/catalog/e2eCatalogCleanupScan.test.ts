import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, expect, test } from "@rstest/core"
import { e2eCheckpointSave } from "../checkpoint/e2eCheckpointSave.ts"
import type { E2eCheckpoint } from "../checkpoint/e2eCheckpointSchema.ts"
import { e2eCatalogCleanupScan } from "./e2eCatalogCleanupScan.ts"

const directories: string[] = []
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true })
})

test("preserves a failed current run and never scans an unrelated target", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-cleanup-scan-"))
  directories.push(directory)
  const runId = "mtest-12345678-1234-1234-1234-123456789abc"
  const checkpoint: E2eCheckpoint = {
    version: 1,
    target: "development",
    baseUrl: "https://eventoren.leonardomora.de",
    runId,
    createdAt: Date.now() - 1000,
    phase: "ticket-unreconciled",
    ticket: {
      step: "event",
      status: "started",
      eventKey: `ticket-e2e-${runId}`,
      eventTitle: `Ticket E2E ${runId}`,
      participantName: `E2E Participant ${runId}`,
      mailSince: Date.now() - 1000,
    },
  }
  expect((await e2eCheckpointSave(directory, checkpoint)).success).toBe(true)
  let called = 0
  const cleanup = async () => {
    called++
    return { success: true, data: {} }
  }
  const target = { target: checkpoint.target, baseUrl: checkpoint.baseUrl }
  expect(await e2eCatalogCleanupScan({ directory, target, cleanup })).toMatchObject({
    success: true,
    data: { status: "preserved-current-run" },
  })
  expect(
    (await e2eCatalogCleanupScan({ directory, target: { ...target, target: "production" }, cleanup })).success,
  ).toBe(false)
  expect(called).toBe(0)
  const stale = await e2eCatalogCleanupScan({
    directory,
    target,
    now: checkpoint.createdAt + 24 * 60 * 60_000,
    cleanup,
  })
  expect(stale).toMatchObject({ success: true, data: { status: "catalog-archived-checkpoint-retained" } })
  expect(called).toBe(1)
})

test("scans a successful owned current run but retains its checkpoint for provider reconciliation", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-cleanup-scan-"))
  directories.push(directory)
  const runId = "mtest-12345678-1234-1234-1234-123456789abc"
  const checkpoint: E2eCheckpoint = {
    version: 1,
    target: "development",
    baseUrl: "https://eventoren.leonardomora.de",
    runId,
    createdAt: Date.now() - 1000,
    phase: "ticket-unreconciled",
    ticket: {
      step: "done",
      status: "completed",
      eventKey: `ticket-e2e-${runId}`,
      eventTitle: `Ticket E2E ${runId}`,
      participantName: `E2E Participant ${runId}`,
      mailSince: Date.now() - 1000,
      eventId: `ticket-e2e-${runId}`,
      productId: "paid-ticket",
    },
  }
  expect((await e2eCheckpointSave(directory, checkpoint)).success).toBe(true)
  const captured: unknown[] = []
  const scanned = await e2eCatalogCleanupScan({
    directory,
    target: checkpoint,
    cleanup: async (fixture) => {
      captured.push(fixture)
      return { success: true, data: { retainedOrders: 1, retainedTickets: 1 } }
    },
  })
  expect(scanned).toMatchObject({
    success: true,
    data: { status: "catalog-archived-checkpoint-retained", verification: { retainedOrders: 1, retainedTickets: 1 } },
  })
  expect(captured).toEqual([
    expect.objectContaining({
      runId,
      eventKey: checkpoint.ticket!.eventKey,
      productId: "paid-ticket",
      successfulOwnedCurrentRun: true,
    }),
  ])
})

test("refuses a stale marker with a foreign participant before invoking cleanup", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-cleanup-scan-"))
  directories.push(directory)
  const runId = "mtest-12345678-1234-1234-1234-123456789abc"
  const checkpoint: E2eCheckpoint = {
    version: 1,
    target: "development",
    baseUrl: "https://eventoren.leonardomora.de",
    runId,
    createdAt: Date.now() - 25 * 60 * 60_000,
    phase: "ticket-unreconciled",
    ticket: {
      step: "payment",
      status: "started",
      eventKey: `ticket-e2e-${runId}`,
      eventTitle: `Ticket E2E ${runId}`,
      participantName: "E2E Participant other-12345678-1234-1234-1234-123456789abc",
      mailSince: Date.now() - 25 * 60 * 60_000,
    },
  }
  expect((await e2eCheckpointSave(directory, checkpoint)).success).toBe(true)
  let invoked = false
  expect(
    (
      await e2eCatalogCleanupScan({
        directory,
        target: checkpoint,
        cleanup: async () => {
          invoked = true
          return { success: true }
        },
      })
    ).success,
  ).toBe(false)
  expect(invoked).toBe(false)
})
