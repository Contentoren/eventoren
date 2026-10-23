import { organizerContractDocuments } from "#src/organizer/dashboard/contracts/organizerContractDocuments.ts"
import { describe, expect, test } from "bun:test"
import { organizerContractPartyConsentFixture } from "../../../../test/organizerContractPartyConsent.fixture.ts"
import type { ConvexHttpClient } from "convex/browser"
import { createResult, createResultError, createResultErrorCode, type Result } from "#result"
import { organizerDashboardCliRun } from "#src/cli/organizerDashboardCliRun.ts"
import { organizerDashboardClientCreate } from "#src/client/organizerDashboardClientCreate.ts"
import { organizerDashboardHonoCreate } from "./organizerDashboardHonoCreate.ts"
import { organizerDashboardMockBackendCreate } from "./organizerDashboardMockBackend.fixture.ts"
import { organizerDashboardOperations } from "./organizerDashboardOperations.ts"
import { organizerDashboardRequestMaxBytes } from "./organizerDashboardRequestMaxBytes.ts"

const credential = "test-credential-distinct-9f8e7d6c5b4a"
const otherCredential = "other-credential-distinct-1a2b3c4d5e6f"

const validCreateBody = {
  operation: "create",
  name: "Kulturhaus Lindenhof",
  slug: "kulturhaus-lindenhof",
  kind: "verein",
  contactEmail: "hallo@example.org",
  termsRevision: organizerContractDocuments.terms.revision,
  dpaRevision: organizerContractDocuments.dpa.revision,
  termsAccepted: true,
  ...organizerContractPartyConsentFixture,
  dpaAccepted: true,
}

function authorizedHeaders(body: unknown): Record<string, string> {
  return {
    authorization: "Bearer " + credential,
    "content-type": "application/json",
    ...(typeof body === "string" ? {} : {}),
  }
}

async function postOperation(
  app: ReturnType<typeof organizerDashboardHonoCreate>,
  body: unknown,
  headers?: Record<string, string>,
): Promise<{ status: number; json: Record<string, unknown>; text: string }> {
  const response = await app.request("/api/veranstalter", {
    method: "POST",
    headers: headers ?? authorizedHeaders(body),
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
  const text = await response.text()
  return { status: response.status, json: JSON.parse(text) as Record<string, unknown>, text }
}

function errorOf(json: Record<string, unknown>): Record<string, unknown> {
  return json.error as Record<string, unknown>
}

describe("organizer dashboard HTTP operations", () => {
  test("context returns backend data with 200", async () => {
    const { backend, calls } = organizerDashboardMockBackendCreate()
    const { status, json } = await postOperation(organizerDashboardHonoCreate(backend), {
      operation: "context",
    })
    expect(status).toBe(200)
    expect(json).toEqual({ data: { organizations: [], activeOrganization: null } })
    expect(calls).toEqual([{ operation: "context", args: { token: credential } }])
  })

  test("create forwards flat backend args with 200", async () => {
    const { backend, calls } = organizerDashboardMockBackendCreate()
    const { status } = await postOperation(organizerDashboardHonoCreate(backend), validCreateBody)
    expect(status).toBe(200)
    expect(calls).toEqual([
      {
        operation: "create",
        args: {
          token: credential,
          name: "Kulturhaus Lindenhof",
          slug: "kulturhaus-lindenhof",
          kind: "verein",
          contactEmail: "hallo@example.org",
          termsRevision: organizerContractDocuments.terms.revision,
          dpaRevision: organizerContractDocuments.dpa.revision,
          termsAccepted: true,
          ...organizerContractPartyConsentFixture,
          dpaAccepted: true,
        },
      },
    ])
  })

  test("update forwards flat backend args with 200", async () => {
    const { backend, calls } = organizerDashboardMockBackendCreate()
    const { status } = await postOperation(organizerDashboardHonoCreate(backend), {
      operation: "update",
      orgId: "org_test",
      name: "Neuer Name",
    })
    expect(status).toBe(200)
    expect(calls).toEqual([{ operation: "update", args: { token: credential, orgId: "org_test", name: "Neuer Name" } }])
  })

  test("missing auth returns 401 unauthenticated envelope", async () => {
    const { backend } = organizerDashboardMockBackendCreate()
    const { status, json, text } = await postOperation(
      organizerDashboardHonoCreate(backend),
      { operation: "context" },
      { "content-type": "application/json" },
    )
    expect(status).toBe(401)
    expect(errorOf(json)).toMatchObject({
      code: "organizer-dashboard.unauthenticated",
      status: 401,
      retryable: false,
    })
    expect(typeof errorOf(json).requestId).toBe("string")
    expect(text).not.toContain(credential)
  })

  test("malformed auth scheme returns 401", async () => {
    const { backend } = organizerDashboardMockBackendCreate()
    const { status, json } = await postOperation(
      organizerDashboardHonoCreate(backend),
      { operation: "context" },
      { "content-type": "application/json", authorization: "Token " + credential },
    )
    expect(status).toBe(401)
    expect(errorOf(json).code).toBe("organizer-dashboard.unauthenticated")
  })

  test("invalid JSON returns 400 invalid-body", async () => {
    const { backend } = organizerDashboardMockBackendCreate()
    const { status, json } = await postOperation(organizerDashboardHonoCreate(backend), "{not-json")
    expect(status).toBe(400)
    expect(errorOf(json).code).toBe("organizer-dashboard.invalid-body")
  })

  test("unknown operation returns 404 unknown-operation", async () => {
    const { backend } = organizerDashboardMockBackendCreate()
    const { status, json } = await postOperation(organizerDashboardHonoCreate(backend), {
      operation: "delete-everything",
    })
    expect(status).toBe(404)
    expect(errorOf(json)).toMatchObject({
      code: "organizer-dashboard.unknown-operation",
      status: 404,
      retryable: false,
    })
  })

  test("credential field in body is rejected and never echoed", async () => {
    const { backend } = organizerDashboardMockBackendCreate()
    const { status, json, text } = await postOperation(organizerDashboardHonoCreate(backend), {
      operation: "context",
      token: credential,
    })
    expect(status).toBe(400)
    expect(errorOf(json).code).toBe("organizer-dashboard.invalid-body")
    expect(text).not.toContain(credential)
  })

  test("oversize body returns 400", async () => {
    const { backend } = organizerDashboardMockBackendCreate()
    const big = JSON.stringify({ operation: "context", padding: "x".repeat(organizerDashboardRequestMaxBytes + 1) })
    const { status, json, text } = await postOperation(organizerDashboardHonoCreate(backend), big)
    expect(status).toBe(400)
    expect(errorOf(json).code).toBe("organizer-dashboard.invalid-body")
    expect(text).not.toContain(credential)
  })

  test("oversize content-length header returns 400 before reading", async () => {
    const { backend } = organizerDashboardMockBackendCreate()
    const app = organizerDashboardHonoCreate(backend)
    const response = await app.request("/api/veranstalter", {
      method: "POST",
      headers: {
        ...authorizedHeaders({}),
        "content-length": String(organizerDashboardRequestMaxBytes + 1),
      },
      body: JSON.stringify({ operation: "context" }),
    })
    expect(response.status).toBe(400)
    const json = (await response.json()) as Record<string, unknown>
    expect(errorOf(json).code).toBe("organizer-dashboard.invalid-body")
  })

  test("backend rejection without code maps to platform.internal/500", async () => {
    const { backend } = organizerDashboardMockBackendCreate({
      organizationCreate: async () =>
        createResultError("organizerDashboardOrganizationCreateMutation", "Slug is already taken") as Result<unknown>,
    })
    const { status, json, text } = await postOperation(organizerDashboardHonoCreate(backend), validCreateBody)
    expect(status).toBe(500)
    expect(errorOf(json)).toMatchObject({
      code: "platform.internal",
      message: "Slug is already taken",
      op: "organizerDashboardOrganizationCreateMutation",
      status: 500,
      retryable: false,
    })
    expect(text).not.toContain(credential)
  })

  test("backend rejection with catalog code is honored", async () => {
    const { backend } = organizerDashboardMockBackendCreate({
      contextQuery: async () =>
        createResultErrorCode(
          "organizerDashboardContextQuery",
          "custom failure",
          "organizer-dashboard.invalid-body",
        ) as Result<unknown>,
    })
    const { status, json } = await postOperation(organizerDashboardHonoCreate(backend), {
      operation: "context",
    })
    expect(status).toBe(400)
    expect(errorOf(json).code).toBe("organizer-dashboard.invalid-body")
  })

  test("transport throw maps to 503 transport-unavailable", async () => {
    const { backend } = organizerDashboardMockBackendCreate({
      contextQuery: async () => {
        throw new Error("connection refused")
      },
    })
    const { status, json } = await postOperation(organizerDashboardHonoCreate(backend), {
      operation: "context",
    })
    expect(status).toBe(503)
    expect(errorOf(json)).toMatchObject({
      code: "organizer-dashboard.transport-unavailable",
      retryable: true,
    })
  })

  test("unknown path returns 404 unknown-operation", async () => {
    const { backend } = organizerDashboardMockBackendCreate()
    const app = organizerDashboardHonoCreate(backend)
    const response = await app.request("/api/veranstalter/unknown", {
      method: "POST",
      headers: authorizedHeaders({}),
      body: JSON.stringify({ operation: "context" }),
    })
    expect(response.status).toBe(404)
  })
})

describe("organizer dashboard CLI and HTTP schema parity", () => {
  test("CLI create validates with the same schema and forwards identical args", async () => {
    const httpMocks = organizerDashboardMockBackendCreate()
    await postOperation(organizerDashboardHonoCreate(httpMocks.backend), validCreateBody)

    const cliMocks = organizerDashboardMockBackendCreate()
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["create", "--url", "https://convex.example.org", "--token-env", "DASH_CRED"],
      env: { DASH_CRED: credential },
      stdinText: JSON.stringify({
        name: "Kulturhaus Lindenhof",
        slug: "kulturhaus-lindenhof",
        kind: "verein",
        contactEmail: "hallo@example.org",
        termsRevision: organizerContractDocuments.terms.revision,
        dpaRevision: organizerContractDocuments.dpa.revision,
        termsAccepted: true,
        ...organizerContractPartyConsentFixture,
        dpaAccepted: true,
      }),
      stdout: (text) => lines.push(text),
      backendFromUrl: () => cliMocks.backend,
    })
    expect(exitCode).toBe(0)
    expect(JSON.parse(lines.join(""))).toEqual({ success: true, data: { orgId: "org_test" } })
    expect(cliMocks.calls).toEqual(httpMocks.calls)
  })

  test("CLI rejects invalid create input with exit 2", async () => {
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["create", "--url", "https://convex.example.org", "--token-env", "DASH_CRED"],
      env: { DASH_CRED: credential },
      stdinText: JSON.stringify({ name: "Ohne Rest" }),
      stdout: (text) => lines.push(text),
      backendFromUrl: () => organizerDashboardMockBackendCreate().backend,
    })
    expect(exitCode).toBe(2)
    expect(errorOf(JSON.parse(lines.join("")) as Record<string, unknown>).code).toBe("organizer-dashboard.invalid-body")
  })

  test("CLI requires explicit url", async () => {
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["context", "--token-env", "DASH_CRED"],
      env: { DASH_CRED: credential },
      stdinText: "{}",
      stdout: (text) => lines.push(text),
      backendFromUrl: () => organizerDashboardMockBackendCreate().backend,
    })
    expect(exitCode).toBe(2)
    expect(lines.join("")).toContain("Missing required --url")
  })

  test("CLI missing credential fails without leaking values", async () => {
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["context", "--url", "https://convex.example.org", "--token-env", "DASH_CRED_MISSING"],
      env: { DASH_CRED_MISSING: undefined, UNRELATED: otherCredential },
      stdinText: "{}",
      stdout: (text) => lines.push(text),
      backendFromUrl: () => organizerDashboardMockBackendCreate().backend,
    })
    expect(exitCode).not.toBe(0)
    const output = lines.join("")
    expect(output).toContain("DASH_CRED_MISSING")
    expect(output).not.toContain(otherCredential)
    expect(errorOf(JSON.parse(output) as Record<string, unknown>).code).toBe("organizer-dashboard.unauthenticated")
  })

  test("CLI unknown subcommand maps to unknown-operation", async () => {
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["delete-everything"],
      env: {},
      stdinText: "",
      stdout: (text) => lines.push(text),
      backendFromUrl: () => organizerDashboardMockBackendCreate().backend,
    })
    expect(exitCode).toBe(2)
    expect(errorOf(JSON.parse(lines.join("")) as Record<string, unknown>).code).toBe(
      "organizer-dashboard.unknown-operation",
    )
  })

  test("CLI invalid JSON exits 2", async () => {
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["context", "--url", "https://convex.example.org", "--token-env", "DASH_CRED"],
      env: { DASH_CRED: credential },
      stdinText: "{not-json",
      stdout: (text) => lines.push(text),
      backendFromUrl: () => organizerDashboardMockBackendCreate().backend,
    })
    expect(exitCode).toBe(2)
  })

  test("CLI backend rejection exits 1 with platform.internal", async () => {
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["context", "--url", "https://convex.example.org", "--token-env", "DASH_CRED"],
      env: { DASH_CRED: credential },
      stdinText: "{}",
      stdout: (text) => lines.push(text),
      backendFromUrl: () =>
        organizerDashboardMockBackendCreate({
          contextQuery: async () => createResultError("organizerDashboardContextQuery", "boom") as Result<unknown>,
        }).backend,
    })
    expect(exitCode).toBe(1)
    const output = lines.join("")
    expect(errorOf(JSON.parse(output) as Record<string, unknown>).code).toBe("platform.internal")
    expect(output).not.toContain(credential)
  })
})

describe("organizer dashboard TS client", () => {
  test("contextGet returns backend data", async () => {
    const fakeClient = {
      query: async () => createResult({ organizations: [], activeOrganization: null }),
      mutation: async () => createResult({}),
    } as unknown as ConvexHttpClient
    const client = organizerDashboardClientCreate({ client: fakeClient, token: credential })
    const result = await client.contextGet({})
    expect(result).toEqual({
      success: true,
      data: { organizations: [], activeOrganization: null },
    })
  })

  test("organizationCreate passes token plus flat args", async () => {
    const seen: unknown[] = []
    const fakeClient = {
      query: async () => createResult({}),
      mutation: async (_ref: unknown, args: unknown) => {
        seen.push(args)
        return createResult({ orgId: "org_test" })
      },
    } as unknown as ConvexHttpClient
    const client = organizerDashboardClientCreate({ client: fakeClient, token: () => credential })
    const result = await client.organizationCreate({
      name: "Kulturhaus Lindenhof",
      slug: "kulturhaus-lindenhof",
      kind: "verein",
      termsRevision: organizerContractDocuments.terms.revision,
      dpaRevision: organizerContractDocuments.dpa.revision,
      termsAccepted: true,
      ...organizerContractPartyConsentFixture,
      dpaAccepted: true,
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.orgId as string).toBe("org_test")
    expect(seen).toEqual([
      {
        name: "Kulturhaus Lindenhof",
        slug: "kulturhaus-lindenhof",
        kind: "verein",
        termsRevision: organizerContractDocuments.terms.revision,
        dpaRevision: organizerContractDocuments.dpa.revision,
        termsAccepted: true,
        ...organizerContractPartyConsentFixture,
        dpaAccepted: true,
        token: credential,
      },
    ])
  })

  test("backend rejection surfaces 503 without throwing", async () => {
    const fakeClient = {
      query: async () => createResultError("organizerDashboardContextQuery", "boom"),
      mutation: async () => createResultError("op", "boom"),
    } as unknown as ConvexHttpClient
    const client = organizerDashboardClientCreate({ client: fakeClient, token: credential })
    const result = await client.contextGet({})
    expect(result).toEqual({ success: false, error: { status: 503, message: "boom" } })
  })

  test("SDK throw surfaces sanitized 503 without raw error text", async () => {
    const fakeClient = {
      query: async () => {
        throw new Error("network down for " + credential)
      },
      mutation: async () => createResult({}),
    } as unknown as ConvexHttpClient
    const client = organizerDashboardClientCreate({ client: fakeClient, token: credential })
    const result = await client.contextGet({})
    expect(result).toEqual({ success: false, error: { status: 503, message: "Backend transport failed" } })
  })

  test("missing credential surfaces 401 without transport call", async () => {
    let called = false
    const fakeClient = {
      query: async () => {
        called = true
        return createResult({})
      },
      mutation: async () => createResult({}),
    } as unknown as ConvexHttpClient
    const client = organizerDashboardClientCreate({ client: fakeClient, token: () => undefined })
    const result = await client.contextGet({})
    expect(result).toEqual({
      success: false,
      error: { status: 401, message: "Missing auth credential" },
    })
    expect(called).toBe(false)
  })

  test("blank credential surfaces 401 without transport call", async () => {
    let called = false
    const fakeClient = {
      query: async () => {
        called = true
        return createResult({})
      },
      mutation: async () => createResult({}),
    } as unknown as ConvexHttpClient
    const client = organizerDashboardClientCreate({ client: fakeClient, token: "   " })
    const result = await client.eventGet({ orgId: "org_test", eventKey: "event-test" })
    expect(result).toEqual({
      success: false,
      error: { status: 401, message: "Missing auth credential" },
    })
    expect(called).toBe(false)
  })

  test("invalid input is a local 400 without transport call", async () => {
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
    const result = await client.organizationCreate({
      name: "Kulturhaus Lindenhof",
      kind: "verein",
      termsRevision: organizerContractDocuments.terms.revision,
      dpaRevision: organizerContractDocuments.dpa.revision,
      termsAccepted: true,
      ...organizerContractPartyConsentFixture,
      dpaAccepted: true,
    } as never)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.status).toBe(400)
    expect(called).toBe(false)
  })

  test("eventGet validates and forwards token plus args", async () => {
    const seen: unknown[] = []
    const fakeClient = {
      query: async (_ref: unknown, args: unknown) => {
        seen.push(args)
        return createResult({ eventKey: "event-test" })
      },
      mutation: async () => createResult({}),
    } as unknown as ConvexHttpClient
    const client = organizerDashboardClientCreate({ client: fakeClient, token: credential })
    const result = await client.eventGet({ orgId: "org_test", eventKey: "event-test" })
    expect(result.success).toBe(true)
    expect(seen).toEqual([{ token: credential, orgId: "org_test", eventKey: "event-test" }])
  })
})

describe("organizer dashboard bearer and body hardening", () => {
  test("lowercase bearer scheme is accepted", async () => {
    const { backend, calls } = organizerDashboardMockBackendCreate()
    const response = await organizerDashboardHonoCreate(backend).request("/api/veranstalter", {
      method: "POST",
      headers: { authorization: "bearer " + credential, "content-type": "application/json" },
      body: JSON.stringify({ operation: "context" }),
    })
    expect(response.status).toBe(200)
    expect(calls).toEqual([{ operation: "context", args: { token: credential } }])
  })

  test("padded bearer scheme is accepted", async () => {
    const { backend } = organizerDashboardMockBackendCreate()
    const response = await organizerDashboardHonoCreate(backend).request("/api/veranstalter", {
      method: "POST",
      headers: { authorization: "   Bearer   " + credential + "  ", "content-type": "application/json" },
      body: JSON.stringify({ operation: "context" }),
    })
    expect(response.status).toBe(200)
  })

  test("trailing third field is rejected", async () => {
    const { backend } = organizerDashboardMockBackendCreate()
    const response = await organizerDashboardHonoCreate(backend).request("/api/veranstalter", {
      method: "POST",
      headers: { authorization: "Bearer " + credential + " extra", "content-type": "application/json" },
      body: JSON.stringify({ operation: "context" }),
    })
    expect(response.status).toBe(401)
    const json = (await response.json()) as Record<string, unknown>
    expect(errorOf(json).code).toBe("organizer-dashboard.unauthenticated")
  })

  test("comma-joined multiple credentials are rejected", async () => {
    const { backend } = organizerDashboardMockBackendCreate()
    const response = await organizerDashboardHonoCreate(backend).request("/api/veranstalter", {
      method: "POST",
      headers: {
        authorization: "Bearer " + credential + ", Bearer " + otherCredential,
        "content-type": "application/json",
      },
      body: JSON.stringify({ operation: "context" }),
    })
    expect(response.status).toBe(401)
  })

  test("unicode-heavy body over the byte bound is rejected even when short in chars", async () => {
    const { backend, calls } = organizerDashboardMockBackendCreate()
    const body = JSON.stringify({ operation: "context", orgId: "ü".repeat(organizerDashboardRequestMaxBytes / 2) })
    expect(body.length).toBeLessThan(organizerDashboardRequestMaxBytes)
    expect(new TextEncoder().encode(body).byteLength).toBeGreaterThan(organizerDashboardRequestMaxBytes)
    const response = await organizerDashboardHonoCreate(backend).request("/api/veranstalter", {
      method: "POST",
      headers: authorizedHeaders(body),
      body,
    })
    expect(response.status).toBe(400)
    const json = (await response.json()) as Record<string, unknown>
    expect(errorOf(json).code).toBe("organizer-dashboard.invalid-body")
    expect(calls).toEqual([])
  })

  test("chunked over-bound body without content-length is rejected before the backend runs", async () => {
    const { backend, calls } = organizerDashboardMockBackendCreate()
    const chunk = new TextEncoder().encode("x".repeat(4096))
    let sent = 0
    let cancelled = false
    const totalChunks = organizerDashboardRequestMaxBytes / chunk.byteLength + 10
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += 1
        controller.enqueue(chunk)
        if (sent >= totalChunks) controller.close()
      },
      cancel() {
        cancelled = true
      },
    })
    const request = new Request("http://localhost/api/veranstalter", {
      method: "POST",
      headers: { authorization: "Bearer " + credential, "content-type": "application/json" },
      body: stream,
      duplex: "half",
    } as RequestInit)
    expect(request.headers.get("content-length")).toBeNull()
    const response = await organizerDashboardHonoCreate(backend).request(request)
    expect(response.status).toBe(400)
    const json = (await response.json()) as Record<string, unknown>
    expect(errorOf(json).code).toBe("organizer-dashboard.invalid-body")
    expect(errorOf(json).message).toBe("Request body too large")
    expect(cancelled).toBe(true)
    expect(sent).toBeLessThan(totalChunks)
    expect(calls).toEqual([])
  })

  test("invalid UTF-8 body is rejected", async () => {
    const { backend, calls } = organizerDashboardMockBackendCreate()
    const request = new Request("http://localhost/api/veranstalter", {
      method: "POST",
      headers: { authorization: "Bearer " + credential, "content-type": "application/json" },
      body: new Uint8Array([0xff, 0xfe, 0xfd]),
    })
    const response = await organizerDashboardHonoCreate(backend).request(request)
    expect(response.status).toBe(400)
    const json = (await response.json()) as Record<string, unknown>
    expect(errorOf(json).code).toBe("organizer-dashboard.invalid-body")
    expect(calls).toEqual([])
  })

  test("transport throw with credential in the message is sanitized", async () => {
    const { backend } = organizerDashboardMockBackendCreate({
      contextQuery: async () => {
        throw new Error("connection refused for " + credential)
      },
    })
    const { status, json, text } = await postOperation(organizerDashboardHonoCreate(backend), {
      operation: "context",
    })
    expect(status).toBe(503)
    expect(errorOf(json)).toMatchObject({
      code: "organizer-dashboard.transport-unavailable",
      message: "Backend transport failed",
      retryable: true,
    })
    expect(text).not.toContain(credential)
  })

  test("prototype-chain code falls back to platform.internal", async () => {
    const { backend } = organizerDashboardMockBackendCreate({
      contextQuery: async () => createResultErrorCode("organizerDashboardContextQuery", "boom", "toString"),
    })
    const { status, json } = await postOperation(organizerDashboardHonoCreate(backend), { operation: "context" })
    expect(status).toBe(500)
    expect(errorOf(json).code).toBe("platform.internal")
  })

  test("claimed duplicateSlug code stays platform.internal pending typed backend codes", async () => {
    const { backend } = organizerDashboardMockBackendCreate({
      organizationCreate: async () =>
        createResultErrorCode("organizerDashboardOrganizationCreateMutation", "Slug is already taken", "duplicateSlug"),
    })
    const { status, json } = await postOperation(organizerDashboardHonoCreate(backend), validCreateBody)
    expect(status).toBe(500)
    expect(errorOf(json)).toMatchObject({ code: "platform.internal", status: 500 })
  })
})

describe("organizer dashboard CLI hardening", () => {
  test("--org-id forwards orgId for context", async () => {
    const mocks = organizerDashboardMockBackendCreate()
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["context", "--url", "https://convex.example.org", "--token-env", "DASH_CRED", "--org-id", "org_test"],
      env: { DASH_CRED: credential },
      stdinText: "{}",
      stdout: (text) => lines.push(text),
      backendFromUrl: () => mocks.backend,
    })
    expect(exitCode).toBe(0)
    expect(mocks.calls).toEqual([{ operation: "context", args: { token: credential, orgId: "org_test" } }])
  })

  test("--org-id is rejected for non-context operations", async () => {
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["create", "--url", "https://convex.example.org", "--token-env", "DASH_CRED", "--org-id", "org_test"],
      env: { DASH_CRED: credential },
      stdinText: JSON.stringify({
        name: "Kulturhaus Lindenhof",
        slug: "kulturhaus-lindenhof",
        kind: "verein",
        termsRevision: organizerContractDocuments.terms.revision,
        dpaRevision: organizerContractDocuments.dpa.revision,
        termsAccepted: true,
        ...organizerContractPartyConsentFixture,
        dpaAccepted: true,
      }),
      stdout: (text) => lines.push(text),
      backendFromUrl: () => organizerDashboardMockBackendCreate().backend,
    })
    expect(exitCode).toBe(2)
    expect(errorOf(JSON.parse(lines.join("")) as Record<string, unknown>).code).toBe("organizer-dashboard.invalid-body")
  })

  test("file URL is rejected", async () => {
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["context", "--url", "file:///etc/passwd", "--token-env", "DASH_CRED"],
      env: { DASH_CRED: credential },
      stdinText: "{}",
      stdout: (text) => lines.push(text),
      backendFromUrl: () => organizerDashboardMockBackendCreate().backend,
    })
    expect(exitCode).toBe(2)
    expect(errorOf(JSON.parse(lines.join("")) as Record<string, unknown>).code).toBe("organizer-dashboard.invalid-body")
  })

  test("URL with embedded credentials is rejected", async () => {
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["context", "--url", "https://user:pass@convex.example.org", "--token-env", "DASH_CRED"],
      env: { DASH_CRED: credential },
      stdinText: "{}",
      stdout: (text) => lines.push(text),
      backendFromUrl: () => organizerDashboardMockBackendCreate().backend,
    })
    expect(exitCode).toBe(2)
  })

  test("oversize stdin in bytes is rejected", async () => {
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["context", "--url", "https://convex.example.org", "--token-env", "DASH_CRED"],
      env: { DASH_CRED: credential },
      stdinText: "ü".repeat(organizerDashboardRequestMaxBytes / 2 + 1),
      stdout: (text) => lines.push(text),
      backendFromUrl: () => organizerDashboardMockBackendCreate().backend,
    })
    expect(exitCode).toBe(2)
    expect(errorOf(JSON.parse(lines.join("")) as Record<string, unknown>).code).toBe("organizer-dashboard.invalid-body")
  })

  test("CLI transport throw with credential in the message is sanitized", async () => {
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["context", "--url", "https://convex.example.org", "--token-env", "DASH_CRED"],
      env: { DASH_CRED: credential },
      stdinText: "{}",
      stdout: (text) => lines.push(text),
      backendFromUrl: () =>
        organizerDashboardMockBackendCreate({
          contextQuery: async () => {
            throw new Error("dial failed using " + credential)
          },
        }).backend,
    })
    expect(exitCode).toBe(1)
    const output = lines.join("")
    expect(output).not.toContain(credential)
    expect(errorOf(JSON.parse(output) as Record<string, unknown>).code).toBe(
      "organizer-dashboard.transport-unavailable",
    )
  })

  test("CLI prototype-chain code falls back to platform.internal with exit 1", async () => {
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["context", "--url", "https://convex.example.org", "--token-env", "DASH_CRED"],
      env: { DASH_CRED: credential },
      stdinText: "{}",
      stdout: (text) => lines.push(text),
      backendFromUrl: () =>
        organizerDashboardMockBackendCreate({
          contextQuery: async () => createResultErrorCode("organizerDashboardContextQuery", "boom", "toString"),
        }).backend,
    })
    expect(exitCode).toBe(1)
    expect(errorOf(JSON.parse(lines.join("")) as Record<string, unknown>).code).toBe("platform.internal")
  })

  test("CLI event-get forwards identical args to HTTP", async () => {
    const body = { operation: "event-get", orgId: "org_test", eventKey: "event-test" }
    const httpMocks = organizerDashboardMockBackendCreate()
    await postOperation(organizerDashboardHonoCreate(httpMocks.backend), body)
    const cliMocks = organizerDashboardMockBackendCreate()
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["event-get", "--url", "https://convex.example.org", "--token-env", "DASH_CRED"],
      env: { DASH_CRED: credential },
      stdinText: JSON.stringify({ orgId: "org_test", eventKey: "event-test" }),
      stdout: (text) => lines.push(text),
      backendFromUrl: () => cliMocks.backend,
    })
    expect(exitCode).toBe(0)
    expect(cliMocks.calls).toEqual(httpMocks.calls)
  })

  test("CLI help lists every operation", async () => {
    const lines: string[] = []
    const exitCode = await organizerDashboardCliRun({
      argv: ["--help"],
      env: {},
      stdinText: "",
      stdout: (text) => lines.push(text),
      backendFromUrl: () => organizerDashboardMockBackendCreate().backend,
    })
    expect(exitCode).toBe(0)
    const help = lines.join("")
    for (const operation of organizerDashboardOperations) {
      expect(help).toContain(operation)
    }
    expect(help).toContain("Operations (" + String(organizerDashboardOperations.length) + ")")
  })
})

describe("organizer dashboard extended operation parity", () => {
  const validBodies: Record<string, unknown> = {
    "order-list": { operation: "order-list", orgId: "org_test" },
    "order-get": { operation: "order-get", orgId: "org_test", orderId: "order_test" },
    "order-note-create": { operation: "order-note-create", orgId: "org_test", orderId: "order_test", text: "Notiz" },
    "order-note-delete": {
      operation: "order-note-delete",
      orgId: "org_test",
      orderId: "order_test",
      noteId: "note_test",
    },
    "order-buyer-contact-update": {
      operation: "order-buyer-contact-update",
      orgId: "org_test",
      orderId: "order_test",
      email: "",
    },
    "order-participant-update": {
      operation: "order-participant-update",
      orgId: "org_test",
      orderId: "order_test",
      ticketId: "ticket_test",
      participantName: "",
    },
    "order-participant-list": { operation: "order-participant-list", orgId: "org_test", eventKey: "event-test" },
    "finance-overview": { operation: "finance-overview", orgId: "org_test" },
    "settlement-get": { operation: "settlement-get", orgId: "org_test", eventKey: "event-test" },
    "payout-list": { operation: "payout-list", orgId: "org_test" },
    "payout-record": { operation: "payout-record", orgId: "org_test", eventKey: "event-test", amountCents: 1000 },
    "organization-get": { operation: "organization-get", orgId: "org_test" },
    "contracts-accept": {
      operation: "contracts-accept",
      orgId: "org_test",
      termsAccepted: true,
      ...organizerContractPartyConsentFixture,
      dpaAccepted: true,
      termsRevision: organizerContractDocuments.terms.revision,
      dpaRevision: organizerContractDocuments.dpa.revision,
    },
    "event-list": { operation: "event-list", orgId: "org_test" },
    "event-get": { operation: "event-get", orgId: "org_test", eventKey: "event-test" },
    "event-create": {
      operation: "event-create",
      orgId: "org_test",
      title: "Sommerfest",
      subtitle: "",
      description: "",
      category: "Konzert",
      startsAt: "2026-08-01T18:00:00.000Z",
      endsAt: "2026-08-01T22:00:00.000Z",
      doorsAt: "2026-08-01T17:00:00.000Z",
      venue: "Stadthalle",
      city: "Berlin",
      address: "",
      organizer: "",
      imageUrl: "",
      imageAlt: "",
    },
    "event-update": { operation: "event-update", orgId: "org_test", eventKey: "event-test", title: "Neuer Titel" },
    "event-publish": { operation: "event-publish", orgId: "org_test", eventKey: "event-test" },
    "event-archive": { operation: "event-archive", orgId: "org_test", eventKey: "event-test" },
    "tier-upsert": {
      operation: "tier-upsert",
      orgId: "org_test",
      eventKey: "event-test",
      name: "Standard",
      description: "",
      priceCents: 1000,
      capacity: 100,
    },
    "tier-archive": { operation: "tier-archive", orgId: "org_test", eventKey: "event-test", tierKey: "tier-test" },
    "admin-list": { operation: "admin-list" },
    "admin-detail": { operation: "admin-detail", orgId: "org_test" },
    "admin-configure": {
      operation: "admin-configure",
      orgId: "org_test",
      tax: { status: "regel", defaultRateBps: 1900 },
      fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
    },
    "admin-approve": { operation: "admin-approve", orgId: "org_test" },
    "admin-block": { operation: "admin-block", orgId: "org_test", reason: "Missbrauch" },
    "admin-unblock": { operation: "admin-unblock", orgId: "org_test", status: "pruefung" },
    "migration-plan": { operation: "migration-plan" },
    "migration-apply": {
      operation: "migration-apply",
      orgInits: [{ orgId: "org_test", kind: "verein" }],
      eventAssignments: [],
      roleAssignments: [],
    },
    "migration-backfill": { operation: "migration-backfill", eventKey: "event-test" },
  }

  const expectedCalls: Record<string, unknown> = {
    "order-list": {
      operation: "order-list",
      args: { token: credential, orgId: "org_test", paginationOpts: { numItems: 25, cursor: null } },
    },
    "order-get": { operation: "order-get", args: { token: credential, orgId: "org_test", orderId: "order_test" } },
    "order-note-create": {
      operation: "order-note-create",
      args: { token: credential, orgId: "org_test", orderId: "order_test", text: "Notiz" },
    },
    "order-note-delete": {
      operation: "order-note-delete",
      args: { token: credential, orgId: "org_test", orderId: "order_test", noteId: "note_test" },
    },
    "order-buyer-contact-update": {
      operation: "order-buyer-contact-update",
      args: { token: credential, orgId: "org_test", orderId: "order_test", email: "" },
    },
    "order-participant-update": {
      operation: "order-participant-update",
      args: {
        token: credential,
        orgId: "org_test",
        orderId: "order_test",
        ticketId: "ticket_test",
        participantName: "",
      },
    },
    "order-participant-list": {
      operation: "order-participant-list",
      args: {
        token: credential,
        orgId: "org_test",
        eventKey: "event-test",
        paginationOpts: { numItems: 25, cursor: null },
      },
    },
    "finance-overview": {
      operation: "finance-overview",
      args: { token: credential, orgId: "org_test" },
    },
    "settlement-get": {
      operation: "settlement-get",
      args: { token: credential, orgId: "org_test", eventKey: "event-test" },
    },
    "payout-list": {
      operation: "payout-list",
      args: { token: credential, orgId: "org_test", paginationOpts: { numItems: 25, cursor: null } },
    },
    "payout-record": {
      operation: "payout-record",
      args: { token: credential, orgId: "org_test", eventKey: "event-test", amountCents: 1000 },
    },
    "organization-get": { operation: "organization-get", args: { token: credential, orgId: "org_test" } },
    "contracts-accept": {
      operation: "contracts-accept",
      args: {
        token: credential,
        orgId: "org_test",
        termsAccepted: true,
        ...organizerContractPartyConsentFixture,
        dpaAccepted: true,
        termsRevision: organizerContractDocuments.terms.revision,
        dpaRevision: organizerContractDocuments.dpa.revision,
      },
    },
    "event-list": {
      operation: "event-list",
      args: { token: credential, orgId: "org_test", paginationOpts: { numItems: 25, cursor: null } },
    },
    "event-get": {
      operation: "event-get",
      args: { token: credential, orgId: "org_test", eventKey: "event-test" },
    },
    "event-create": {
      operation: "event-create",
      args: {
        token: credential,
        orgId: "org_test",
        title: "Sommerfest",
        subtitle: "",
        description: "",
        category: "Konzert",
        startsAt: "2026-08-01T18:00:00.000Z",
        endsAt: "2026-08-01T22:00:00.000Z",
        doorsAt: "2026-08-01T17:00:00.000Z",
        venue: "Stadthalle",
        city: "Berlin",
        address: "",
        organizer: "",
        imageUrl: "",
        imageAlt: "",
      },
    },
    "event-update": {
      operation: "event-update",
      args: { token: credential, orgId: "org_test", eventKey: "event-test", title: "Neuer Titel" },
    },
    "event-publish": {
      operation: "event-publish",
      args: { token: credential, orgId: "org_test", eventKey: "event-test" },
    },
    "event-archive": {
      operation: "event-archive",
      args: { token: credential, orgId: "org_test", eventKey: "event-test" },
    },
    "tier-upsert": {
      operation: "tier-upsert",
      args: {
        token: credential,
        orgId: "org_test",
        eventKey: "event-test",
        name: "Standard",
        description: "",
        priceCents: 1000,
        capacity: 100,
      },
    },
    "tier-archive": {
      operation: "tier-archive",
      args: { token: credential, orgId: "org_test", eventKey: "event-test", tierKey: "tier-test" },
    },
    "admin-list": {
      operation: "admin-list",
      args: { token: credential, paginationOpts: { numItems: 25, cursor: null } },
    },
    "admin-detail": { operation: "admin-detail", args: { token: credential, orgId: "org_test" } },
    "admin-configure": {
      operation: "admin-configure",
      args: {
        token: credential,
        orgId: "org_test",
        tax: { status: "regel", defaultRateBps: 1900 },
        fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
      },
    },
    "admin-approve": { operation: "admin-approve", args: { token: credential, orgId: "org_test" } },
    "admin-block": {
      operation: "admin-block",
      args: { token: credential, orgId: "org_test", reason: "Missbrauch" },
    },
    "admin-unblock": {
      operation: "admin-unblock",
      args: { token: credential, orgId: "org_test", status: "pruefung" },
    },
    "migration-plan": {
      operation: "migration-plan",
      args: { token: credential, paginationOpts: { numItems: 25, cursor: null } },
    },
    "migration-apply": {
      operation: "migration-apply",
      args: {
        token: credential,
        orgInits: [{ orgId: "org_test", kind: "verein" }],
        eventAssignments: [],
        roleAssignments: [],
        scannerLinkApprovals: [],
      },
    },
    "migration-backfill": {
      operation: "migration-backfill",
      args: { token: credential, eventKey: "event-test" },
    },
  }

  for (const [operation, body] of Object.entries(validBodies)) {
    test(operation + " forwards auth plus validated args with 200", async () => {
      const { backend, calls } = organizerDashboardMockBackendCreate()
      const { status, json, text } = await postOperation(organizerDashboardHonoCreate(backend), body)
      expect(status).toBe(200)
      expect("data" in json).toBe(true)
      expect(text).not.toContain(credential)
      expect(calls).toEqual([expectedCalls[operation]])
    })
  }

  test("event-list rejects an unknown shared-model status with 400", async () => {
    const { backend, calls } = organizerDashboardMockBackendCreate()
    const { status } = await postOperation(organizerDashboardHonoCreate(backend), {
      operation: "event-list",
      orgId: "org_test",
      status: "bogus",
    })
    expect(status).toBe(400)
    expect(calls).toEqual([])
  })

  test("event-create rejects a missing shared-model title with 400", async () => {
    const { backend, calls } = organizerDashboardMockBackendCreate()
    const { status } = await postOperation(organizerDashboardHonoCreate(backend), {
      operation: "event-create",
      orgId: "org_test",
    })
    expect(status).toBe(400)
    expect(calls).toEqual([])
  })

  test("admin-configure rejects a bad shared-model tax status with 400", async () => {
    const { backend } = organizerDashboardMockBackendCreate()
    const { status } = await postOperation(organizerDashboardHonoCreate(backend), {
      operation: "admin-configure",
      orgId: "org_test",
      tax: { status: "bogus", defaultRateBps: 1900 },
      fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
    })
    expect(status).toBe(400)
  })
})
