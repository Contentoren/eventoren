import { expect, test } from "bun:test"
import * as a from "valibot"
import {
  cliConvexCallArgsSchema,
  convexCallArgsParse,
  convexCallRequestParse,
  mcpConvexCallInputSchema,
} from "./convexCallSchemas.js"

test("convexCallRequestParse accepts canonical requests and rejects junk", () => {
  expect(convexCallRequestParse({ module: "auth", name: "apiKeyListQuery", args: { token: "k" } })).toEqual({
    module: "auth",
    name: "apiKeyListQuery",
    args: { token: "k" },
  })
  expect(convexCallRequestParse({ module: "auth", name: "apiKeyListQuery" }).args).toBeUndefined()
  for (const invalid of [
    {},
    { module: "auth" },
    { name: "apiKeyListQuery" },
    { module: "auth", name: "apiKeyListQuery", args: "nope" },
    "auth:apiKeyListQuery",
  ]) {
    expect(() => convexCallRequestParse(invalid), JSON.stringify(invalid)).toThrow()
  }
})

test("convexCallArgsParse validates the shared args record", () => {
  expect(convexCallArgsParse({})).toEqual({})
  expect(convexCallArgsParse({ token: "k" })).toEqual({ token: "k" })
  for (const invalid of ["nope", 42, [{ token: "k" }]]) {
    expect(() => convexCallArgsParse(invalid), JSON.stringify(invalid)).toThrow()
  }
})

test("mcpConvexCallInputSchema keeps the function key and defaults args", () => {
  expect(a.parse(mcpConvexCallInputSchema, { module: "auth", function: "apiKeyListQuery" })).toEqual({
    module: "auth",
    function: "apiKeyListQuery",
    args: {},
  })
  expect(() => a.parse(mcpConvexCallInputSchema, { module: "auth" })).toThrow()
})

test("cliConvexCallArgsSchema coerces JSON-decodable strings", () => {
  expect(
    a.parse(cliConvexCallArgsSchema, {
      count: "25",
      flag: "true",
      cursor: "null",
      opts: '{"numItems":1}',
      name: "plain",
      nested: { deep: "1" },
    }),
  ).toEqual({
    count: 25,
    flag: true,
    cursor: null,
    opts: { numItems: 1 },
    name: "plain",
    nested: { deep: "1" },
  })
})
