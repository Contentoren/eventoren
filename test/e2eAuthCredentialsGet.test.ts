import { describe, expect, test } from "bun:test"
import { e2eAuthCredentialsGet } from "../e2e/config/e2eAuthCredentialsGet.ts"

describe("E2E auth credentials", () => {
  test("uses explicit auth credentials without invoking Zitadel CLI", () => {
    const result = e2eAuthCredentialsGet({ E2E_AUTH_USERNAME: "test-admin", E2E_AUTH_PASSWORD: "secret" }, () => {
      throw new Error("should not invoke CLI")
    })

    expect(result).toEqual({ success: true, data: { username: "test-admin", password: "secret" } })
  })

  test("rejects partial explicit auth configuration", () => {
    const result = e2eAuthCredentialsGet({ E2E_AUTH_USERNAME: "test-admin" }, () => "unused")

    expect(result.success).toBe(false)
  })

  test("resolves local testadmin credentials from the contentoren CLI profile", () => {
    const requestedArgs: string[][] = []
    const result = e2eAuthCredentialsGet({}, (args) => {
      requestedArgs.push(args)
      return args.at(-1) === "username" ? "local-admin" : "local-password"
    })

    expect(result).toEqual({ success: true, data: { username: "local-admin", password: "local-password" } })
    expect(requestedArgs).toEqual([
      ["credentials", "get", "testadmin", "--profile", "contentoren", "--field", "username"],
      ["credentials", "get", "testadmin", "--profile", "contentoren", "--field", "password"],
    ])
  })

  test("returns a Result error when the credential command fails without leaking command output", () => {
    const result = e2eAuthCredentialsGet({}, () => {
      throw new Error("private CLI output")
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.errorMessage).not.toContain("private CLI output")
  })
})
