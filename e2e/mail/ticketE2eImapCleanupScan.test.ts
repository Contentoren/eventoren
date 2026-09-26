import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@rstest/core"
import { e2eCheckpointSave } from "../checkpoint/e2eCheckpointSave.ts"
import type { E2eCheckpoint } from "../checkpoint/e2eCheckpointSchema.ts"
import { ticketE2eImapCleanupScan } from "./ticketE2eImapCleanupScan.ts"

test("only a completed or stale exact-owned run can request IMAP deletion, with checkpoint retained", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-imap-cleanup-"))
  try {
    const runId = "abc-12345678-1234-1234-1234-123456789abc"
    const checkpoint: E2eCheckpoint = {
      version: 1,
      target: "development",
      baseUrl: "https://eventoren.leonardomora.de",
      runId,
      createdAt: Date.now() - 1000,
      phase: "ticket-unreconciled",
      ticket: {
        step: "delivery",
        status: "completed",
        eventKey: `ticket-e2e-${runId}`,
        eventTitle: `Ticket E2E ${runId}`,
        participantName: `E2E Participant ${runId}`,
        mailSince: Date.now() - 1000,
        mailUid: 501,
        mailUidValidity: "42",
      },
    }
    expect((await e2eCheckpointSave(directory, checkpoint)).success).toBe(true)
    const calls: number[] = []
    const remove = async (input: { uid: number }) => {
      calls.push(input.uid)
      return { success: true as const, data: { status: "verified-deleted" as const } }
    }
    const mail = { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" }
    expect(await ticketE2eImapCleanupScan({ directory, target: checkpoint, mail, remove })).toMatchObject({
      success: true,
      data: { status: "preserved-current-run" },
    })
    expect(
      (await ticketE2eImapCleanupScan({ directory, target: { ...checkpoint, target: "production" }, mail, remove }))
        .success,
    ).toBe(false)
    expect(calls).toEqual([])
    expect(
      await ticketE2eImapCleanupScan({
        directory,
        target: checkpoint,
        mail,
        remove,
        now: checkpoint.createdAt + 24 * 60 * 60_000,
      }),
    ).toMatchObject({
      success: true,
      data: { status: "verified-deleted" },
    })
    expect(calls).toEqual([501])
    expect(
      (await ticketE2eImapCleanupScan({ directory, target: checkpoint, now: checkpoint.createdAt + 24 * 60 * 60_000 }))
        .success,
    ).toBe(false)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("cleans successful current-run mail but refuses a checkpoint with a foreign participant", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-imap-cleanup-"))
  try {
    const runId = "abc-12345678-1234-1234-1234-123456789abc"
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
        mailUid: 501,
        mailUidValidity: "42",
      },
    }
    expect((await e2eCheckpointSave(directory, checkpoint)).success).toBe(true)
    await writeFile(
      join(directory, "checkpoint.json"),
      JSON.stringify({
        ...checkpoint,
        ticket: { ...checkpoint.ticket, participantName: "E2E Participant foreign" },
      }),
    )
    let called = 0
    const mail = { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" }
    const remove = async () => {
      called++
      return { success: true as const, data: { status: "verified-deleted" as const } }
    }
    expect((await ticketE2eImapCleanupScan({ directory, target: checkpoint, mail, remove })).success).toBe(false)
    expect(called).toBe(0)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
  const directory2 = await mkdtemp(join(tmpdir(), "eventoren-imap-cleanup-"))
  try {
    const runId = "abc-12345678-1234-1234-1234-123456789abc"
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
        mailUid: 501,
        mailUidValidity: "42",
      },
    }
    expect((await e2eCheckpointSave(directory2, checkpoint)).success).toBe(true)
    let called = 0
    expect(
      await ticketE2eImapCleanupScan({
        directory: directory2,
        target: checkpoint,
        mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" },
        remove: async () => {
          called++
          return { success: true as const, data: { status: "verified-deleted" as const } }
        },
      }),
    ).toMatchObject({ success: true, data: { status: "verified-deleted" } })
    expect(called).toBe(1)
  } finally {
    await rm(directory2, { recursive: true, force: true })
  }
})
