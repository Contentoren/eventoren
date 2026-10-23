import { expect, test } from "bun:test"
import {
  convexCatalogImportLoader,
  convexCatalogTokenDetect,
  convexCatalogTokenScan,
  convexFunctionCatalogCollect,
  stripSatisfiesSuffix,
} from "./convexFunctionCatalogGenerate.ts"

test("convexCatalogTokenScan finds token fields and ignores prose", () => {
  for (const block of [
    "{ token: v.string() }",
    '{ "token": v.string() }',
    "{ 'token': v.string() }",
    "{ token?: v.string() }",
    "{ token ? : v.string() }",
    "{ name: v.string(),\n token: v.optional(v.string()) }",
    "{ nested: { token: v.string() } }",
  ]) {
    expect(convexCatalogTokenScan(block), block).toBe(true)
  }
  for (const block of [
    "{ name: v.string() }",
    "{}",
    "{ cid: v.optional(v.string()), jid: v.optional(v.string()) }",
    "{ guestAccessToken: v.string() }",
    "{ tokenValue: v.string() }",
    '{ note: "mention token: here" }',
    "{ name: v.string() } // token: v.string()",
    "{ /* token: v.string() */ name: v.string() }",
    "{ name: `has token: template` }",
    "{ note: 'token?: not a key' }",
  ]) {
    expect(convexCatalogTokenScan(block), block).toBe(false)
  }
})

test("convexCatalogTokenDetect classifies loader-independent shapes", () => {
  for (const [expression, expected] of [
    ["createTokenValidator(userDeleteFieldsPublic)", true],
    ["createUserIdValidator(userProfileUpdateFields)", false],
    ["createUserIdValidator(orgLeaveFields)", false],
    ["{}", false],
    ['Omit<UserFields, "token"> & { userId: v.string() }', false],
    ["Omit<UserFields, 'token'>", false],
    ["Omit<UserFields, 'session'>", null],
    ["{ token: v.string() }", true],
    ['v.object({ "token": v.string() })', true],
    ["v.object({ token?: v.string() })", true],
    ["v.object({ name: v.string() })", false],
    ["a.object({ token: a.string() })", true],
    ["v.object(groupLookupConvexFields)", null],
    ["unknownValidator", null],
  ] as const) {
    expect(convexCatalogTokenDetect(expression), expression).toBe(expected)
  }
})

test("stripSatisfiesSuffix removes a trailing satisfies annotation", () => {
  expect(stripSatisfiesSuffix("v.object({ a: v.string() }) satisfies Validator")).toBe("v.object({ a: v.string() })")
  expect(stripSatisfiesSuffix("{ token: v.string() } satisfies Foo")).toBe("{ token: v.string() }")
  expect(stripSatisfiesSuffix("v.object({ a: v.string() })")).toBe("v.object({ a: v.string() })")
})

test("convexCatalogImportLoader resolves validator field files", () => {
  const loadImportedFile = convexCatalogImportLoader(process.cwd())
  const loaded = loadImportedFile(
    "src/auth/convex/user/profile_update/userProfileUpdateMutationInternal.ts",
    "#src/auth/convex/user/profile_update/userProfileUpdate.ts",
  )
  expect(loaded?.file).toBe("src/auth/convex/user/profile_update/userProfileUpdate.ts")
  expect(loaded?.source).toContain("userProfileUpdateFields")
})

test("collect resolves the previously-null validators to false", () => {
  const entries = convexFunctionCatalogCollect(process.cwd())
  const byKey = new Map(entries.map((entry) => [`${entry.module}:${entry.name}`, entry]))
  for (const key of [
    "auth:userEmailChange2ConfirmInternalMutation",
    "auth:userPasswordChange2ConfirmInternalMutation",
    "auth:userProfileUpdateInternalMutation",
    "org:orgCleanupIfEmptyInternalMutation",
  ]) {
    expect(byKey.get(key)?.acceptsToken, key).toBe(false)
  }
})

test("collect keeps the public token validators true", () => {
  const entries = convexFunctionCatalogCollect(process.cwd())
  const byKey = new Map(entries.map((entry) => [`${entry.module}:${entry.name}`, entry]))
  expect(byKey.get("auth:userEmailChange2ConfirmMutation")?.acceptsToken).toBe(true)
  expect(byKey.get("auth:userProfileUpdateMutation")?.acceptsToken).toBe(true)
})

test("collect follows aliased re-exports to the local definition", () => {
  const entries = convexFunctionCatalogCollect(process.cwd())
  const byKey = new Map(entries.map((entry) => [`${entry.module}:${entry.name}`, entry]))
  const entry = byKey.get("publicProjectInfo:publicProjectInfo")
  expect(entry?.kind).toBe("query")
  expect(entry?.acceptsToken).toBe(false)
})
