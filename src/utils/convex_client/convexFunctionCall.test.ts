import { expect, test } from "bun:test"
import {
  callConvexFunction,
  convexFunctionArgsWithToken,
  convexFunctionCallDispatch,
  convexFunctionCallIsPublic,
  convexFunctionCallResolve,
  convexFunctionReferenceLookup,
  convexFunctionReferenceParse,
  type ConvexFunctionRunner,
} from "./convexFunctionCall.js"

test("convexFunctionCallResolve maps module and name to a function reference", () => {
  const resolved = convexFunctionCallResolve({ module: "catalog", name: "catalogEventListPublishedPageQuery" })
  expect(resolved).toEqual({
    module: "catalog",
    name: "catalogEventListPublishedPageQuery",
    functionName: "catalog:catalogEventListPublishedPageQuery",
    kind: "query",
    visibility: "public",
    acceptsToken: false,
  })
})

test("convexFunctionCallResolve returns undefined for unknown functions", () => {
  expect(convexFunctionCallResolve({ module: "nope", name: "missing" })).toBeUndefined()
  expect(convexFunctionCallResolve({ module: "catalog", name: "missing" })).toBeUndefined()
})

test("convexFunctionCallIsPublic refuses internal functions", () => {
  const internal = convexFunctionCallResolve({ module: "auth", name: "apiKeyExpireInternalMutation" })
  expect(internal?.visibility).toBe("internal")
  expect(internal && convexFunctionCallIsPublic(internal)).toBe(false)
})

test("convexFunctionArgsWithToken injects only for token-accepting functions", () => {
  const accepting = convexFunctionCallResolve({ module: "auth", name: "apiKeyListQuery" })
  const tokenless = convexFunctionCallResolve({ module: "catalog", name: "catalogEventListPublishedPageQuery" })
  expect(accepting && convexFunctionArgsWithToken(accepting, {}, "tok")).toEqual({ token: "tok" })
  expect(tokenless && convexFunctionArgsWithToken(tokenless, { filter: 1 }, "tok")).toEqual({ filter: 1 })
  expect(accepting && convexFunctionArgsWithToken(accepting, {}, undefined)).toEqual({})
  expect(accepting && convexFunctionArgsWithToken(accepting, { token: "own" }, "tok")).toEqual({ token: "own" })
})

test("convexFunctionReferenceParse accepts only <module:function> shapes", () => {
  expect(convexFunctionReferenceParse("catalog:catalogEventListPublishedPageQuery")).toEqual({
    module: "catalog",
    name: "catalogEventListPublishedPageQuery",
  })
  for (const invalid of ["", "catalog", "catalog:", ":name", "a:b:c"]) {
    expect(convexFunctionReferenceParse(invalid), invalid).toBeUndefined()
  }
})

test("convexFunctionReferenceLookup reads live references from the generated api", () => {
  const resolved = convexFunctionCallResolve({ module: "catalog", name: "catalogEventListPublishedPageQuery" })
  expect(resolved).toBeDefined()
  const reference = resolved && convexFunctionReferenceLookup(resolved)
  expect(typeof reference).toBe("object")
})

function dispatchRunner(calls: string[]): ConvexFunctionRunner {
  return {
    query: async () => {
      calls.push("query")
      return { kind: "query" }
    },
    mutation: async () => {
      calls.push("mutation")
      return { kind: "mutation" }
    },
    action: async () => {
      calls.push("action")
      return { kind: "action" }
    },
  }
}

test("convexFunctionCallDispatch routes by kind through the passed runner", async () => {
  for (const [module, name, kind] of [
    ["catalog", "catalogEventListPublishedPageQuery", "query"],
    ["catalog", "catalogEventPublishMutation", "mutation"],
    ["ticketing", "ticketPaymentReconcileAction", "action"],
  ] as const) {
    const resolved = convexFunctionCallResolve({ module, name })
    expect(resolved).toBeDefined()
    if (!resolved || !convexFunctionCallIsPublic(resolved)) throw new Error(`fixture not public: ${module}:${name}`)
    const reference = convexFunctionReferenceLookup(resolved)
    expect(reference).toBeDefined()
    if (!reference) throw new Error("missing reference")
    const calls: string[] = []
    const result = await convexFunctionCallDispatch(resolved, reference, {}, dispatchRunner(calls))
    expect(calls).toEqual([kind])
    expect(result).toEqual({ kind })
  }
})

test("callConvexFunction resolves, gates and dispatches a public function", async () => {
  const calls: string[] = []
  const result = await callConvexFunction(
    "catalog",
    "catalogEventListPublishedPageQuery",
    { filter: "x" },
    dispatchRunner(calls),
  )
  expect(calls).toEqual(["query"])
  expect(result).toEqual({ kind: "query" })
})

test("callConvexFunction throws for unknown and internal functions", async () => {
  const calls: string[] = []
  const runner = dispatchRunner(calls)
  await expect(callConvexFunction("nope" as never, "missing" as never, {} as never, runner)).rejects.toThrow(
    'Unknown Convex function "nope:missing"',
  )
  await expect(
    callConvexFunction("auth", "apiKeyExpireInternalMutation" as never, {} as never, runner),
  ).rejects.toThrow("not agent-reachable")
  expect(calls).toHaveLength(0)
})
