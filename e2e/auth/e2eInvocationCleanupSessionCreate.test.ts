import { createHash } from "node:crypto"
import { expect, test } from "@rstest/core"
import { e2eInvocationCleanupSessionCreate } from "./e2eInvocationCleanupSessionCreate.ts"

const runId = "mtest-12345678-1234-1234-1234-123456789abc"
const targetBaseUrl = "https://eventoren.de"
const convexUrl = "https://example.convex.cloud"

test("explicit cleanup token verifies admin without marking or browser login", async () => {
  const adminToken = "explicit-admin-token-xyz"
  let browserCalls = 0
  let markCalls = 0
  const verifyCalls: Array<{ convexUrl: string; token: string }> = []
  const result = await e2eInvocationCleanupSessionCreate({
    targetBaseUrl,
    convexUrl,
    runId,
    env: { E2E_CLEANUP_ADMIN_TOKEN: adminToken },
    deps: {
      browserLogin: async () => {
        browserCalls += 1
        return { token: "must-not-login", close: async () => {} }
      },
      sessionVerify: async (args) => {
        verifyCalls.push(args)
        return { success: true, data: { role: "admin", userId: "user_admin", sessionId: "sess_explicit" } }
      },
      mark: async () => {
        markCalls += 1
        return { success: false, errorMessage: "mark must not run for shared token" }
      },
    },
  })

  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  expect(result.data).toMatchObject({ token: adminToken, sessionId: "sess_explicit", owned: false })
  expect(result.data.tokenDigest).toBe(createHash("sha256").update(adminToken, "utf8").digest("hex"))
  expect(verifyCalls).toHaveLength(1)
  expect(verifyCalls[0]).toMatchObject({ convexUrl, token: adminToken })
  expect(browserCalls).toBe(0)
  expect(markCalls).toBe(0)
})

test("fresh testadmin login verifies admin then marks the same outer run", async () => {
  const order: string[] = []
  const markRunIds: string[] = []
  let closes = 0
  const freshToken = "fresh-session-token-abc"
  const run = async () =>
    e2eInvocationCleanupSessionCreate({
      targetBaseUrl,
      convexUrl,
      runId,
      env: { E2E_AUTH_USERNAME: "e2e-user", E2E_AUTH_PASSWORD: "e2e-password" },
      deps: {
        browserLogin: async (args) => {
          order.push("browserLogin")
          expect(args.baseUrl).toBe(targetBaseUrl)
          return {
            token: freshToken,
            close: async () => {
              closes += 1
            },
          }
        },
        sessionVerify: async (args) => {
          order.push("sessionVerify")
          expect(args).toMatchObject({ convexUrl, token: freshToken })
          return { success: true, data: { role: "admin", userId: "user_admin" } }
        },
        mark: async (args) => {
          order.push("mark")
          markRunIds.push(args.runId)
          expect(args).toMatchObject({ token: freshToken, runId })
          return { success: true, data: { sessionId: "sess_fresh", creationTime: 7, runId: args.runId } }
        },
      },
    })

  const first = await run()
  const second = await run()
  expect(first.success).toBe(true)
  expect(second.success).toBe(true)
  if (!first.success || !second.success) throw new Error("expected success")
  expect(first.data).toMatchObject({ token: freshToken, sessionId: "sess_fresh", owned: true })
  expect(second.data).toMatchObject({ token: freshToken, sessionId: "sess_fresh", owned: true })
  expect(first.data.tokenDigest).toBe(createHash("sha256").update(freshToken, "utf8").digest("hex"))
  expect(first.data.tokenDigest).toBe(second.data.tokenDigest)
  expect(order).toEqual(["browserLogin", "sessionVerify", "mark", "browserLogin", "sessionVerify", "mark"])
  expect(markRunIds).toEqual([runId, runId])
  expect(closes).toBe(2)
})

test("login and mark failures redact the token, close the browser, and delete nothing", async () => {
  const freshToken = "fresh-secret-token-retain-server"
  const password = "e2e-password"
  const closes: string[] = []
  let markCalls = 0

  const verifyFailed = await e2eInvocationCleanupSessionCreate({
    targetBaseUrl,
    convexUrl,
    runId,
    env: { E2E_AUTH_USERNAME: "e2e-user", E2E_AUTH_PASSWORD: password },
    deps: {
      browserLogin: async () => ({
        token: freshToken,
        close: async () => {
          closes.push("verify-failed")
        },
      }),
      sessionVerify: async () => ({
        success: false,
        op: "sessionVerify",
        errorMessage: "not admin",
      }),
      mark: async () => {
        markCalls += 1
        return { success: true, data: { sessionId: "sess_must_not_mark" } }
      },
    },
  })
  expect(verifyFailed.success).toBe(false)
  if (verifyFailed.success) throw new Error("expected failure")
  expect(verifyFailed.errorMessage).not.toContain(freshToken)
  expect(verifyFailed.errorMessage).not.toContain(password)
  expect(markCalls).toBe(0)
  expect(closes).toEqual(["verify-failed"])

  const markFailed = await e2eInvocationCleanupSessionCreate({
    targetBaseUrl,
    convexUrl,
    runId,
    env: { E2E_AUTH_USERNAME: "e2e-user", E2E_AUTH_PASSWORD: password },
    deps: {
      browserLogin: async () => ({
        token: freshToken,
        close: async () => {
          closes.push("mark-failed")
        },
      }),
      sessionVerify: async () => ({ success: true, data: { role: "admin", userId: "user_admin" } }),
      mark: async () => ({ success: false, errorMessage: "marking rejected" }),
    },
  })
  expect(markFailed.success).toBe(false)
  if (markFailed.success) throw new Error("expected failure")
  expect(markFailed.errorMessage).not.toContain(freshToken)
  expect(markFailed.errorMessage).toContain("server session retained")
  expect(closes).toEqual(["verify-failed", "mark-failed"])
})
