/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "eventoren-auth-convex-test-secret"
process.env.AUTH_SECRET = authSecret

test("maps Zitadel identity to an Eventoren session and revokes it on logout", async () => {
  const t = convexTest(schema, modules)
  const signedIn = await t.action(api.auth.authSignInUsingZitadelAction, {
    provider: "zitadel",
    providerId: "testadmin-zitadel-subject",
    givenName: "Test",
    familyName: "Admin",
    image: "",
    username: "testadmin",
    email: "testadmin@contentoren.de",
  })

  expect(signedIn.success).toBe(true)
  if (!signedIn.success) return
  expect(signedIn.data.signedInMethod).toBe("zitadel")
  expect(signedIn.data.profile.role).toBe("customer")

  const currentUser = await t.query(api.auth.authCurrentUserGetQuery, { token: signedIn.data.token })
  expect(currentUser).toMatchObject({ success: true, data: { email: "testadmin@contentoren.de", role: "customer" } })

  const revoked = await t.mutation(api.auth.authSessionRevokeMutation, { token: signedIn.data.token })
  expect(revoked).toBe(true)

  const afterLogout = await t.query(api.auth.authCurrentUserGetQuery, { token: signedIn.data.token })
  expect(afterLogout.success).toBe(false)
})

test("persists Zitadel identities without an email and reuses their auth account", async () => {
  const t = convexTest(schema, modules)
  const provider = {
    provider: "zitadel" as const,
    providerId: "zitadel-subject-without-email",
    givenName: "No",
    familyName: "Email",
    image: "",
    username: "no-email",
  }

  const firstSignIn = await t.action(api.auth.authSignInUsingZitadelAction, provider)
  const secondSignIn = await t.action(api.auth.authSignInUsingZitadelAction, provider)

  expect(firstSignIn.success).toBe(true)
  expect(secondSignIn.success).toBe(true)
  if (!firstSignIn.success || !secondSignIn.success) return
  expect(firstSignIn.data.profile).not.toHaveProperty("email")
  expect(secondSignIn.data.profile.userId).toBe(firstSignIn.data.profile.userId)
})

test("synchronizes Zitadel roles and invitation periods", async () => {
  const t = convexTest(schema, modules)
  const provider = {
    provider: "zitadel" as const,
    providerId: "zitadel-organizer-subject",
    givenName: "Organizer",
    familyName: "One",
    image: "",
    username: "organizer-one",
    zitadelRoles: ["organizer" as const],
  }

  const firstSignIn = await t.action(api.auth.authSignInUsingZitadelAction, provider)
  expect(firstSignIn.success).toBe(true)
  if (!firstSignIn.success) return
  expect(firstSignIn.data.profile.role).toBe("organizer")

  const userId = firstSignIn.data.profile.userId
  const firstUser = await t.run(async (ctx) =>
    ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("name"), "Organizer One"))
      .unique(),
  )
  expect(firstUser?._id).toBe(userId)
  expect(firstUser?.organizerInvitedAt).toBeDefined()
  const firstInvitation = firstUser?.organizerInvitedAt

  const repeatedSignIn = await t.action(api.auth.authSignInUsingZitadelAction, provider)
  expect(repeatedSignIn.success).toBe(true)
  const repeatedUser = await t.run(async (ctx) => ctx.db.get("users", userId as Id<"users">))
  expect(repeatedUser?.organizerInvitedAt).toBe(firstInvitation)

  const removedSignIn = await t.action(api.auth.authSignInUsingZitadelAction, {
    ...provider,
    zitadelRoles: [],
  })
  expect(removedSignIn.success).toBe(true)
  expect((await t.run(async (ctx) => ctx.db.get("users", userId as Id<"users">)))?.organizerInvitedAt).toBeUndefined()

  const reinvitedSignIn = await t.action(api.auth.authSignInUsingZitadelAction, provider)
  expect(reinvitedSignIn.success).toBe(true)
  const reinvitedUser = await t.run(async (ctx) => ctx.db.get("users", userId as Id<"users">))
  expect(reinvitedUser?.organizerInvitedAt).toBeDefined()
  expect(reinvitedUser?.organizerInvitedAt).not.toBe(firstInvitation)
})

test("preserves legacy admin and dev access during Zitadel synchronization", async () => {
  const t = convexTest(schema, modules)
  const now = new Date().toISOString()
  const users = await t.run(async (ctx) => {
    const adminId = await ctx.db.insert("users", {
      name: "Legacy Admin",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    })
    const devId = await ctx.db.insert("users", { name: "Legacy Dev", role: "dev", createdAt: now, updatedAt: now })
    return { adminId, devId }
  })

  const adminSync = await t.mutation(internal.auth.authUserZitadelRolesSynchronizeInternalMutation, {
    userId: users.adminId,
    zitadelUserId: "legacy-admin-zitadel",
    roles: [],
  })
  const devSync = await t.mutation(internal.auth.authUserZitadelRolesSynchronizeInternalMutation, {
    userId: users.devId,
    zitadelUserId: "legacy-dev-zitadel",
    roles: [],
  })

  expect(adminSync.success && adminSync.data.role).toBe("admin")
  expect(devSync.success && devSync.data.role).toBe("dev")
})
