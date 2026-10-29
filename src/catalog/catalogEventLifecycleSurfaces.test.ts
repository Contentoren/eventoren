import { expect, test } from "bun:test"
import type { ConvexHttpClient } from "convex/browser"
import { getFunctionName } from "convex/server"
import { catalogEventArchiveHonoCreate } from "#src/catalog/api/catalogEventArchiveHonoCreate.ts"
import { catalogEventDuplicateHonoCreate } from "#src/catalog/api/catalogEventDuplicateHonoCreate.ts"
import { catalogEventArchive } from "#src/catalog/client/catalogEventArchive.ts"
import { catalogEventDuplicate } from "#src/catalog/client/catalogEventDuplicate.ts"
import { apiClientConvexCall } from "#src/client/apiClientConvexCall.ts"

for (const [name, wrapper, createApp] of [
  ["Archive", catalogEventArchive, catalogEventArchiveHonoCreate],
  ["Duplicate", catalogEventDuplicate, catalogEventDuplicateHonoCreate],
] as const) {
  test(`${name} typed client preserves failures and forwards successful result`, async () => {
    let called: unknown
    let response: unknown = { success: false, op: "catalogAdminAuthorizeFn", errorMessage: "Admin role required" }
    const client = {
      mutation: async (ref: Parameters<typeof getFunctionName>[0], args: unknown) => {
        called = { name: getFunctionName(ref), args }
        return response
      },
    } as unknown as ConvexHttpClient
    const input = { token: "credential", eventKey: "source" }
    expect((await wrapper(input, client)).success).toBe(false)
    const success = { success: true, data: { eventKey: "fresh", catalogVersion: 2, eventRevision: 1 } } as const
    response = success
    expect(await wrapper(input, client)).toEqual(success)
    expect(called).toEqual({ name: `catalog:event${name}`, args: input })
    expect((await wrapper({ ...input, eventKey: "" }, client)).success).toBe(false)
  })

  test(`${name} HTTP validates input and returns authorization and operation errors`, async () => {
    let response: unknown = { success: true, data: { eventKey: "fresh", catalogVersion: 2, eventRevision: 1 } }
    let args: unknown
    const client = {
      mutation: async (_ref: unknown, input: unknown) => {
        args = input
        return response
      },
    } as unknown as ConvexHttpClient
    const app = createApp(client)
    const path = `/api/admin-event-${name.toLowerCase()}`
    const send = (body: string, authorization = "Bearer credential") =>
      app.request(path, { method: "POST", headers: { authorization, "content-type": "application/json" }, body })
    expect((await send("{}", "")).status).toBe(401)
    expect((await send("{")).status).toBe(400)
    expect((await send("{}")).status).toBe(400)
    response = { success: false, op: "authTokenSessionResolve", errorMessage: "Anmeldung erforderlich" }
    expect((await send('{"eventKey":"source"}')).status).toBe(401)
    response = { success: false, op: "catalogAdminAuthorizeFn", errorMessage: "Admin role required" }
    expect((await send('{"eventKey":"source"}')).status).toBe(403)
    response = { success: false, op: `catalogEvent${name}Mutation`, errorMessage: "Event not found" }
    expect((await send('{"eventKey":"source"}')).status).toBe(404)
    response = { success: true, data: { eventKey: "fresh", catalogVersion: 2, eventRevision: 1 } }
    const ok = await send('{"eventKey":"source"}')
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual(response)
    expect(args).toEqual({ token: "credential", eventKey: "source" })
  })
}

test("generic catalog dispatch preserves archive and indexed list arguments", async () => {
  let called: unknown
  const client = {
    query: async (ref: Parameters<typeof getFunctionName>[0], args: unknown) => {
      called = { name: getFunctionName(ref), args }
      return { success: true, data: { page: [], isDone: true, continueCursor: "end" } }
    },
  } as unknown as ConvexHttpClient
  const args = { archiveOnly: true, eventKey: "source", paginationOpts: { numItems: 10, cursor: null } }
  expect(
    (
      await apiClientConvexCall(
        { module: "catalog", name: "catalogEventListAdminPageQuery", token: "credential", args },
        client,
      )
    ).success,
  ).toBe(true)
  expect(called).toEqual({ name: "catalog:catalogEventListAdminPageQuery", args: { ...args, token: "credential" } })
})

test("CLI and MCP generic calls dispatch lifecycle mutations with injected credentials", async () => {
  const { convexCallCliRun } = await import("#src/cli/convexCallCliRun.ts")
  const { mcpConvexCallToolDefinitions } = await import("#src/mcp/mcpConvexCallToolRegister.ts")
  let called: unknown
  const failure = { success: false, op: "catalogAdminAuthorizeFn", errorMessage: "Admin role required" }
  const mutation = async (ref: Parameters<typeof getFunctionName>[0], args: unknown) => {
    called = { name: getFunctionName(ref), args }
    return failure
  }
  let output = ""
  const code = await convexCallCliRun({
    argv: ["catalog:eventArchive", "--url", "https://example.convex.cloud", "--json", '{"eventKey":"source"}'],
    env: { EVENTOREN_API_KEY: "credential" },
    clientFromUrl: () => ({ mutation }) as never,
    stdout: (text) => {
      output = text
    },
  })
  expect(code).toBe(0) // CLI exit reports transport success; the printed operation Result must be inspected.
  expect(JSON.parse(output)).toEqual(failure)
  expect(called).toEqual({ name: "catalog:eventArchive", args: { eventKey: "source", token: "credential" } })
  const tools = mcpConvexCallToolDefinitions({ runMutation: mutation } as never, "credential")
  const result = await tools[0]!.run({ module: "catalog", function: "eventDuplicate", args: { eventKey: "source" } })
  expect(JSON.parse(result.content[0].text)).toEqual(failure)
  expect(called).toEqual({ name: "catalog:eventDuplicate", args: { eventKey: "source", token: "credential" } })
})
