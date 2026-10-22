import { describe, expect, test } from "bun:test"
import type { ConvexHttpClient } from "convex/browser"
import { getFunctionName } from "convex/server"
import { createResult, createResultError, type Result } from "#result"
import { organizerDashboardCliRun } from "#src/cli/organizerDashboardCliRun.ts"
import {
  type OrganizerDashboardClient,
  organizerDashboardClientCreate,
} from "#src/client/organizerDashboardClientCreate.ts"
import { organizerDashboardConvexBackendCreate } from "./organizerDashboardConvexBackendCreate.ts"
import { organizerDashboardHonoCreate } from "./organizerDashboardHonoCreate.ts"
import { organizerDashboardOperations } from "./organizerDashboardOperations.ts"

const credential = "overview-exports-private-test-credential-9c1e"
const orgId = "org_test"
const eventKey = "event-test"
const data = { page: [], isDone: true, continueCursor: "next-cursor" }

const cases = [
  {
    operation: "overview-get",
    method: "overviewGet",
    module: "organizerDashboardOverview",
    fn: "organizerDashboardOverviewQuery",
    kind: "query",
    args: { orgId, eventKey: " event-test ", range: "30" },
    forwarded: { orgId, eventKey, range: "30" },
    needsAuth: true,
  },
  {
    operation: "event-stats-get",
    method: "eventStatsGet",
    module: "organizerDashboardOverview",
    fn: "organizerDashboardEventStatsQuery",
    kind: "query",
    args: { orgId, eventKey },
    forwarded: { orgId, eventKey },
    needsAuth: true,
  },
  {
    operation: "export-list",
    method: "exportList",
    module: "organizerDashboardExports",
    fn: "organizerDashboardExportListQuery",
    kind: "query",
    args: { orgId, eventKey, kind: "teilnehmer", search: " Lea ", numItems: 50, cursor: null, endCursor: null },
    forwarded: {
      orgId,
      eventKey,
      kind: "teilnehmer",
      search: "Lea",
      paginationOpts: { numItems: 50, cursor: null },
    },
    needsAuth: true,
  },
  {
    operation: "public-profile-get",
    method: "publicProfileGet",
    module: "organizerDashboardPublic",
    fn: "organizerDashboardPublicProfileQuery",
    kind: "query",
    args: { orgSlug: " kulturhaus-lindenhof " },
    forwarded: { orgSlug: "kulturhaus-lindenhof" },
    needsAuth: false,
  },
  {
    operation: "public-event-get",
    method: "publicEventGet",
    module: "organizerDashboardPublic",
    fn: "organizerDashboardPublicEventQuery",
    kind: "query",
    args: { orgSlug: "kulturhaus-lindenhof", eventKey: " sommernachtskonzert " },
    forwarded: { orgSlug: "kulturhaus-lindenhof", eventKey: "sommernachtskonzert" },
    needsAuth: false,
  },
] as const satisfies readonly {
  operation: string
  method: keyof OrganizerDashboardClient
  module: string
  fn: string
  kind: string
  args: object
  forwarded: object
  needsAuth: boolean
}[]
type OverviewCase = (typeof cases)[number]

function sdkCreate(response: Result<unknown> | "throw" = createResult(data)) {
  const calls: unknown[] = []
  const invoke = (kind: string, reference: Parameters<typeof getFunctionName>[0], args: unknown) => {
    calls.push({ kind, name: getFunctionName(reference), args })
    if (response === "throw") throw new Error("SDK echoed " + credential)
    return response
  }
  const client = {
    query: (ref: Parameters<typeof getFunctionName>[0], args: unknown) => invoke("query", ref, args),
    mutation: (ref: Parameters<typeof getFunctionName>[0], args: unknown) => invoke("mutation", ref, args),
  } as unknown as ConvexHttpClient
  return { calls, client, backend: organizerDashboardConvexBackendCreate(client) }
}
function clientCall(sdk: ReturnType<typeof sdkCreate>, method: OverviewCase["method"], args: unknown, auth = true) {
  return organizerDashboardClientCreate({ client: sdk.client, token: () => (auth ? ` ${credential} ` : " ") })[method](
    args as never,
  )
}
function httpCall(sdk: ReturnType<typeof sdkCreate>, operation: string, args: object, auth = true) {
  return organizerDashboardHonoCreate(sdk.backend).request("/api/veranstalter", {
    method: "POST",
    headers: { "content-type": "application/json", ...(auth ? { authorization: "Bearer " + credential } : {}) },
    body: JSON.stringify({ operation, ...args }),
  })
}
async function cliCall(sdk: ReturnType<typeof sdkCreate>, operation: string, args: object, auth = true) {
  const output: string[] = []
  const exitCode = await organizerDashboardCliRun({
    argv: [operation, "--url", "https://convex.example.org", "--token-env", "OVERVIEW_TEST_CRED"],
    env: auth ? { OVERVIEW_TEST_CRED: credential } : {},
    stdinText: JSON.stringify(args),
    stdout: (line) => output.push(line),
    backendFromUrl: () => sdk.backend,
  })
  const text = output.join("")
  return { exitCode, text, json: JSON.parse(text) }
}
async function assertForward(entry: OverviewCase, args: object, forwarded: object, token = true) {
  const sdk = sdkCreate()
  const http = await httpCall(sdk, entry.operation, args)
  expect(http.status).toBe(200)
  expect(await http.json()).toEqual({ data })
  const cli = await cliCall(sdk, entry.operation, args)
  expect(cli.exitCode).toBe(0)
  expect(cli.json).toEqual({ success: true, data })
  expect((await clientCall(sdk, entry.method, args)) as unknown).toEqual({ success: true, data })
  expect(sdk.calls).toEqual(
    Array(3).fill({
      kind: entry.kind,
      name: entry.module + ":" + entry.fn,
      args: token ? { token: credential, ...forwarded } : { ...forwarded },
    }),
  )
}
async function assertInvalid(entry: OverviewCase, args: object) {
  const sdk = sdkCreate()
  const http = await httpCall(sdk, entry.operation, args)
  expect(http.status).toBe(400)
  expect(await http.text()).not.toContain(credential)
  const cli = await cliCall(sdk, entry.operation, args)
  expect(cli.exitCode).toBe(2)
  expect(cli.text).not.toContain(credential)
  const ts = await clientCall(sdk, entry.method, args)
  expect(ts).toMatchObject({ success: false, error: { status: 400 } })
  expect(JSON.stringify(ts)).not.toContain(credential)
  expect(sdk.calls).toEqual([])
}

for (const entry of cases) {
  describe(entry.operation + " transport parity", () => {
    test("allowlists and forwards exact canonical function, query kind, credential and normalized args", async () => {
      expect(new Set<string>(organizerDashboardOperations).has(entry.operation)).toBe(true)
      await assertForward(entry, entry.args, entry.forwarded, entry.needsAuth)
    })
    test("strict inputs reject unknown fields, body auth and out-of-range values before transport", async () => {
      for (const extra of [
        { token: credential },
        { authorization: credential },
        { unexpected: true },
        { range: "13" },
        { kind: "gaesteliste" },
        { numItems: 500 },
      ]) {
        await assertInvalid(entry, { ...entry.args, ...extra })
      }
    })
    test("throwing SDK transport is sanitized identically without credential leakage", async () => {
      const sdk = sdkCreate("throw")
      const http = await httpCall(sdk, entry.operation, entry.args)
      expect(http.status).toBe(503)
      const httpText = await http.text()
      expect(httpText).not.toContain(credential)
      expect(JSON.parse(httpText)).toMatchObject({
        error: { code: "organizer-dashboard.transport-unavailable", message: "Backend transport failed" },
      })
      const cli = await cliCall(sdk, entry.operation, entry.args)
      expect(cli.exitCode).toBe(1)
      expect(cli.text).not.toContain(credential)
      expect(cli.json).toMatchObject({
        error: { code: "organizer-dashboard.transport-unavailable", message: "Backend transport failed" },
      })
      expect(await clientCall(sdk, entry.method, entry.args)).toEqual({
        success: false,
        error: { status: 503, message: "Backend transport failed" },
      })
    })
    test("safe backend failures stay failures using the existing unified catalog fallback", async () => {
      const sdk = sdkCreate(createResultError("overviewAuthorization", "Permission denied"))
      const http = await httpCall(sdk, entry.operation, entry.args)
      expect(http.status).toBe(500)
      expect(await http.json()).toMatchObject({ error: { code: "platform.internal", message: "Permission denied" } })
      expect((await cliCall(sdk, entry.operation, entry.args)).json).toMatchObject({
        error: { code: "platform.internal", message: "Permission denied" },
      })
      expect(await clientCall(sdk, entry.method, entry.args)).toEqual({
        success: false,
        error: { status: 503, message: "Permission denied" },
      })
      expect(sdk.calls).toEqual(
        Array(3).fill({
          kind: entry.kind,
          name: entry.module + ":" + entry.fn,
          args: entry.needsAuth ? { token: credential, ...entry.forwarded } : { ...entry.forwarded },
        }),
      )
    })
  })
}

describe("organizer dashboard public transport auth", () => {
  test("HTTP and CLI transports keep the blanket credential rule for public ops", async () => {
    const sdk = sdkCreate()
    expect((await httpCall(sdk, "public-profile-get", { orgSlug: "kulturhaus-lindenhof" }, false)).status).toBe(401)
    expect((await cliCall(sdk, "public-profile-get", { orgSlug: "kulturhaus-lindenhof" }, false)).json).toMatchObject({
      error: { code: "organizer-dashboard.unauthenticated" },
    })
    expect(sdk.calls).toEqual([])
  })
  test("TS client public methods need no credential", async () => {
    const sdk = sdkCreate()
    expect((await clientCall(sdk, "publicProfileGet", { orgSlug: "kulturhaus-lindenhof" }, false)) as unknown).toEqual({
      success: true,
      data,
    })
    expect((await clientCall(sdk, "publicEventGet", { orgSlug: "x", eventKey: "y" }, false)) as unknown).toEqual({
      success: true,
      data,
    })
    expect(sdk.calls).toEqual([
      {
        kind: "query",
        name: "organizerDashboardPublic:organizerDashboardPublicProfileQuery",
        args: { orgSlug: "kulturhaus-lindenhof" },
      },
      {
        kind: "query",
        name: "organizerDashboardPublic:organizerDashboardPublicEventQuery",
        args: { orgSlug: "x", eventKey: "y" },
      },
    ])
  })
})
