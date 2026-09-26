import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "@rstest/core"
import { e2eInvocationRun } from "./e2eInvocationRun.ts"
import { e2eCheckpointSave } from "../checkpoint/e2eCheckpointSave.ts"

describe("Eventoren E2E runner", () => {
  it("blocks production before any SSO or paid fixture is started", async () => {
    const started: string[] = []
    expect(
      await e2eInvocationRun({
        environment: {},
        commandRun: async (workflow) => {
          started.push(workflow.name)
          return 0
        },
      }),
    ).toBe(1)
    expect(started).toEqual([])
  })

  it("runs preview SSO then ticket, retaining unreconciled effects even after browser success", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-test-"))
    try {
      const started: string[] = []
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {},
          checkpointDirectory: directory,
          commandRun: async (workflow, environment) => {
            expect(environment.E2E_BASE_URL).toBe("https://eventoren.leonardomora.de")
            expect(environment.E2E_RUN_ID).toMatch(/^[0-9a-z]+-[0-9a-f-]{36}$/u)
            started.push(workflow.name)
            return 0
          },
        }),
      ).toBe(1)
      expect(started).toEqual(["SSO", "ticket purchase"])
      expect(JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8")).phase).toBe("ticket-unreconciled")
      started.length = 0
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
      expect(started).toEqual(["SSO", "ticket purchase"])
    } finally {
      await rm(directory, { recursive: true, force: true })
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

  it("does not silently redirect a production run with a preview env file", async () => {
    expect(
      await e2eInvocationRun({
        environment: { E2E_BASE_URL: "https://eventoren.leonardomora.de" },
        commandRun: async () => 0,
      }),
    ).toBe(1)
  })
})
