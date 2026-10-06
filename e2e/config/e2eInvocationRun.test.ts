import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "@rstest/core"
import { e2eCheckpointSave } from "../checkpoint/e2eCheckpointSave.ts"
import type { e2eStripeTicketReconcile } from "../stripe/e2eStripeTicketReconcile.ts"
import { e2eInvocationRun } from "./e2eInvocationRun.ts"

describe("Eventoren E2E runner", () => {
  it("runs production SSO and native auth without marking a ticket attempt or running ticket cleanup", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-test-"))
    const started: { name: string; config: string }[] = []
    let cleanups = 0
    try {
      expect(
        await e2eInvocationRun({
          environment: {
            TEST_CUSTOMER_MAILCOW_HOST: "localhost",
            TEST_CUSTOMER_MAILCOW_USER: "buyer@example.test",
            TEST_CUSTOMER_MAILCOW_PASS: "unused",
            E2E_STRIPE_TEST_SECRET_KEY: "sk_test_mock",
            E2E_STRIPE_TEST_ACCOUNT_ID: "acct_mock",
            E2E_BILLING_ORGANIZATION_ID: "org_mock",
          },
          checkpointDirectory: directory,
          commandRun: async (workflow) => {
            started.push(workflow)
            return 0
          },
          catalogCleanup: async () => {
            cleanups++
            return { success: true }
          },
          mailCleanup: async () => {
            cleanups++
            return { success: true, data: { status: "verified-deleted" } }
          },
          stripeReconcile: (async () => {
            cleanups++
            return { success: true, data: { status: "stripe-reconciled-checkpoint-retained" as const } }
          }) as typeof e2eStripeTicketReconcile,
        }),
      ).toBe(0)
      expect(started).toEqual([
        { name: "SSO", config: "e2e/rstest.config.ts" },
        { name: "native auth HTTP", config: "e2e/native-auth-rstest.config.ts" },
        { name: "native auth lifecycle", config: "e2e/native-auth-lifecycle-rstest.config.ts" },
      ])
      expect(cleanups).toBe(0)
      const checkpoint = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"))
      expect(checkpoint.phase).toBe("sso")
      expect(checkpoint.ticket).toBeUndefined()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("returns failure for a failed production SSO smoke without starting ticket purchase", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-test-"))
    const started: string[] = []
    try {
      let tracesSwept = false
      expect(
        await e2eInvocationRun({
          environment: {},
          checkpointDirectory: directory,
          commandRun: async (workflow) => {
            started.push(workflow.name)
            return 1
          },
          traceCleanup: async () => {
            tracesSwept = true
            return { success: true, removed: [] }
          },
        }),
      ).toBe(1)
      expect(tracesSwept).toBe(true)
      expect(started).toEqual(["SSO"])
      const checkpoint = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"))
      expect(checkpoint.phase).toBe("sso")
      expect(checkpoint.ticket).toBeUndefined()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
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
      expect(started).toEqual(["SSO", "native auth HTTP", "native auth lifecycle", "ticket purchase"])
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
      expect(started).toEqual(["SSO", "native auth HTTP", "native auth lifecycle", "ticket purchase"])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("stops before subsequent workflows when either native auth workflow fails", async () => {
    for (const failedWorkflow of ["native auth HTTP", "native auth lifecycle"]) {
      const directory = await mkdtemp(join(tmpdir(), "eventoren-e2e-native-auth-failure-"))
      try {
        const started: string[] = []
        expect(
          await e2eInvocationRun({
            target: "development",
            environment: {},
            checkpointDirectory: directory,
            commandRun: async (workflow) => {
              started.push(workflow.name)
              return workflow.name === failedWorkflow ? 1 : 0
            },
          }),
        ).toBe(1)
        expect(started).toEqual(
          failedWorkflow === "native auth HTTP"
            ? ["SSO", "native auth HTTP"]
            : ["SSO", "native auth HTTP", "native auth lifecycle"],
        )
        const checkpoint = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"))
        expect(checkpoint.phase).toBe("sso")
        expect(checkpoint.ticket).toBeUndefined()
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

  it("scans an exact stale ticket marker after a blocked retry and preserves unresolved checkpoint", async () => {
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
      const called: string[] = []
      expect(
        await e2eInvocationRun({
          target: "development",
          environment: {},
          checkpointDirectory: directory,
          commandRun: async () => {
            throw new Error("must not run browser")
          },
          catalogCleanup: async (fixture) => {
            called.push(fixture.orderId ?? "missing")
            return { success: false, errorMessage: "PDF/provider reconciliation pending" }
          },
        }),
      ).toBe(1)
      expect(called).toEqual(["order-1"])
      expect(await readFile(join(directory, "checkpoint.json"), "utf8")).toBe(before)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("sweeps an exact stale Stripe test checkout even when the browser is blocked", async () => {
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
          stripeReconcile: (async ({ checkpoint, key, organizationId }) => {
            swept++
            expect(checkpoint.runId).toBe(runId)
            expect(key).toBe("sk_test_mock")
            expect(organizationId).toBe("org_mock")
            return { success: true, data: { status: "stripe-reconciled-checkpoint-retained" as const } }
          }) as typeof e2eStripeTicketReconcile,
        }),
      ).toBe(1)
      expect(swept).toBe(1)
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

  it("runs exact stale IMAP cleanup after a blocked retry, without clearing uncertain effects", async () => {
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
          mailCleanup: async (input) => {
            scanned = true
            expect(input.uid).toBe(501)
            expect(input.uidValidity).toBe("42")
            expect(input.eventTitle).toBe(`Ticket E2E ${runId}`)
            return { success: true, data: { status: "verified-deleted" } }
          },
        }),
      ).toBe(1)
      expect(scanned).toBe(true)
      expect(await readFile(join(directory, "checkpoint.json"), "utf8")).toBe(previous)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
