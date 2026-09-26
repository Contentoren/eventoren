import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "@rstest/core"
import { e2eInvocationRun } from "./e2eInvocationRun.ts"

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
      expect(started).toEqual([])
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

  it("does not silently redirect a production run with a preview env file", async () => {
    expect(
      await e2eInvocationRun({
        environment: { E2E_BASE_URL: "https://eventoren.leonardomora.de" },
        commandRun: async () => 0,
      }),
    ).toBe(1)
  })
})
