import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, expect, rstest, test } from "@rstest/core"
import { ConvexHttpClient } from "convex/browser"
import { e2eInvocationCleanupSessionCreate } from "../auth/e2eInvocationCleanupSessionCreate.ts"
import { e2eCheckpointRootResolve } from "../checkpoint/e2eCheckpointRootResolve.ts"
import { e2eInvocationRun } from "./e2eInvocationRun.ts"

const directories: string[] = []
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true })
})

async function directoryCreate() {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-invocation-directory-"))
  directories.push(directory)
  return directory
}

for (const target of ["production", "development"] as const) {
  test(`parent forwards its exact authoritative checkpoint directory and canonical ${target} identity to the child`, async () => {
    const directory = await directoryCreate()
    const ambientDirectory = await directoryCreate()
    const children: Record<string, string>[] = []
    const exitCode = await e2eInvocationRun({
      target,
      checkpointDirectory: directory,
      environment: { E2E_CHECKPOINT_DIRECTORY: ambientDirectory },
      commandRun: async (_workflow, environment) => {
        children.push(environment)
        // Exercise the same resolution used by children/evidence writers, offline.
        const root = await e2eCheckpointRootResolve({ environment })
        expect(root).toMatchObject({ success: true, data: { directory } })
        return 1 // Retain the attempt; no cleanup/providers are contacted.
      },
    })
    expect(exitCode).toBe(1)
    expect(children).toHaveLength(1)
    expect(children[0]).toMatchObject({
      E2E_TARGET: target,
      E2E_BASE_URL: target === "production" ? "https://eventoren.de" : "https://eventoren.leonardomora.de",
      E2E_CHECKPOINT_DIRECTORY: directory,
    })
    const stored = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"))
    expect(children[0]?.E2E_RUN_ID).toBe(stored.runId)
    expect(stored.target).toBe(target)
  })
}

test("native-only retained legacy run identity continues through parent creation and child forwarding", async () => {
  const directory = await directoryCreate()
  const runId = "mtest-12345678-1234-1234-1234-123456789abc"
  const path = join(directory, "native-auth-http-checkpoint.json")
  const raw = JSON.stringify({
    version: 1,
    target: "production",
    baseUrl: "https://eventoren.de",
    runId,
    createdAt: 111,
    workflow: "native auth HTTP",
    step: "authenticated-bootstrap",
    status: "started",
  })
  await writeFile(path, raw, { mode: 0o600 })
  let childRunId: string | undefined
  expect(
    await e2eInvocationRun({
      target: "production",
      checkpointDirectory: directory,
      environment: {},
      commandRun: async (_workflow, environment) => {
        childRunId = environment.E2E_RUN_ID
        return 1
      },
    }),
  ).toBe(1)
  expect(childRunId).toBe(runId)
  expect(JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8")).runId).toBe(runId)
  expect(await readFile(path, "utf8")).toBe(raw)
})

test("nonprivate explicit override refuses before any parent checkpoint write or child invocation", async () => {
  const directory = await directoryCreate()
  await chmod(directory, 0o755)
  let started = false
  expect(
    await e2eInvocationRun({
      checkpointDirectory: directory,
      environment: {},
      commandRun: async () => {
        started = true
        return 1
      },
    }),
  ).toBe(1)
  expect(started).toBe(false)
  await expect(readFile(join(directory, "checkpoint.json"))).rejects.toThrow()
})

test("development cleanup forwards the resolved explicit root into same-process default marking before provider I/O", async () => {
  const directory = await directoryCreate()
  const ambientDirectory = await directoryCreate()
  const runId = "mtest-12345678-1234-1234-1234-123456789abc"
  const workflows = ["SSO", "native auth HTTP", "native auth lifecycle", "ticket purchase"]
  await writeFile(
    join(directory, "checkpoint.json"),
    JSON.stringify({
      version: 1,
      target: "development",
      baseUrl: "https://eventoren.leonardomora.de",
      runId,
      createdAt: 111,
      phase: "ticket-unreconciled",
      selectedWorkflows: workflows,
      completedWorkflows: workflows,
      cleanupPhase: "failed",
      ticket: {
        step: "done",
        status: "completed",
        eventKey: `ticket-e2e-${runId}`,
        eventTitle: `Ticket E2E ${runId}`,
        participantName: `E2E Participant ${runId}`,
        mailSince: 111,
      },
    }),
    { mode: 0o600 },
  )
  const mutation = rstest.spyOn(ConvexHttpClient.prototype, "mutation").mockResolvedValue({
    success: true,
    data: { sessionId: "offline-cleanup-session", creationTime: 111, runId },
  })
  const names = ["E2E_TARGET", "E2E_BASE_URL", "E2E_CHECKPOINT_DIRECTORY"] as const
  const before = Object.fromEntries(names.map((name) => [name, process.env[name]]))
  let forwarded: Record<string, string | undefined> | undefined
  let created: Awaited<ReturnType<typeof e2eInvocationCleanupSessionCreate>> | undefined
  let closed = false
  let workflowCalls = 0
  try {
    // The parent process deliberately disagrees with the validated invocation.
    process.env.E2E_TARGET = "production"
    process.env.E2E_BASE_URL = "https://eventoren.de"
    process.env.E2E_CHECKPOINT_DIRECTORY = ambientDirectory
    const exitCode = await e2eInvocationRun({
      target: "development",
      checkpointDirectory: directory,
      environment: {
        E2E_CHECKPOINT_DIRECTORY: ambientDirectory,
        E2E_CLEANUP_CONVEX_URL: "https://offline.convex.cloud",
        E2E_AUTH_USERNAME: "offline-user",
        E2E_AUTH_PASSWORD: "offline-password",
      },
      commandRun: async () => {
        workflowCalls += 1
        return 1
      },
      cleanupSessionCreate: async (input) => {
        forwarded = input.env
        created = await e2eInvocationCleanupSessionCreate({
          ...input,
          browserLogin: async () => ({
            token: "offline-cleanup-token",
            close: async () => {
              closed = true
            },
          }),
          sessionVerify: async () => ({ success: true, data: { role: "admin", userId: "offline-admin" } }),
          // No mark seam: exercise default marking, with only its provider I/O mocked.
        })
        // Stop before historical cleanup/provider queries; retain this temporary checkpoint.
        return { success: false, op: "offlineCleanupStop", errorMessage: "Offline test retains cleanup checkpoint" }
      },
    })
    expect(exitCode).toBe(1)
    expect(workflowCalls).toBe(0)
    expect(forwarded?.E2E_TARGET).toBe("development")
    expect(forwarded?.E2E_CHECKPOINT_DIRECTORY).toBe(directory)
    expect(created?.success).toBe(true)
    expect(mutation).toHaveBeenCalledTimes(1)
    expect(closed).toBe(true)
    const raw = await readFile(join(directory, `auth-session-evidence-${runId}.json`), "utf8")
    expect(JSON.parse(raw).sessions[0].sessionId).toBe("offline-cleanup-session")
    expect(raw).not.toContain("offline-cleanup-token")
    await expect(readFile(join(ambientDirectory, `auth-session-evidence-${runId}.json`))).rejects.toThrow()
  } finally {
    mutation.mockRestore()
    for (const name of names) {
      if (before[name] === undefined) delete process.env[name]
      else process.env[name] = before[name]
    }
  }
})
