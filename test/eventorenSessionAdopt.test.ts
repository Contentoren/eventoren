import { expect, test } from "bun:test"
import { createResult } from "#result"
import type { UserProfile } from "../src/auth/model/UserProfile.ts"
import { eventorenSessionAdopt } from "../src/auth/server/eventorenSessionAdopt.ts"

test("legacy adoption keeps a different valid cookie identity and does not set its cookie", async () => {
  const current = profileCreate("cookie-user")
  const candidate = profileCreate("browser-user")
  const cookies: string[] = []

  const result = await eventorenSessionAdopt(
    { token: "browser-token", mode: "legacy" },
    {
      currentUserRead: async () => createResult(current),
      candidateRead: async () => createResult(candidate),
      setCookie: (token) => cookies.push(token),
    },
  )

  expect(result).toEqual({ success: true, data: { userId: "cookie-user", name: "Ada", role: "admin" } })
  expect(cookies).toEqual([])
})

test("validated login adoption sets the app cookie and returns safe identity", async () => {
  const candidate = profileCreate("login-user")
  const cookies: string[] = []

  const result = await eventorenSessionAdopt(
    { token: "login-token", mode: "replace" },
    {
      currentUserRead: async () => createResult(null),
      candidateRead: async (token) => {
        expect(token).toBe("login-token")
        return createResult(candidate)
      },
      setCookie: (token) => cookies.push(token),
    },
  )

  expect(result).toEqual({ success: true, data: { userId: "login-user", name: "Ada", role: "admin" } })
  expect(cookies).toEqual(["login-token"])
  expect(JSON.stringify(result)).not.toContain("token")
})

test("legacy adoption refreshes a rotated token for the same cookie identity", async () => {
  const current = profileCreate("same-user")
  const cookies: string[] = []

  const result = await eventorenSessionAdopt(
    { token: "rotated-token", mode: "legacy" },
    {
      currentUserRead: async () => createResult(current),
      candidateRead: async () => createResult(current),
      setCookie: (token) => cookies.push(token),
    },
  )

  expect(result).toEqual({ success: true, data: { userId: "same-user", name: "Ada", role: "admin" } })
  expect(cookies).toEqual(["rotated-token"])
})

function profileCreate(userId: string): UserProfile {
  return {
    userId,
    name: "Ada",
    role: "admin",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }
}
