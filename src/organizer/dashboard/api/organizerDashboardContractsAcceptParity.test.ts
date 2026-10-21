import { describe, expect, test } from "bun:test"
import type { ConvexHttpClient } from "convex/browser"
import { createResult, createResultError, type Result } from "#result"
import { organizerDashboardCliRun } from "#src/cli/organizerDashboardCliRun.ts"
import { organizerDashboardClientCreate } from "#src/client/organizerDashboardClientCreate.ts"
import { organizerContractDocuments } from "../contracts/organizerContractDocuments.ts"
import { organizerDashboardHonoCreate } from "./organizerDashboardHonoCreate.ts"
import { organizerDashboardMockBackendCreate } from "./organizerDashboardMockBackend.fixture.ts"

const credential = "test-credential-distinct-9f8e7d6c5b4a"

const staleRevision = organizerContractDocuments.terms.revision.replace(/v\d+$/u, "v0")

const validAcceptBody = {
  operation: "contracts-accept",
  orgId: "org_test",
  termsAccepted: true,
  dpaAccepted: true,
  termsRevision: organizerContractDocuments.terms.revision,
  dpaRevision: organizerContractDocuments.dpa.revision,
}

async function postAccept(
  app: ReturnType<typeof organizerDashboardHonoCreate>,
  body: unknown,
  headers?: Record<string, string>,
): Promise<{ status: number; json: Record<string, unknown>; text: string }> {
  const response = await app.request("/api/veranstalter", {
    method: "POST",
    headers: headers ?? { authorization: "Bearer " + credential, "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  return { status: response.status, json: JSON.parse(text) as Record<string, unknown>, text }
}

function errorOf(json: Record<string, unknown>): Record<string, unknown> {
  return json.error as Record<string, unknown>
}

describe("contracts-accept HTTP parity", () => {
  test("accepted request forwards token, orgId, exact revisions and true flags", async () => {
    const { backend, calls } = organizerDashboardMockBackendCreate()
    const { status, json, text } = await postAccept(organizerDashboardHonoCreate(backend), validAcceptBody)
    expect(status).toBe(200)
    expect(json).toEqual({ data: { orgId: "org_test" } })
    expect(text).not.toContain(credential)
    expect(calls).toEqual([
      {
        operation: "contracts-accept",
        args: {
          token: credential,
          orgId: "org_test",
          termsAccepted: true,
          dpaAccepted: true,
          termsRevision: organizerContractDocuments.terms.revision,
          dpaRevision: organizerContractDocuments.dpa.revision,
        },
      },
    ])
  })

  test("missing terms revision is rejected with 400 before the backend runs", async () => {
    const { backend, calls } = organizerDashboardMockBackendCreate()
    const { status, json } = await postAccept(organizerDashboardHonoCreate(backend), {
      operation: "contracts-accept",
      orgId: "org_test",
      termsAccepted: true,
      dpaAccepted: true,
      dpaRevision: organizerContractDocuments.dpa.revision,
    })
    expect(status).toBe(400)
    expect(errorOf(json).code).toBe("organizer-dashboard.invalid-body")
    expect(calls).toEqual([])
  })

  test("stale terms revision is rejected with 400 before the backend runs", async () => {
    const { backend, calls } = organizerDashboardMockBackendCreate()
    const { status, json } = await postAccept(organizerDashboardHonoCreate(backend), {
      ...validAcceptBody,
      termsRevision: staleRevision,
    })
    expect(status).toBe(400)
    expect(errorOf(json).code).toBe("organizer-dashboard.invalid-body")
    expect(calls).toEqual([])
  })

  test("stale dpa revision is rejected with 400 before the backend runs", async () => {
    const { backend, calls } = organizerDashboardMockBackendCreate()
    const { status, json } = await postAccept(organizerDashboardHonoCreate(backend), {
      ...validAcceptBody,
      dpaRevision: staleRevision,
    })
    expect(status).toBe(400)
    expect(errorOf(json).code).toBe("organizer-dashboard.invalid-body")
    expect(calls).toEqual([])
  })

  test("false terms acceptance is rejected with 400 before the backend runs", async () => {
    const { backend, calls } = organizerDashboardMockBackendCreate()
    const { status, json } = await postAccept(organizerDashboardHonoCreate(backend), {
      ...validAcceptBody,
      termsAccepted: false,
    })
    expect(status).toBe(400)
    expect(errorOf(json).code).toBe("organizer-dashboard.invalid-body")
    expect(calls).toEqual([])
  })

  test("false dpa acceptance is rejected with 400 before the backend runs", async () => {
    const { backend, calls } = organizerDashboardMockBackendCreate()
    const { status, json } = await postAccept(organizerDashboardHonoCreate(backend), {
      ...validAcceptBody,
      dpaAccepted: false,
    })
    expect(status).toBe(400)
    expect(errorOf(json).code).toBe("organizer-dashboard.invalid-body")
    expect(calls).toEqual([])
  })

  test("missing auth returns 401 without dispatching and without echoing the credential", async () => {
    const { backend, calls } = organizerDashboardMockBackendCreate()
    const { status, json, text } = await postAccept(organizerDashboardHonoCreate(backend), validAcceptBody, {
      "content-type": "application/json",
    })
    expect(status).toBe(401)
    expect(errorOf(json)).toMatchObject({
      code: "organizer-dashboard.unauthenticated",
      status: 401,
      retryable: false,
    })
    expect(text).not.toContain(credential)
    expect(calls).toEqual([])
  })

  test("transport failure is sanitized and never leaks the credential", async () => {
    const { backend } = organizerDashboardMockBackendCreate({
      contractsAccept: async () => {
        throw new Error("dial failed using " + credential)
      },
    })
    const { status, json, text } = await postAccept(organizerDashboardHonoCreate(backend), validAcceptBody)
    expect(status).toBe(503)
    expect(errorOf(json)).toMatchObject({
      code: "organizer-dashboard.transport-unavailable",
      message: "Backend transport failed",
      retryable: true,
    })
    expect(text).not.toContain(credential)
  })

  test("backend rejection without a catalog code maps to platform.internal", async () => {
    const { backend } = organizerDashboardMockBackendCreate({
      contractsAccept: async () =>
        createResultError(
          "organizerContractsAcceptMutation",
          "Only the organization owner may accept contracts",
        ) as Result<unknown>,
    })
    const { status, json, text } = await postAccept(organizerDashboardHonoCreate(backend), validAcceptBody)
    expect(status).toBe(500)
    expect(errorOf(json)).toMatchObject({
      code: "platform.internal",
      message: "Only the organization owner may accept contracts",
      op: "organizerContractsAcceptMutation",
      status: 500,
    })
    expect(text).not.toContain(credential)
  })

  test("create without the contract revisions is rejected with 400", async () => {
    const { backend, calls } = organizerDashboardMockBackendCreate()
    const { status, json } = await postAccept(organizerDashboardHonoCreate(backend), {
      operation: "create",
      name: "Kulturhaus Lindenhof",
      slug: "kulturhaus-lindenhof",
      kind: "verein",
      termsAccepted: true,
      dpaAccepted: true,
    })
    expect(status).toBe(400)
    expect(errorOf(json).code).toBe("organizer-dashboard.invalid-body")
    expect(calls).toEqual([])
  })
})

describe("contracts-accept CLI parity", () => {
  test("CLI forwards the same args as the HTTP surface", async () => {
    const httpMocks = organizerDashboardMockBackendCreate()
    await postAccept(organizerDashboardHonoCreate(httpMocks.backend), validAcceptBody)

    const cliMocks = organizerDashboardMockBackendCreate()
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["contracts-accept", "--url", "https://convex.example.org", "--token-env", "DASH_CRED"],
      env: { DASH_CRED: credential },
      stdinText: JSON.stringify({
        orgId: "org_test",
        termsAccepted: true,
        dpaAccepted: true,
        termsRevision: organizerContractDocuments.terms.revision,
        dpaRevision: organizerContractDocuments.dpa.revision,
      }),
      stdout: (text) => lines.push(text),
      backendFromUrl: () => cliMocks.backend,
    })
    expect(exitCode).toBe(0)
    expect(JSON.parse(lines.join(""))).toEqual({ success: true, data: { orgId: "org_test" } })
    expect(cliMocks.calls).toEqual(httpMocks.calls)
  })

  test("CLI rejects a stale revision with exit 2 before the backend runs", async () => {
    const { backend, calls } = organizerDashboardMockBackendCreate()
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["contracts-accept", "--url", "https://convex.example.org", "--token-env", "DASH_CRED"],
      env: { DASH_CRED: credential },
      stdinText: JSON.stringify({
        orgId: "org_test",
        termsAccepted: true,
        dpaAccepted: true,
        termsRevision: staleRevision,
        dpaRevision: organizerContractDocuments.dpa.revision,
      }),
      stdout: (text) => lines.push(text),
      backendFromUrl: () => backend,
    })
    expect(exitCode).toBe(2)
    expect(errorOf(JSON.parse(lines.join("")) as Record<string, unknown>).code).toBe("organizer-dashboard.invalid-body")
    expect(calls).toEqual([])
  })

  test("CLI rejects a false acceptance flag with exit 2 before the backend runs", async () => {
    const { backend, calls } = organizerDashboardMockBackendCreate()
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["contracts-accept", "--url", "https://convex.example.org", "--token-env", "DASH_CRED"],
      env: { DASH_CRED: credential },
      stdinText: JSON.stringify({
        orgId: "org_test",
        termsAccepted: true,
        dpaAccepted: false,
        termsRevision: organizerContractDocuments.terms.revision,
        dpaRevision: organizerContractDocuments.dpa.revision,
      }),
      stdout: (text) => lines.push(text),
      backendFromUrl: () => backend,
    })
    expect(exitCode).toBe(2)
    expect(calls).toEqual([])
  })

  test("CLI reports a missing credential without leaking any value", async () => {
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["contracts-accept", "--url", "https://convex.example.org", "--token-env", "DASH_CRED_MISSING"],
      env: { DASH_CRED_MISSING: undefined },
      stdinText: JSON.stringify({
        orgId: "org_test",
        termsAccepted: true,
        dpaAccepted: true,
        termsRevision: organizerContractDocuments.terms.revision,
        dpaRevision: organizerContractDocuments.dpa.revision,
      }),
      stdout: (text) => lines.push(text),
      backendFromUrl: () => organizerDashboardMockBackendCreate().backend,
    })
    expect(exitCode).toBe(2)
    const output = lines.join("")
    expect(errorOf(JSON.parse(output) as Record<string, unknown>).code).toBe("organizer-dashboard.unauthenticated")
    expect(output).not.toContain(credential)
  })
})

describe("contracts-accept TS client", () => {
  test("contractsAccept forwards the token plus the validated consent fields", async () => {
    const seen: unknown[] = []
    const fakeClient = {
      query: async () => createResult({}),
      mutation: async (_ref: unknown, args: unknown) => {
        seen.push(args)
        return createResult({ orgId: "org_test" })
      },
    } as unknown as ConvexHttpClient
    const client = organizerDashboardClientCreate({ client: fakeClient, token: () => credential })
    const result = await client.contractsAccept({
      orgId: "org_test",
      termsAccepted: true,
      dpaAccepted: true,
      termsRevision: organizerContractDocuments.terms.revision,
      dpaRevision: organizerContractDocuments.dpa.revision,
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.orgId as string).toBe("org_test")
    expect(seen).toEqual([
      {
        token: credential,
        orgId: "org_test",
        termsAccepted: true,
        dpaAccepted: true,
        termsRevision: organizerContractDocuments.terms.revision,
        dpaRevision: organizerContractDocuments.dpa.revision,
      },
    ])
  })

  test("a stale revision is a local 400 without a transport call", async () => {
    let called = false
    const fakeClient = {
      query: async () => {
        called = true
        return createResult({})
      },
      mutation: async () => {
        called = true
        return createResult({})
      },
    } as unknown as ConvexHttpClient
    const client = organizerDashboardClientCreate({ client: fakeClient, token: credential })
    const result = await client.contractsAccept({
      orgId: "org_test",
      termsAccepted: true,
      dpaAccepted: true,
      termsRevision: staleRevision,
      dpaRevision: organizerContractDocuments.dpa.revision,
    } as never)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.status).toBe(400)
    expect(called).toBe(false)
  })

  test("a false acceptance flag is a local 400 without a transport call", async () => {
    let called = false
    const fakeClient = {
      query: async () => {
        called = true
        return createResult({})
      },
      mutation: async () => {
        called = true
        return createResult({})
      },
    } as unknown as ConvexHttpClient
    const client = organizerDashboardClientCreate({ client: fakeClient, token: credential })
    const result = await client.contractsAccept({
      orgId: "org_test",
      termsAccepted: false,
      dpaAccepted: true,
      termsRevision: organizerContractDocuments.terms.revision,
      dpaRevision: organizerContractDocuments.dpa.revision,
    } as never)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.status).toBe(400)
    expect(called).toBe(false)
  })

  test("a missing credential is a local 401 without a transport call", async () => {
    let called = false
    const fakeClient = {
      query: async () => {
        called = true
        return createResult({})
      },
      mutation: async () => {
        called = true
        return createResult({})
      },
    } as unknown as ConvexHttpClient
    const client = organizerDashboardClientCreate({ client: fakeClient, token: () => undefined })
    const result = await client.contractsAccept({
      orgId: "org_test",
      termsAccepted: true,
      dpaAccepted: true,
      termsRevision: organizerContractDocuments.terms.revision,
      dpaRevision: organizerContractDocuments.dpa.revision,
    })
    expect(result).toEqual({ success: false, error: { status: 401, message: "Missing auth credential" } })
    expect(called).toBe(false)
  })

  test("an SDK throw surfaces a sanitized 503 without raw error text", async () => {
    const fakeClient = {
      query: async () => createResult({}),
      mutation: async () => {
        throw new Error("network down for " + credential)
      },
    } as unknown as ConvexHttpClient
    const client = organizerDashboardClientCreate({ client: fakeClient, token: credential })
    const result = await client.contractsAccept({
      orgId: "org_test",
      termsAccepted: true,
      dpaAccepted: true,
      termsRevision: organizerContractDocuments.terms.revision,
      dpaRevision: organizerContractDocuments.dpa.revision,
    })
    expect(result).toEqual({ success: false, error: { status: 503, message: "Backend transport failed" } })
  })

  test("organizationCreate forwards the required contract revisions", async () => {
    const seen: unknown[] = []
    const fakeClient = {
      query: async () => createResult({}),
      mutation: async (_ref: unknown, args: unknown) => {
        seen.push(args)
        return createResult({ orgId: "org_test" })
      },
    } as unknown as ConvexHttpClient
    const client = organizerDashboardClientCreate({ client: fakeClient, token: credential })
    const result = await client.organizationCreate({
      name: "Kulturhaus Lindenhof",
      slug: "kulturhaus-lindenhof",
      kind: "verein",
      termsRevision: organizerContractDocuments.terms.revision,
      dpaRevision: organizerContractDocuments.dpa.revision,
      termsAccepted: true,
      dpaAccepted: true,
    })
    expect(result.success).toBe(true)
    expect(seen).toEqual([
      {
        name: "Kulturhaus Lindenhof",
        slug: "kulturhaus-lindenhof",
        kind: "verein",
        termsRevision: organizerContractDocuments.terms.revision,
        dpaRevision: organizerContractDocuments.dpa.revision,
        termsAccepted: true,
        dpaAccepted: true,
        token: credential,
      },
    ])
  })
})
