import { expect, test } from "bun:test"
import { apiClientConvexCall } from "./apiClientConvexCall.js"

function fakeClient(behavior: { kind: "query" | "mutation" | "action"; data?: unknown; error?: string }) {
  const calls: { method: string; reference: unknown; args: unknown }[] = []
  const run = async (method: string, reference: unknown, args: unknown) => {
    calls.push({ method, reference, args })
    if (behavior.error) throw new Error(behavior.error)
    return behavior.data ?? { ok: true }
  }
  return {
    calls,
    client: {
      query: (reference: never, args: never) => run("query", reference, args),
      mutation: (reference: never, args: never) => run("mutation", reference, args),
      action: (reference: never, args: never) => run("action", reference, args),
    },
  }
}

test("apiClientConvexCall routes queries and injects token", async () => {
  const { calls, client } = fakeClient({ kind: "query" })
  const result = await apiClientConvexCall(
    { module: "auth", name: "apiKeyListQuery", args: { paginationOpts: { numItems: 1, cursor: null } }, token: "tok" },
    client as never,
  )
  expect(result).toEqual({ success: true, data: { ok: true } })
  expect(calls).toHaveLength(1)
  expect(calls[0]?.method).toBe("query")
  expect(calls[0]?.args).toEqual({ paginationOpts: { numItems: 1, cursor: null }, token: "tok" })
})

test("apiClientConvexCall routes mutations without touching tokenless args", async () => {
  const { calls, client } = fakeClient({ kind: "mutation" })
  const result = await apiClientConvexCall(
    {
      module: "catalog",
      name: "catalogEventPublishMutation",
      args: { eventKey: "e1" },
      token: "tok",
    },
    client as never,
  )
  expect(result.success).toBe(true)
  expect(calls[0]?.method).toBe("mutation")
})

test("apiClientConvexCall routes actions", async () => {
  const { calls, client } = fakeClient({ kind: "action" })
  const result = await apiClientConvexCall(
    { module: "ticketing", name: "ticketPaymentReconcileAction", args: {} },
    client as never,
  )
  expect(result.success).toBe(true)
  expect(calls[0]?.method).toBe("action")
})

test("apiClientConvexCall reports unknown and internal functions", async () => {
  const { client } = fakeClient({ kind: "query" })
  expect(await apiClientConvexCall({ module: "nope", name: "missing" }, client as never)).toEqual({
    success: false,
    error: { status: 404, message: 'Unknown Convex function "nope:missing"' },
  })
  expect(await apiClientConvexCall({ module: "auth", name: "apiKeyExpireInternalMutation" }, client as never)).toEqual({
    success: false,
    error: {
      status: 403,
      message: 'Internal Convex function "auth:apiKeyExpireInternalMutation" is not agent-reachable',
    },
  })
})

test("apiClientConvexCall maps transport errors to 503", async () => {
  const { client } = fakeClient({ kind: "query", error: "boom" })
  const result = await apiClientConvexCall({ module: "auth", name: "apiKeyListQuery" }, client as never)
  expect(result).toEqual({ success: false, error: { status: 503, message: "boom" } })
})
