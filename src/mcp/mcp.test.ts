import { expect, test } from "bun:test"
import { mcpHttpHandler } from "#src/mcp/mcpHttpHandler.ts"

const apiKey = "a".repeat(64)
const userId = "mcp-test-user"

function jsonRpc(method: string, params?: unknown) {
  return { jsonrpc: "2.0", id: 1, method, ...(params === undefined ? {} : { params }) }
}

async function setup() {
  const calls: string[] = []
  const ctx = {
    runQuery: async (_reference: unknown, args: Record<string, unknown>) => {
      if ("credential" in args) {
        if (args.credential === apiKey) {
          return { success: true, data: { kind: "apiKey", userId } }
        }
        return { success: false, op: "authActionCredentialResolve", errorMessage: "invalid credential" }
      }
      calls.push("query")
      return { success: true, data: { page: [], isDone: true, continueCursor: "" } }
    },
    runMutation: async () => {
      calls.push("mutation")
      return { success: true, data: { id: "created", credential: "b".repeat(64) } }
    },
  }
  const post = (token: string | undefined, body: unknown) =>
    mcpHttpHandler(
      ctx as never,
      new Request("https://example.test/mcp", {
        method: "POST",
        headers: {
          accept: "application/json, text/event-stream",
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      }),
    )

  return { post, calls }
}

test("MCP rejects missing and invalid Bearer [REDACTED]", async () => {
  const { post } = await setup()
  for (const token of [undefined, "not-a-valid-token"]) {
    const response = await post(
      token,
      jsonRpc("initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test", version: "1" },
      }),
    )
    expect(response.status).toBe(401)
  }
})

test("MCP accepts an API-key Bearer token", async () => {
  const { post } = await setup()
  const response = await post(
    apiKey,
    jsonRpc("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "test", version: "1" },
    }),
  )
  expect(response.status).toBe(200)
  expect(response.headers.get("mcp-session-id")).toBeNull()
  expect(response.headers.get("content-type")).toContain("application/json")
  expect(await response.json()).toMatchObject({ result: { serverInfo: { name: "eventoren" } } })
})

test("MCP lists the API-key tools", async () => {
  const { post } = await setup()
  const response = await post(apiKey, jsonRpc("tools/list"))
  expect(response.status).toBe(200)
  const names = ((await response.json()).result.tools as { name: string }[]).map((tool) => tool.name)
  for (const name of ["ping", "apikey-list", "apikey-create", "organizer-event-list"]) {
    expect(names).toContain(name)
  }
})

test("MCP read and write tools succeed with a valid credential", async () => {
  const { post, calls } = await setup()
  const readResponse = await post(apiKey, jsonRpc("tools/call", { name: "apikey-list", arguments: {} }))
  expect(readResponse.status).toBe(200)
  expect((await readResponse.json()).result.isError).not.toBe(true)

  const writeResponse = await post(
    apiKey,
    jsonRpc("tools/call", {
      name: "apikey-create",
      arguments: { name: "MCP test key" },
    }),
  )
  expect(writeResponse.status).toBe(200)
  expect((await writeResponse.json()).result.isError).not.toBe(true)
  expect(calls).toEqual(["query", "mutation"])
})
