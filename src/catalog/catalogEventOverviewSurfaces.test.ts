import { expect, test } from "bun:test"
import type { ConvexHttpClient } from "convex/browser"
import { getFunctionName } from "convex/server"
import { catalogEventOverviewHonoCreate } from "#src/catalog/api/catalogEventOverviewHonoCreate.ts"
import { apiClientConvexCall } from "#src/client/apiClientConvexCall.ts"

test("generic client dispatch resolves overview and injects the caller token", async () => {
  let called: unknown
  const client = {
    query: async (reference: Parameters<typeof getFunctionName>[0], args: unknown) => {
      called = { name: getFunctionName(reference), args }
      return { success: true, data: { page: [], isDone: true, continueCursor: "end" } }
    },
  } as unknown as ConvexHttpClient
  const args = { eventKey: "event", paginationOpts: { numItems: 10, cursor: null } }
  const result = await apiClientConvexCall(
    { module: "catalog", name: "eventOverviewPage", token: "credential", args },
    client,
  )
  expect(result.success).toBe(true)
  expect(called).toEqual({ name: "catalog:eventOverviewPage", args: { ...args, token: "credential" } })
})

test("overview HTTP uses bearer credentials and shared page validation", async () => {
  let called: unknown
  const client = {
    query: async (_reference: unknown, args: unknown) => {
      called = args
      return { success: true, data: { page: [], isDone: true, continueCursor: "end" } }
    },
  } as unknown as ConvexHttpClient
  const app = catalogEventOverviewHonoCreate(client)
  const body = { eventKey: "event", paginationOpts: { numItems: 50, cursor: null } }
  const send = (data: unknown, authorization = "Bearer credential") =>
    app.request("/api/admin-event-overview", {
      method: "POST",
      headers: { authorization, "content-type": "application/json" },
      body: JSON.stringify(data),
    })
  expect((await send(body, "")).status).toBe(401)
  expect((await send({ ...body, paginationOpts: { numItems: 51, cursor: null } })).status).toBe(400)
  const response = await send(body)
  expect(response.status).toBe(200)
  expect(called).toEqual({ ...body, token: "credential" })
  expect((await response.json()).data.continueCursor).toBe("end")
})
