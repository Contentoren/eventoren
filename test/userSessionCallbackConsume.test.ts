import { expect, test } from "bun:test"
import type { UserSession } from "../src/auth/model/UserSession.ts"
import { userSessionCallbackConsume } from "../src/auth/ui/userSessionCallbackConsume.ts"

test("persists callback sessions and removes their credential from the URL", () => {
  const now = new Date().toISOString()
  const userSession: UserSession = {
    token: "session-token",
    profile: { userId: "user-1", name: "Ada", role: "admin", createdAt: now, updatedAt: now },
    hasPw: false,
    signedInMethod: "zitadel",
    signedInAt: now,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  }
  const persisted: UserSession[] = []
  const replaced: string[] = []

  const result = userSessionCallbackConsume(
    `/sign-in?returnTo=%2Fadmin&userSession=${encodeURIComponent(JSON.stringify(userSession))}`,
    {
      persist: (session) => persisted.push(session),
      replaceUrl: (href) => replaced.push(href),
    },
  )

  expect(result).toEqual({
    success: true,
    data: { hasUserSession: true, cleanHref: "/sign-in?returnTo=%2Fadmin", sessionPersisted: true },
  })
  expect(persisted).toEqual([userSession])
  expect(replaced).toEqual(["/sign-in?returnTo=%2Fadmin"])
})

test("normalizes legacy empty optional email during callback cleanup", () => {
  const now = new Date().toISOString()
  const userSession = {
    token: "session-token",
    profile: { userId: "user-1", name: "Ada", email: "", role: "user", createdAt: now, updatedAt: now },
    hasPw: false,
    signedInMethod: "zitadel",
    signedInAt: now,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  }
  const persisted: UserSession[] = []

  const result = userSessionCallbackConsume(`/?userSession=${encodeURIComponent(JSON.stringify(userSession))}`, {
    persist: (session) => persisted.push(session),
    replaceUrl: () => {},
  })

  expect(result).toMatchObject({ success: true, data: { sessionPersisted: true } })
  expect(persisted[0]?.profile).not.toHaveProperty("email")
})
