import { expect, test } from "bun:test"
import {
  convexFunctionArgsWithToken,
  convexFunctionCallIsPublic,
  convexFunctionCallResolve,
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
