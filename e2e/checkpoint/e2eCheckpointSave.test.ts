import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, expect, test } from "@rstest/core"
import { e2eCheckpointSave } from "./e2eCheckpointSave.ts"
import type { E2eCheckpoint } from "./e2eCheckpointSchema.ts"

const directories: string[] = []
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true })
})

const base: E2eCheckpoint = {
  version: 1,
  target: "development",
  baseUrl: "https://eventoren.leonardomora.de",
  runId: "mtest-12345678-1234-1234-1234-123456789abc",
  createdAt: Date.now() - 1000,
  phase: "sso",
  selectedWorkflows: ["SSO", "native auth HTTP", "native auth lifecycle", "ticket purchase"],
  completedWorkflows: [],
}

test("ordered completion grows one prefix step at a time and never rewinds", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-checkpoint-barrier-"))
  directories.push(directory)
  expect((await e2eCheckpointSave(directory, base)).success).toBe(true)
  const one = { ...base, completedWorkflows: ["SSO"] as E2eCheckpoint["completedWorkflows"] }
  expect((await e2eCheckpointSave(directory, one)).success).toBe(true)
  const skip = {
    ...base,
    completedWorkflows: ["SSO", "native auth lifecycle"] as E2eCheckpoint["completedWorkflows"],
  }
  expect((await e2eCheckpointSave(directory, skip)).success).toBe(false)
  const rewind = { ...base, completedWorkflows: [] as E2eCheckpoint["completedWorkflows"] }
  expect((await e2eCheckpointSave(directory, rewind)).success).toBe(false)
  const two = {
    ...base,
    completedWorkflows: ["SSO", "native auth HTTP"] as E2eCheckpoint["completedWorkflows"],
  }
  expect((await e2eCheckpointSave(directory, two)).success).toBe(true)
})

test("cleanup phase requires the full ordered barrier and ticket done", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-checkpoint-barrier-"))
  directories.push(directory)
  expect((await e2eCheckpointSave(directory, base)).success).toBe(true)
  const early = { ...base, cleanupPhase: "pending" as const }
  expect((await e2eCheckpointSave(directory, early)).success).toBe(false)
  const partial = {
    ...base,
    completedWorkflows: ["SSO"] as E2eCheckpoint["completedWorkflows"],
    cleanupPhase: "pending" as const,
  }
  expect((await e2eCheckpointSave(directory, partial)).success).toBe(false)
  const one = { ...base, completedWorkflows: ["SSO"] as E2eCheckpoint["completedWorkflows"] }
  expect((await e2eCheckpointSave(directory, one)).success).toBe(true)
  const two = {
    ...base,
    completedWorkflows: ["SSO", "native auth HTTP"] as E2eCheckpoint["completedWorkflows"],
  }
  expect((await e2eCheckpointSave(directory, two)).success).toBe(true)
  const three = {
    ...base,
    completedWorkflows: ["SSO", "native auth HTTP", "native auth lifecycle"] as E2eCheckpoint["completedWorkflows"],
  }
  expect((await e2eCheckpointSave(directory, three)).success).toBe(true)
  const fullWithoutTicket = {
    ...three,
    completedWorkflows: [...base.selectedWorkflows!] as E2eCheckpoint["completedWorkflows"],
    cleanupPhase: "pending" as const,
  }
  expect((await e2eCheckpointSave(directory, fullWithoutTicket)).success).toBe(false)
  const runId = base.runId
  const done = {
    ...base,
    phase: "ticket-unreconciled" as const,
    ticket: {
      step: "done" as const,
      status: "completed" as const,
      eventKey: `ticket-e2e-${runId}`,
      eventTitle: `Ticket E2E ${runId}`,
      participantName: `E2E Participant ${runId}`,
      mailSince: base.createdAt,
    },
    completedWorkflows: [...base.selectedWorkflows!] as E2eCheckpoint["completedWorkflows"],
    cleanupPhase: "pending" as const,
  }
  // Intermediate ticket ready marker is required before jumping to done in one save;
  // build it stepwise to respect the single-step ticket guard.
  const ready: E2eCheckpoint = {
    ...three,
    phase: "ticket-unreconciled" as const,
    ticket: {
      step: "ready" as const,
      status: "completed" as const,
      eventKey: `ticket-e2e-${runId}`,
      eventTitle: `Ticket E2E ${runId}`,
      participantName: `E2E Participant ${runId}`,
      mailSince: base.createdAt,
    },
  }
  expect((await e2eCheckpointSave(directory, ready)).success).toBe(true)
  const eventStep: E2eCheckpoint = {
    ...ready,
    ticket: { ...ready.ticket!, step: "event" as const, status: "completed" as const },
  }
  expect((await e2eCheckpointSave(directory, eventStep)).success).toBe(true)
  // Fast-forward through the remaining ticket steps one at a time via direct saves.
  let current: E2eCheckpoint = eventStep
  for (const step of [
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
  ] as const) {
    const next: E2eCheckpoint = { ...current, ticket: { ...current.ticket!, step, status: "completed" as const } }
    expect((await e2eCheckpointSave(directory, next)).success).toBe(true)
    current = next
  }
  expect((await e2eCheckpointSave(directory, done)).success).toBe(true)
  const failed = { ...done, cleanupPhase: "failed" as const }
  expect((await e2eCheckpointSave(directory, failed)).success).toBe(true)
  const cleared = { ...done, cleanupPhase: undefined }
  expect((await e2eCheckpointSave(directory, cleared)).success).toBe(false)
})
