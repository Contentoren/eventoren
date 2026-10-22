import { expect, test } from "bun:test"
import { mcpHttpHandler } from "#src/mcp/mcpHttpHandler.ts"

const apiKey = "a".repeat(64)

function jsonRpc(method: string, params?: unknown) {
  return { jsonrpc: "2.0", id: 1, method, ...(params === undefined ? {} : { params }) }
}

async function setup() {
  const calls: { method: string; args: unknown }[] = []
  const ctx = {
    runQuery: async (reference: unknown, args: Record<string, unknown>) => {
      if ("credential" in args) {
        if (args.credential === apiKey) return { success: true, data: { kind: "apiKey", userId: "u1" } }
        return { success: false, op: "authActionCredentialResolve", errorMessage: "invalid credential" }
      }
      calls.push({ method: "query", args })
      if ("token" in args) {
        if (args.token !== apiKey) return { success: false, op: "auth", errorMessage: "invalid token" }
        return { success: true, data: { page: [], isDone: true, continueCursor: "" } }
      }
      return { success: true, data: { projectName: "eventoren" } }
    },
    runMutation: async (_reference: unknown, args: Record<string, unknown>) => {
      calls.push({ method: "mutation", args })
      return { success: true, data: { id: "created" } }
    },
    runAction: async (_reference: unknown, args: Record<string, unknown>) => {
      calls.push({ method: "action", args })
      return { success: true, data: { delivered: true } }
    },
  }
  const post = (body: unknown) =>
    mcpHttpHandler(
      ctx as never,
      new Request("https://example.test/mcp", {
        method: "POST",
        headers: {
          accept: "application/json, text/event-stream",
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      }),
    )
  return { post, calls }
}

test("MCP lists the convex-call tool", async () => {
  const { post } = await setup()
  const response = await post(jsonRpc("tools/list"))
  expect(response.status).toBe(200)
  const names = ((await response.json()).result.tools as { name: string }[]).map((tool) => tool.name)
  expect(names).toContain("convex-call")
})

test("MCP convex-call reaches queries, mutations and actions", async () => {
  const { post, calls } = await setup()
  for (const [module, name, args, method] of [
    ["publicProjectInfo", "publicProjectInfo", {}, "query"],
    ["auth", "apiKeyListQuery", { paginationOpts: { numItems: 1, cursor: null } }, "query"],
    ["catalog", "catalogCategoryCreateMutation", { name: "Musik" }, "mutation"],
    ["ticketing", "ticketPaymentReconcileAction", { dueOnly: true }, "action"],
  ] as const) {
    const response = await post(
      jsonRpc("tools/call", { name: "convex-call", arguments: { module, function: name, args } }),
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.result.isError).not.toBe(true)
  }
  expect(calls.map((call) => call.method)).toEqual(["query", "query", "mutation", "action"])
  const authed = calls[1]?.args as Record<string, unknown>
  expect(authed["token"]).toBe(apiKey)
  const tokenless = calls[0]?.args as Record<string, unknown>
  expect("token" in tokenless).toBe(false)
})

test("MCP convex-call refuses unknown and internal functions", async () => {
  const { post, calls } = await setup()
  const before = calls.length
  for (const [module, name] of [
    ["nope", "missing"],
    ["auth", "apiKeyExpireInternalMutation"],
  ] as const) {
    const response = await post(jsonRpc("tools/call", { name: "convex-call", arguments: { module, function: name } }))
    expect(response.status).toBe(200)
    expect((await response.json()).result.isError).toBe(true)
  }
  expect(calls).toHaveLength(before)
})
