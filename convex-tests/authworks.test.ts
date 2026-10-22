/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { authworksLoginProofCreate } from "../src/auth/server/authworksLoginProofCreate.ts"
import { zitadelRoleSyncProofCreate } from "../src/auth/server/zitadelRoleSyncProofCreate.ts"
import type { CommonAuthProvider } from "../src/auth/server/social_identity_providers/CommonAuthProvider.ts"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "eventoren-auth-convex-test-secret"
process.env.AUTH_SECRET = authSecret

test("maps an Authworks identity to a customer session and reuses its auth account", async () => {
  const t = convexTest(schema, modules)
  const provider = {
    provider: "authworks" as const,
    providerId: "authworks-subject-1",
    givenName: "Ada",
    familyName: "Lovelace",
    username: "ada",
    email: "ada@example.test",
  }

  const firstSignIn = await signIn(t, provider)
  expect(firstSignIn.success).toBe(true)
  if (!firstSignIn.success) return
  expect(firstSignIn.data.signedInMethod).toBe("authworks")
  expect(firstSignIn.data.profile.role).toBe("customer")

  const secondSignIn = await signIn(t, { ...provider, givenName: "Augusta" })
  expect(secondSignIn.success).toBe(true)
  if (!secondSignIn.success) return
  expect(secondSignIn.data.profile.userId).toBe(firstSignIn.data.profile.userId)
  expect(secondSignIn.data.profile.name).toBe("Augusta Lovelace")
})

test("links an Authworks identity to an existing user by verified email", async () => {
  const t = convexTest(schema, modules)
  const now = new Date().toISOString()
  const existingId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Legacy",
      email: "legacy@example.test",
      role: "customer",
      createdAt: now,
      updatedAt: now,
    }),
  )

  const linked = await signIn(t, {
    provider: "authworks",
    providerId: "linked-authworks-subject",
    username: "linked-aw",
    email: "legacy@example.test",
  })
  expect(linked.success).toBe(true)
  if (!linked.success) return
  expect(linked.data.signedInMethod).toBe("authworks")
  expect(linked.data.profile.userId).toBe(existingId)
})

test("rejects unsigned Authworks sign-ins without creating users", async () => {
  const t = convexTest(schema, modules)

  const result = await t.action(api.auth.authSignInUsingAuthworksAction, {
    provider: "authworks",
    providerId: "forged-authworks-subject",
    username: "forged",
  })

  expect(result.success).toBe(false)
  expect(await t.run(async (ctx) => ctx.db.query("users").collect())).toHaveLength(0)
})

test("rejects Authworks proofs that carry roles and Zitadel proofs replayed at the Authworks action", async () => {
  const t = convexTest(schema, modules)
  const roleCarrier = {
    provider: "authworks" as const,
    providerId: "role-carrier",
    username: "carrier",
    zitadelRoles: ["admin" as const],
  }
  const roleProof = await authworksLoginProofCreate(roleCarrier, "eventoren-org")
  expect(roleProof).toBeDefined()
  expect(
    (await t.action(api.auth.authSignInUsingAuthworksAction, { ...roleCarrier, zitadelRoleSyncProof: roleProof }))
      .success,
  ).toBe(false)

  const zitadelProvider = { provider: "zitadel" as const, providerId: "replay-subject", username: "replay" }
  const zitadelProof = await zitadelRoleSyncProofCreate(zitadelProvider)
  expect(zitadelProof).toBeDefined()
  expect(
    (
      await t.action(api.auth.authSignInUsingAuthworksAction, {
        provider: "authworks",
        providerId: "replay-subject",
        username: "replay",
        zitadelRoleSyncProof: zitadelProof,
      })
    ).success,
  ).toBe(false)
  expect(await t.run(async (ctx) => ctx.db.query("users").collect())).toHaveLength(0)
})

async function signIn(t: ReturnType<typeof convexTest>, provider: CommonAuthProvider, organizationId?: string) {
  const proof = await authworksLoginProofCreate(provider, organizationId)
  if (!proof) throw new Error("Test signing secret is not configured")
  return t.action(api.auth.authSignInUsingAuthworksAction, { ...provider, zitadelRoleSyncProof: proof })
}
