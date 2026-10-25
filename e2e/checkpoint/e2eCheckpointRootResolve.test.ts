import { chmod, mkdir, mkdtemp, readdir, readFile, rm, stat, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, expect, test } from "@rstest/core"
import { e2eCheckpointRootResolve } from "./e2eCheckpointRootResolve.ts"
import type { E2eCheckpoint } from "./e2eCheckpointSchema.ts"

const directories: string[] = []
const runId = "mtest-12345678-1234-1234-1234-123456789abc"
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true })
})

async function rootsCreate() {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-roots-"))
  directories.push(directory)
  return { preferred: join(directory, "preferred"), fallback: join(directory, "fallback"), environment: {} }
}

function checkpointCreate(target: "production" | "development" = "development"): E2eCheckpoint {
  return {
    version: 1,
    target,
    baseUrl: target === "production" ? "https://eventoren.de" : "https://eventoren.leonardomora.de",
    runId,
    createdAt: 111,
    phase: "ticket-unreconciled",
    ticket: {
      step: "payment",
      status: "started",
      eventKey: `ticket-e2e-${runId}`,
      eventTitle: `Ticket E2E ${runId}`,
      participantName: `E2E Participant ${runId}`,
      mailSince: 111,
      stripeSession: "cs_test_offlinefixture",
    },
  }
}

async function stateWrite(directory: string, state = checkpointCreate()) {
  await mkdir(directory, { recursive: true, mode: 0o700 })
  await writeFile(join(directory, "checkpoint.json"), JSON.stringify(state), { mode: 0o600 })
}

test("production selects its scoped root without changing the retained development payment attempt; development resumes legacy exactly", async () => {
  const paths = await rootsCreate()
  await stateWrite(paths.preferred)
  const file = join(paths.preferred, "checkpoint.json")
  const before = await readFile(file)
  const metadata = await stat(file)
  const production = await e2eCheckpointRootResolve({ ...paths, target: "production" })
  expect(production).toMatchObject({
    success: true,
    data: { directory: join(paths.preferred, "production"), fallback: false },
  })
  const development = await e2eCheckpointRootResolve({ ...paths, target: "development" })
  expect(development).toMatchObject({ success: true, data: { directory: paths.preferred, retainedRunId: runId } })
  expect(await readFile(file)).toEqual(before)
  expect((await stat(file)).mtimeMs).toBe(metadata.mtimeMs)
  expect((await stat(file)).ino).toBe(metadata.ino)
})

test("new target roots are independent and remain scoped after successful legacy retirement", async () => {
  const paths = await rootsCreate()
  for (const target of ["production", "development"] as const) {
    const result = await e2eCheckpointRootResolve({ ...paths, target })
    expect(result).toMatchObject({ success: true, data: { directory: join(paths.preferred, target) } })
    await stateWrite(join(paths.preferred, target), checkpointCreate(target))
  }
  expect(await readdir(paths.preferred)).toEqual(["development", "production"])
  for (const target of ["production", "development"] as const)
    expect(await e2eCheckpointRootResolve({ ...paths, target })).toMatchObject({
      success: true,
      data: { directory: join(paths.preferred, target) },
    })
  await rm(join(paths.preferred, "development"), { recursive: true })
  await stateWrite(paths.preferred)
  await rm(join(paths.preferred, "checkpoint.json"))
  expect(await e2eCheckpointRootResolve({ ...paths, target: "development" })).toMatchObject({
    success: true,
    data: { directory: join(paths.preferred, "development") },
  })
})

test("same-target legacy and scoped state refuses to silently pick either attempt", async () => {
  const paths = await rootsCreate()
  await stateWrite(paths.preferred)
  await stateWrite(join(paths.preferred, "development"))
  expect(await e2eCheckpointRootResolve({ ...paths, target: "development" })).toMatchObject({ success: false })
  expect(await readFile(join(paths.preferred, "checkpoint.json"), "utf8")).toBe(JSON.stringify(checkpointCreate()))
})

for (const unsafe of [
  "corrupt",
  "nonprivate-file",
  "nonprivate-root",
  "symlink-file",
  "symlink-root",
  "lock-only",
  "evidence-only",
  "wrong-canonical-url",
] as const) {
  test(`legacy ${unsafe} state fails closed rather than starting a fresh production attempt`, async () => {
    const paths = await rootsCreate()
    await stateWrite(paths.preferred)
    const file = join(paths.preferred, "checkpoint.json")
    if (unsafe === "corrupt") await writeFile(file, "{invalid")
    if (unsafe === "nonprivate-file") await chmod(file, 0o644)
    if (unsafe === "nonprivate-root") await chmod(paths.preferred, 0o755)
    if (unsafe === "wrong-canonical-url")
      await writeFile(file, JSON.stringify({ ...checkpointCreate(), baseUrl: "https://eventoren.de" }))
    if (unsafe === "symlink-file") {
      await rm(file)
      await writeFile(join(paths.preferred, "other.json"), JSON.stringify(checkpointCreate()), { mode: 0o600 })
      await symlink(join(paths.preferred, "other.json"), file)
    }
    if (unsafe === "symlink-root") {
      await rm(paths.preferred, { recursive: true })
      await mkdir(paths.fallback, { mode: 0o700 })
      await symlink(paths.fallback, paths.preferred)
    }
    if (unsafe === "lock-only" || unsafe === "evidence-only") {
      await rm(file)
      await writeFile(
        join(paths.preferred, unsafe === "lock-only" ? "invocation.lock" : "auth-session-evidence-orphan.json"),
        "123",
        { mode: 0o600 },
      )
    }
    expect(await e2eCheckpointRootResolve({ ...paths, target: "production" })).toMatchObject({ success: false })
    expect(await readdir(paths.preferred)).not.toContain("production")
  })
}

for (const workflow of ["HTTP", "lifecycle"] as const) {
  test(`native ${workflow}-only legacy state retains its validated target and run identity`, async () => {
    const paths = await rootsCreate()
    await mkdir(paths.preferred, { mode: 0o700 })
    const identity = {
      version: 1,
      target: "development",
      baseUrl: "https://eventoren.leonardomora.de",
      runId,
      createdAt: 111,
      status: "started",
    }
    const native =
      workflow === "HTTP"
        ? { ...identity, workflow: "native auth HTTP", step: "authenticated-bootstrap" }
        : {
            ...identity,
            step: "create",
            eventKey: "native-auth-12345678-1234-1234-1234-123456789abc",
            titleMarker: "marker",
            initialTitle: "initial",
            editedTitle: "edited",
          }
    const file = join(
      paths.preferred,
      workflow === "HTTP" ? "native-auth-http-checkpoint.json" : "native-auth-lifecycle-checkpoint.json",
    )
    await writeFile(file, JSON.stringify(native), { mode: 0o600 })
    expect(await e2eCheckpointRootResolve({ ...paths, target: "development" })).toMatchObject({
      success: true,
      data: { directory: paths.preferred, retainedRunId: runId },
    })
    expect(await e2eCheckpointRootResolve({ ...paths, target: "production" })).toMatchObject({
      success: true,
      data: { directory: join(paths.preferred, "production") },
    })
    await writeFile(file, JSON.stringify({ ...native, baseUrl: "https://eventoren.de" }))
    expect(await e2eCheckpointRootResolve({ ...paths, target: "production" })).toMatchObject({ success: false })
  })
}

test("conflicting legacy invocation and native run identities refuse ambiguity", async () => {
  const paths = await rootsCreate()
  await stateWrite(paths.preferred)
  await writeFile(
    join(paths.preferred, "native-auth-http-checkpoint.json"),
    JSON.stringify({
      version: 1,
      target: "production",
      baseUrl: "https://eventoren.de",
      runId,
      createdAt: 111,
      workflow: "native auth HTTP",
      step: "authenticated-bootstrap",
      status: "started",
    }),
    { mode: 0o600 },
  )
  expect(await e2eCheckpointRootResolve({ ...paths, target: "production" })).toMatchObject({ success: false })
})

test("fallback scoped state stays selected when preferred becomes available, and duplicates fail closed", async () => {
  const paths = await rootsCreate()
  const unavailable = `/proc/eventoren-root-offline-${crypto.randomUUID()}/e2e`
  expect(await e2eCheckpointRootResolve({ ...paths, preferred: unavailable, target: "production" })).toMatchObject({
    success: true,
    data: { directory: join(paths.fallback, "production"), fallback: true },
  })
  await stateWrite(join(paths.fallback, "production"), checkpointCreate("production"))
  expect(await e2eCheckpointRootResolve({ ...paths, target: "production" })).toMatchObject({
    success: true,
    data: { directory: join(paths.fallback, "production"), fallback: true },
  })
  await stateWrite(join(paths.preferred, "production"), checkpointCreate("production"))
  expect(await e2eCheckpointRootResolve({ ...paths, target: "production" })).toMatchObject({ success: false })
})

test("fallback legacy development state is retained while production uses its own scoped preferred root", async () => {
  const paths = await rootsCreate()
  await stateWrite(paths.fallback)
  expect(await e2eCheckpointRootResolve({ ...paths, target: "development" })).toMatchObject({
    success: true,
    data: { directory: paths.fallback, fallback: true },
  })
  expect(await e2eCheckpointRootResolve({ ...paths, target: "production" })).toMatchObject({
    success: true,
    data: { directory: join(paths.preferred, "production") },
  })
})

test("child environment directory is authoritative, private, and target-checked; absent target defaults production", async () => {
  const paths = await rootsCreate()
  await stateWrite(paths.fallback, checkpointCreate("production"))
  expect(
    await e2eCheckpointRootResolve({ ...paths, environment: { E2E_CHECKPOINT_DIRECTORY: paths.fallback } }),
  ).toMatchObject({ success: true, data: { directory: paths.fallback } })
  expect(
    await e2eCheckpointRootResolve({
      ...paths,
      environment: { E2E_CHECKPOINT_DIRECTORY: paths.fallback, E2E_TARGET: "development" },
    }),
  ).toMatchObject({ success: false })
  expect(
    await e2eCheckpointRootResolve({
      ...paths,
      environment: { E2E_TARGET: "development", E2E_BASE_URL: "https://eventoren.de" },
    }),
  ).toMatchObject({ success: false })
  await chmod(paths.fallback, 0o755)
  expect(
    await e2eCheckpointRootResolve({ ...paths, environment: { E2E_CHECKPOINT_DIRECTORY: paths.fallback } }),
  ).toMatchObject({ success: false })
})

test("symlink ancestry with a missing preferred leaf refuses instead of hiding behind fallback", async () => {
  const paths = await rootsCreate()
  await mkdir(paths.fallback, { mode: 0o700 })
  await symlink(paths.fallback, paths.preferred)
  expect(
    await e2eCheckpointRootResolve({ ...paths, preferred: join(paths.preferred, "missing"), target: "production" }),
  ).toMatchObject({ success: false })
  expect(await readdir(paths.fallback)).toEqual([])
})

test("same-target legacy state in both preferred and fallback refuses duplicate continuity", async () => {
  const paths = await rootsCreate()
  await stateWrite(paths.preferred)
  await stateWrite(paths.fallback)
  expect(await e2eCheckpointRootResolve({ ...paths, target: "development" })).toMatchObject({ success: false })
})

test("scoped foreign state or a surviving lock without target identity never gets overwritten", async () => {
  const paths = await rootsCreate()
  const scoped = join(paths.preferred, "production")
  await stateWrite(scoped)
  expect(await e2eCheckpointRootResolve({ ...paths, target: "production" })).toMatchObject({ success: false })
  await rm(join(scoped, "checkpoint.json"))
  await writeFile(join(scoped, "invocation.lock"), "123", { mode: 0o600 })
  expect(await e2eCheckpointRootResolve({ ...paths, target: "production" })).toMatchObject({ success: false })
  expect(await readFile(join(scoped, "invocation.lock"), "utf8")).toBe("123")
})

test("explicit orphan locks stay authoritative for parent lock arbitration, but unknown orphan files refuse unchanged", async () => {
  const paths = await rootsCreate()
  await mkdir(paths.preferred, { mode: 0o700 })
  const input = { ...paths, directory: paths.preferred, target: "development" }
  await writeFile(join(paths.preferred, "invocation.lock"), "123", { mode: 0o600 })
  expect(await e2eCheckpointRootResolve(input)).toMatchObject({ success: true, data: { directory: paths.preferred } })
  const unknown = join(paths.preferred, "unreconciled-attempt.json")
  await writeFile(unknown, "retained-unknown-state", { mode: 0o600 })
  expect(await e2eCheckpointRootResolve(input)).toMatchObject({ success: false })
  expect(await readFile(unknown, "utf8")).toBe("retained-unknown-state")
  expect(await readFile(join(paths.preferred, "invocation.lock"), "utf8")).toBe("123")
})
