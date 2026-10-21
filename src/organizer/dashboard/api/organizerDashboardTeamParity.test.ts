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

const credential = "team-parity-private-credential-9c3b"
const orgId = "org_test"
const memberId = "member_test"
const invitationId = "invitation_test"
const page = { numItems: 50, cursor: "cursor_one", endCursor: "cursor_two" }
const pageData = { page: [{ id: invitationId }], isDone: false, continueCursor: "cursor_next" }

const cases = [
  {
    operation: "team-member-list",
    method: "teamMemberList",
    fn: "organizerDashboardTeamMemberListQuery",
    kind: "query",
    args: { orgId, ...page },
    forwarded: { orgId, paginationOpts: page },
    data: pageData,
  },
  {
    operation: "team-invitation-list",
    method: "teamInvitationList",
    fn: "organizerDashboardTeamInvitationListQuery",
    kind: "query",
    args: { orgId, ...page },
    forwarded: { orgId, paginationOpts: page },
    data: pageData,
  },
  {
    operation: "team-invite",
    method: "teamInvite",
    fn: "organizerDashboardTeamInviteMutation",
    kind: "mutation",
    args: { orgId, emails: ["alice@example.org", "bob@example.org"], organizerRole: "admin" },
    forwarded: { orgId, emails: ["alice@example.org", "bob@example.org"], organizerRole: "admin" },
    data: { invitations: [{ id: invitationId, deliveryState: "queued" }] },
  },
  {
    operation: "team-role-update",
    method: "teamRoleUpdate",
    fn: "organizerDashboardTeamRoleUpdateMutation",
    kind: "mutation",
    args: { orgId, memberId, organizerRole: null },
    forwarded: { orgId, memberId, organizerRole: null },
    data: { id: memberId, organizerRole: null },
  },
  {
    operation: "team-member-remove",
    method: "teamMemberRemove",
    fn: "organizerDashboardTeamMemberRemoveMutation",
    kind: "mutation",
    args: { orgId, memberId },
    forwarded: { orgId, memberId },
    data: { id: memberId, organizerRole: null },
  },
  {
    operation: "team-invitation-revoke",
    method: "teamInvitationRevoke",
    fn: "organizerDashboardTeamInvitationRevokeMutation",
    kind: "mutation",
    args: { orgId, invitationId },
    forwarded: { orgId, invitationId },
    data: { id: invitationId, status: "revoked" },
  },
  {
    operation: "team-invitation-resend",
    method: "teamInvitationResend",
    fn: "organizerDashboardTeamInvitationResendMutation",
    kind: "mutation",
    args: { orgId, invitationId },
    forwarded: { orgId, invitationId },
    data: { id: invitationId, deliveryState: "queued" },
  },
  {
    operation: "team-invitation-inbox",
    method: "teamInvitationInbox",
    fn: "organizerDashboardTeamInvitationInboxQuery",
    kind: "query",
    args: { ...page },
    forwarded: { paginationOpts: page },
    data: { ...pageData, accountEmail: "alice@example.org" },
  },
  {
    operation: "team-invitation-accept",
    method: "teamInvitationAccept",
    fn: "organizerDashboardTeamInvitationAcceptMutation",
    kind: "mutation",
    args: { invitationId },
    forwarded: { invitationId },
    data: { memberId, orgId, organizerRole: "eventmanager" },
  },
] satisfies readonly {
  operation: string
  method: keyof OrganizerDashboardClient
  fn: string
  kind: string
  args: object
  forwarded: object
  data: unknown
}[]

type TeamCase = (typeof cases)[number]

function sdkCreate(response: Result<unknown> | "throw") {
  const calls: unknown[] = []
  const invoke = async (kind: string, reference: Parameters<typeof getFunctionName>[0], args: unknown) => {
    calls.push({ kind, name: getFunctionName(reference), args })
    if (response === "throw") throw new Error("SDK echoed " + credential)
    return response
  }
  const client = {
    query: (reference: Parameters<typeof getFunctionName>[0], args: unknown) => invoke("query", reference, args),
    mutation: (reference: Parameters<typeof getFunctionName>[0], args: unknown) => invoke("mutation", reference, args),
  } as unknown as ConvexHttpClient
  return { client, calls, backend: organizerDashboardConvexBackendCreate(client) }
}

function clientCall(client: OrganizerDashboardClient, method: TeamCase["method"], args: unknown) {
  // Invalid-input cases intentionally cross the compile-time input boundary.
  return client[method](args as never)
}

async function httpCall(sdk: ReturnType<typeof sdkCreate>, operation: string, args: unknown, authenticated = true) {
  return organizerDashboardHonoCreate(sdk.backend).request("/api/veranstalter", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authenticated ? { authorization: "Bearer " + credential } : {}),
    },
    body: JSON.stringify({ operation, ...(args as object) }),
  })
}

async function cliCall(sdk: ReturnType<typeof sdkCreate>, operation: string, args: unknown, authenticated = true) {
  const lines: string[] = []
  const exitCode = await organizerDashboardCliRun({
    argv: [operation, "--url", "https://convex.example.org", "--token-env", "TEAM_TEST_CRED"],
    env: authenticated ? { TEAM_TEST_CRED: credential } : {},
    stdinText: JSON.stringify(args),
    stdout: (line) => lines.push(line),
    backendFromUrl: () => sdk.backend,
  })
  return { exitCode, text: lines.join(""), json: JSON.parse(lines.join("")) as Record<string, unknown> }
}

for (const entry of cases) {
  describe(entry.operation + " transport parity", () => {
    test("allowlisted HTTP, CLI and client forward exactly the same auth and payload to the canonical Convex function", async () => {
      expect(new Set<string>(organizerDashboardOperations).has(entry.operation)).toBe(true)
      const http = sdkCreate(createResult(entry.data))
      const httpResult = await httpCall(http, entry.operation, entry.args)
      expect(httpResult.status).toBe(200)
      expect(await httpResult.json()).toEqual({ data: entry.data })
      const cli = sdkCreate(createResult(entry.data))
      const cliResult = await cliCall(cli, entry.operation, entry.args)
      expect(cliResult.exitCode).toBe(0)
      expect(cliResult.json).toEqual({ success: true, data: entry.data })
      const ts = sdkCreate(createResult(entry.data))
      const clientResult = await clientCall(
        organizerDashboardClientCreate({ client: ts.client, token: " " + credential + " " }),
        entry.method,
        entry.args,
      )
      expect(clientResult as unknown).toEqual({ success: true, data: entry.data })
      const expected = [
        {
          kind: entry.kind,
          name: "organizerDashboardTeam:" + entry.fn,
          args: { token: credential, ...entry.forwarded },
        },
      ]
      expect(http.calls).toEqual(expected)
      expect(cli.calls).toEqual(expected)
      expect(ts.calls).toEqual(expected)
      expect(JSON.stringify([cliResult.json, clientResult])).not.toContain(credential)
    })

    test("missing auth is rejected before transport on every surface", async () => {
      const sdk = sdkCreate(createResult(entry.data))
      expect((await httpCall(sdk, entry.operation, entry.args, false)).status).toBe(401)
      const cli = await cliCall(sdk, entry.operation, entry.args, false)
      expect(cli.exitCode).toBe(2)
      expect(cli.json.error).toMatchObject({ code: "organizer-dashboard.unauthenticated" })
      const result = await clientCall(
        organizerDashboardClientCreate({ client: sdk.client, token: () => " " }),
        entry.method,
        entry.args,
      )
      expect(result).toMatchObject({ success: false, error: { status: 401 } })
      expect(sdk.calls).toEqual([])
    })

    test("unknown fields and body credentials are rejected locally without echoing credentials", async () => {
      for (const extra of [{ token: credential }, { authorization: credential }, { unexpected: true }]) {
        const sdk = sdkCreate(createResult(entry.data))
        const args = { ...entry.args, ...extra }
        const http = await httpCall(sdk, entry.operation, args)
        expect(http.status).toBe(400)
        expect(await http.text()).not.toContain(credential)
        const cli = await cliCall(sdk, entry.operation, args)
        expect(cli.exitCode).toBe(2)
        expect(cli.text).not.toContain(credential)
        const result = await clientCall(
          organizerDashboardClientCreate({ client: sdk.client, token: credential }),
          entry.method,
          args,
        )
        expect(result).toMatchObject({ success: false, error: { status: 400 } })
        expect(JSON.stringify(result)).not.toContain(credential)
        expect(sdk.calls).toEqual([])
      }
    })

    test("SDK throws are sanitized on HTTP, CLI and client", async () => {
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
      const result = await clientCall(
        organizerDashboardClientCreate({ client: sdk.client, token: credential }),
        entry.method,
        entry.args,
      )
      expect(result).toEqual({ success: false, error: { status: 503, message: "Backend transport failed" } })
    })

    test("backend rejection stays a failure and preserves its safe message", async () => {
      const sdk = sdkCreate(createResultError("teamAuthorization", "Team permission denied"))
      const http = await httpCall(sdk, entry.operation, entry.args)
      expect(http.status).toBe(500)
      expect(await http.json()).toMatchObject({
        error: { code: "platform.internal", message: "Team permission denied" },
      })
      const cli = await cliCall(sdk, entry.operation, entry.args)
      expect(cli.exitCode).toBe(1)
      expect(cli.json).toMatchObject({ error: { message: "Team permission denied" } })
      const result = await clientCall(
        organizerDashboardClientCreate({ client: sdk.client, token: credential }),
        entry.method,
        entry.args,
      )
      expect(result).toEqual({ success: false, error: { status: 503, message: "Team permission denied" } })
    })
  })
}

const invalidCases = [
  { method: "teamMemberList", operation: "team-member-list", args: {} },
  { method: "teamInvitationList", operation: "team-invitation-list", args: {} },
  { method: "teamInvite", operation: "team-invite", args: { orgId, emails: [], organizerRole: "admin" } },
  {
    method: "teamInvite",
    operation: "team-invite",
    args: { orgId, emails: Array(6).fill("alice@example.org"), organizerRole: "admin" },
  },
  { method: "teamInvite", operation: "team-invite", args: { orgId, emails: ["not-an-email"], organizerRole: "admin" } },
  {
    method: "teamInvite",
    operation: "team-invite",
    args: { orgId, emails: ["alice@example.org"], organizerRole: "owner" },
  },
  { method: "teamRoleUpdate", operation: "team-role-update", args: { orgId, memberId, organizerRole: "owner" } },
  { method: "teamRoleUpdate", operation: "team-role-update", args: { orgId, memberId } },
  { method: "teamMemberRemove", operation: "team-member-remove", args: { orgId } },
  { method: "teamInvitationRevoke", operation: "team-invitation-revoke", args: { orgId } },
  { method: "teamInvitationResend", operation: "team-invitation-resend", args: { orgId } },
  { method: "teamInvitationInbox", operation: "team-invitation-inbox", args: { orgId } },
  { method: "teamInvitationInbox", operation: "team-invitation-inbox", args: { email: "other@example.org" } },
  { method: "teamInvitationAccept", operation: "team-invitation-accept", args: {} },
  { method: "teamInvitationAccept", operation: "team-invitation-accept", args: { invitationId, orgId } },
  {
    method: "teamInvitationAccept",
    operation: "team-invitation-accept",
    args: { invitationId, organizerRole: "inhaber" },
  },
] satisfies readonly { method: TeamCase["method"]; operation: string; args: object }[]

for (const [index, entry] of invalidCases.entries()) {
  test(
    entry.operation + " malformed payload " + index + " is rejected by HTTP, CLI and client without transport",
    async () => {
      const sdk = sdkCreate(createResult({}))
      expect((await httpCall(sdk, entry.operation, entry.args)).status).toBe(400)
      expect((await cliCall(sdk, entry.operation, entry.args)).exitCode).toBe(2)
      expect(
        await clientCall(
          organizerDashboardClientCreate({ client: sdk.client, token: credential }),
          entry.method,
          entry.args,
        ),
      ).toMatchObject({ success: false, error: { status: 400 } })
      expect(sdk.calls).toEqual([])
    },
  )
}

for (const entry of cases.filter((entry) => entry.kind === "query")) {
  test(entry.operation + " defaults pagination and omits null endCursor on every surface", async () => {
    const sdk = sdkCreate(createResult(pageData))
    const args = entry.operation === "team-invitation-inbox" ? { endCursor: null } : { orgId, endCursor: null }
    await httpCall(sdk, entry.operation, args)
    await cliCall(sdk, entry.operation, args)
    await clientCall(organizerDashboardClientCreate({ client: sdk.client, token: credential }), entry.method, args)
    expect(sdk.calls).toEqual(
      Array(3).fill({
        kind: "query",
        name: "organizerDashboardTeam:" + entry.fn,
        args: {
          token: credential,
          ...(entry.operation === "team-invitation-inbox" ? {} : { orgId }),
          paginationOpts: { numItems: 25, cursor: null },
        },
      }),
    )
  })
  test(entry.operation + " enforces integer pagination cap 50 before transport", async () => {
    for (const numItems of [0, -1, 1.5, 51, "25"]) {
      const sdk = sdkCreate(createResult(pageData))
      const args = { ...entry.args, numItems }
      expect((await httpCall(sdk, entry.operation, args)).status).toBe(400)
      expect((await cliCall(sdk, entry.operation, args)).exitCode).toBe(2)
      expect(
        await clientCall(organizerDashboardClientCreate({ client: sdk.client, token: credential }), entry.method, args),
      ).toMatchObject({ success: false, error: { status: 400 } })
      expect(sdk.calls).toEqual([])
    }
  })
}

test("CLI authenticated inbox needs neither an organization nor stdin JSON", async () => {
  const sdk = sdkCreate(createResult({ ...pageData, accountEmail: null }))
  const output: string[] = []
  expect(
    await organizerDashboardCliRun({
      argv: ["team-invitation-inbox", "--url", "https://convex.example.org", "--token-env", "TEAM_TEST_CRED"],
      env: { TEAM_TEST_CRED: credential },
      stdinText: "",
      stdout: (text) => output.push(text),
      backendFromUrl: () => sdk.backend,
    }),
  ).toBe(0)
  expect(sdk.calls).toEqual([
    {
      kind: "query",
      name: "organizerDashboardTeam:organizerDashboardTeamInvitationInboxQuery",
      args: { token: credential, paginationOpts: { numItems: 25, cursor: null } },
    },
  ])
})
