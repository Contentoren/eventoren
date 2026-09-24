/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { SignJWT } from "jose"
import { expect, test } from "vitest"
import { zitadelRoleSyncProofCreate } from "../src/auth/server/zitadelRoleSyncProofCreate.ts"
import type { CommonAuthProvider } from "../src/auth/server/social_identity_providers/CommonAuthProvider.ts"
import { api, internal } from "../convex/_generated/api.js"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "eventoren-auth-convex-test-secret"
process.env.AUTH_SECRET = authSecret

test("maps Zitadel identity to an Eventoren session and revokes it on logout", async () => {
  const t = convexTest(schema, modules)
  const signedIn = await signIn(t, {
    provider: "zitadel",
    providerId: "testadmin-zitadel-subject",
    givenName: "Test",
    familyName: "Admin",
    image: "",
    username: "testadmin",
    email: "testadmin@contentoren.de",
    zitadelRoles: ["organizer"],
  })

  expect(signedIn.success).toBe(true)
  if (!signedIn.success) return
  expect(signedIn.data.signedInMethod).toBe("zitadel")
  expect(signedIn.data.profile.role).toBe("organizer")

  const currentUser = await t.query(api.auth.authCurrentUserGetQuery, { token: signedIn.data.token })
  expect(currentUser).toMatchObject({ success: true, data: { email: "testadmin@contentoren.de", role: "organizer" } })

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

  const firstSignIn = await signIn(t, provider)
  const secondSignIn = await signIn(t, provider)

  expect(firstSignIn.success).toBe(true)
  expect(secondSignIn.success).toBe(true)
  if (!firstSignIn.success || !secondSignIn.success) return
  expect(firstSignIn.data.profile).not.toHaveProperty("email")
  expect(secondSignIn.data.profile.userId).toBe(firstSignIn.data.profile.userId)
})

test("refreshes present Zitadel profile claims independently and preserves absent claims and email", async () => {
  const t = convexTest(schema, modules)
  const initial = await signIn(t, {
    provider: "zitadel",
    providerId: "zitadel-profile-refresh",
    givenName: "Initial",
    familyName: "Name",
    image: "https://img.test/initial",
    username: "profile-refresh",
    email: "verified@example.test",
    zitadelRoles: [],
  })
  expect(initial.success).toBe(true)
  if (!initial.success) return

  const nameRefresh = await signIn(t, {
    provider: "zitadel",
    providerId: "zitadel-profile-refresh",
    givenName: "Updated",
    username: "profile-refresh",
    zitadelRoles: ["organizer"],
  })
  expect(nameRefresh.success).toBe(true)
  if (!nameRefresh.success) return
  expect(nameRefresh.data.profile).toMatchObject({
    name: "Updated",
    image: "https://img.test/initial",
    role: "organizer",
  })

  const pictureRefresh = await signIn(t, {
    provider: "zitadel",
    providerId: "zitadel-profile-refresh",
    image: "https://img.test/updated",
    username: "profile-refresh",
    zitadelRoles: ["organizer"],
  })
  expect(pictureRefresh.success).toBe(true)
  if (!pictureRefresh.success) return
  expect(pictureRefresh.data.profile).toMatchObject({
    name: "Updated",
    image: "https://img.test/updated",
    role: "organizer",
  })

  const noProfileClaims = await signIn(t, {
    provider: "zitadel",
    providerId: "zitadel-profile-refresh",
    username: "profile-refresh",
    zitadelRoles: ["organizer"],
    email: "changed@example.test",
  })
  expect(noProfileClaims.success).toBe(true)
  if (!noProfileClaims.success) return
  expect(noProfileClaims.data.profile).toMatchObject({
    name: "Updated",
    image: "https://img.test/updated",
    role: "organizer",
  })
  expect(noProfileClaims.data.profile.email).toBe("verified@example.test")
  expect(noProfileClaims.data.profile).not.toHaveProperty("zitadelRoles")
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

  const firstSignIn = await signIn(t, provider)
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

  const repeatedSignIn = await signIn(t, provider)
  expect(repeatedSignIn.success).toBe(true)
  const repeatedUser = await t.run(async (ctx) => ctx.db.get("users", userId as Id<"users">))
  expect(repeatedUser?.organizerInvitedAt).toBe(firstInvitation)

  const removedSignIn = await signIn(t, {
    ...provider,
    zitadelRoles: [],
  })
  expect(removedSignIn.success).toBe(true)
  expect((await t.run(async (ctx) => ctx.db.get("users", userId as Id<"users">)))?.organizerInvitedAt).toBeUndefined()

  const reinvitedSignIn = await signIn(t, provider)
  expect(reinvitedSignIn.success).toBe(true)
  const reinvitedUser = await t.run(async (ctx) => ctx.db.get("users", userId as Id<"users">))
  expect(reinvitedUser?.organizerInvitedAt).toBeDefined()
  expect(reinvitedUser?.organizerInvitedAt).not.toBe(firstInvitation)
})

test("preserves legacy admin access when organization role sync is disabled", async () => {
  const t = convexTest(schema, modules)
  const now = new Date().toISOString()
  const adminId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Legacy Admin",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    }),
  )

  const adminSync = await t.mutation(internal.auth.authUserZitadelRolesSynchronizeInternalMutation, {
    userId: adminId,
    zitadelUserId: "legacy-admin-zitadel",
    roles: ["organizer"],
  })
  expect(adminSync.success && adminSync.data.role).toBe("admin")
})

test("enabled Zitadel role sync replaces legacy admin overrides", async () => {
  const t = convexTest(schema, modules)
  const now = new Date().toISOString()
  const adminId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Legacy Admin",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    }),
  )

  const adminSync = await t.mutation(internal.auth.authUserZitadelRolesSynchronizeInternalMutation, {
    userId: adminId,
    zitadelUserId: "legacy-admin-zitadel",
    roles: ["organizer"],
    roleSyncEnabled: true,
  })
  expect(adminSync.success && adminSync.data.role).toBe("organizer")
})

test("rejects caller-supplied enabled role sync without a signed server proof", async () => {
  const t = convexTest(schema, modules)

  const result = await t.action(api.auth.authSignInUsingZitadelAction, {
    provider: "zitadel",
    providerId: "forged-zitadel-subject",
    username: "forged",
    zitadelRoles: ["admin"],
    zitadelRoleSyncEnabled: true,
  })

  expect(result.success).toBe(false)
  expect(await t.run(async (ctx) => ctx.db.query("users").collect())).toHaveLength(0)
})

test("rejects unsigned legacy Zitadel sign-ins and signed proof changes to roles, identity, email, or sync mode", async () => {
  const t = convexTest(schema, modules)
  const provider = {
    provider: "zitadel" as const,
    providerId: "verified-subject",
    username: "verified",
    email: "verified@example.test",
    zitadelRoles: ["customer" as const],
    zitadelRoleSyncEnabled: true,
  }
  const proof = await zitadelRoleSyncProofCreate(provider, "eventoren-org")
  expect(proof).toBeDefined()
  const unsigned = await t.action(api.auth.authSignInUsingZitadelAction, {
    ...provider,
    zitadelRoleSyncEnabled: undefined,
    zitadelRoles: ["admin"],
  })
  expect(unsigned.success).toBe(false)
  for (const change of [
    { zitadelRoles: ["admin"] as ("admin" | "customer")[] },
    { providerId: "another-subject" },
    { email: "victim@example.test" },
    { zitadelRoleSyncEnabled: false },
  ]) {
    const result = await t.action(api.auth.authSignInUsingZitadelAction, {
      ...provider,
      ...change,
      zitadelRoleSyncProof: proof,
    })
    expect(result.success).toBe(false)
  }
  expect(await t.run((ctx) => ctx.db.query("users").collect())).toHaveLength(0)
})

test("rejects an expired signed Zitadel proof instead of allowing old role assertions to replay", async () => {
  const t = convexTest(schema, modules)
  const provider = {
    provider: "zitadel" as const,
    providerId: "subject",
    username: "subject",
    zitadelRoles: ["admin" as const],
  }
  const expiredProof = await new SignJWT({ provider, organizationId: null })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("eventoren-zitadel-role-sync")
    .setAudience("eventoren-auth")
    .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
    .sign(new TextEncoder().encode(authSecret))
  const result = await t.action(api.auth.authSignInUsingZitadelAction, {
    ...provider,
    zitadelRoleSyncProof: expiredProof,
  })
  expect(result.success).toBe(false)
})

test("verified empty roles downgrade existing Zitadel accounts and matching-email legacy admins", async () => {
  const t = convexTest(schema, modules)
  const admin = await signIn(
    t,
    {
      provider: "zitadel",
      providerId: "existing-subject",
      username: "existing",
      zitadelRoles: ["admin"],
      zitadelRoleSyncEnabled: true,
    },
    "eventoren-org",
  )
  expect(admin.success && admin.data.profile.role).toBe("admin")
  const downgraded = await signIn(
    t,
    {
      provider: "zitadel",
      providerId: "existing-subject",
      username: "existing",
      zitadelRoles: [],
      zitadelRoleSyncEnabled: true,
    },
    "eventoren-org",
  )
  expect(downgraded.success && downgraded.data.profile.role).toBe("customer")

  const now = new Date().toISOString()
  const linkedId = await t.run((ctx) =>
    ctx.db.insert("users", {
      name: "Legacy Admin",
      email: "legacy@example.test",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    }),
  )
  const linked = await signIn(
    t,
    {
      provider: "zitadel",
      providerId: "linked-subject",
      username: "linked",
      email: "legacy@example.test",
      zitadelRoles: [],
      zitadelRoleSyncEnabled: true,
    },
    "eventoren-org",
  )
  expect(linked.success && linked.data.profile.role).toBe("customer")
  expect(linked.success && linked.data.profile.userId).toBe(linkedId)
})

async function signIn(t: ReturnType<typeof convexTest>, provider: CommonAuthProvider, organizationId?: string) {
  const proof = await zitadelRoleSyncProofCreate(provider, organizationId)
  if (!proof) throw new Error("Test signing secret is not configured")
  return t.action(api.auth.authSignInUsingZitadelAction, { ...provider, zitadelRoleSyncProof: proof })
}
