import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "@rstest/core"
import { createResult } from "#result"
import { e2eCheckpointSave } from "../checkpoint/e2eCheckpointSave.ts"
import { e2eInvocationRun } from "./e2eInvocationRun.ts"

const runId = "abc-12345678-1234-1234-1234-123456789abc"
const selectedWorkflows = ["SSO", "native auth HTTP", "native auth lifecycle", "ticket purchase"] as const
const completedPrefix = ["SSO", "native auth HTTP", "native auth lifecycle"] as const

function devTicketCheckpoint(ticket: Record<string, unknown>) {
  return {
    version: 1 as const,
    target: "development" as const,
    baseUrl: "https://eventoren.leonardomora.de" as const,
    runId,
    createdAt: 1_000_000,
    phase: "ticket-unreconciled" as const,
    selectedWorkflows: [...selectedWorkflows],
    completedWorkflows: [...completedPrefix],
    ticket: {
      step: "event",
      status: "started",
      eventKey: `ticket-e2e-${runId}`,
      eventTitle: `Ticket E2E ${runId}`,
      participantName: `E2E Participant ${runId}`,
      mailSince: 1_000_000,
      ...ticket,
    },
  }
}

async function devTicketCheckpointSave(directory: string, ticket: Record<string, unknown>) {
  // The checkpoint barrier only grows one ordered workflow at a time.
  const base = devTicketCheckpoint(ticket)
  for (let count = 0; count <= completedPrefix.length; count++) {
    const next = { ...base, completedWorkflows: [...completedPrefix].slice(0, count) }
    const saved = await e2eCheckpointSave(directory, next as never)
    if (!saved.success) throw new Error(`Cannot save checkpoint prefix ${count}: ${saved.errorMessage}`)
  }
}

describe("ticket event-started pre-loop guard", () => {
  it("permits the ticket child with the same run UUID when only the event step is uncertain", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-event-started-"))
    try {
      await devTicketCheckpointSave(directory, {})
      const started: string[] = []
      const runIds: string[] = []
      let historicalCalls = 0
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
      // The three completed workflows are skipped; only the unfinished ticket child runs.
      expect(started).toEqual(["ticket purchase"])
      // Same outer run/event intent is reused, not a new run.
      expect(runIds).toEqual([runId])
      expect(historicalCalls).toBe(0)
      const retained = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"))
      expect(retained.runId).toBe(runId)
      expect(retained.ticket.step).toBe("event")
      expect(retained.ticket.status).toBe("started")
      expect(retained.ticket.eventKey).toBe(`ticket-e2e-${runId}`)
      expect(retained.completedWorkflows).toEqual([...completedPrefix])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("still blocks an uncertain payment before any child runs without mutating the checkpoint", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-payment-started-"))
    try {
      await devTicketCheckpointSave(directory, {
        step: "payment",
        orderId: "order-1",
        stripeSession: "cs_test_123456789",
        eventId: `ticket-e2e-${runId}`,
        productId: "paid-ticket",
      })
      const before = await readFile(join(directory, "checkpoint.json"), "utf8")
      let started = 0
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {},
          checkpointDirectory: directory,
          commandRun: async () => {
            started++
            return 0
          },
        }),
      ).toBe(1)
      expect(started).toBe(0)
      expect(await readFile(join(directory, "checkpoint.json"), "utf8")).toBe(before)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
