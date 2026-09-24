/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { zitadelRoleSyncProofCreate } from "../src/auth/server/zitadelRoleSyncProofCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")

test("grants organizer access through Management v1 and stores the invitation time", async () => {
  await withEnvironment(async () => {
    const t = convexTest(schema, modules)
    const adminSession = await legacyAdminSession(t)
    const responses = [
      Response.json({
        user: {
          human: { email: { email: "organizer@example.test" }, profile: { displayName: "Organizer Example" } },
          id: "zitadel-user-id",
          preferredLoginName: "organizer@example.test",
          userName: "organizer",
        },
      }),
      Response.json({ details: { totalResult: 0 }, result: [] }),
      Response.json({}),
      Response.json({
        details: { totalResult: 1 },
        result: [
          {
            id: "grant-id",
            orgId: "organization-id",
            projectId: "project-id",
            roleKeys: ["organizer"],
            state: "USER_GRANT_STATE_ACTIVE",
            userId: "zitadel-user-id",
          },
        ],
      }),
    ]
    await withFetch(
      async () => responses.shift() ?? Response.json({}),
      async () => {
        const result = await t.action(api.auth.authAdminZitadelOrganizerGrantAction, {
          operation: "grant",
          token: adminSession,
          zitadelUserId: "zitadel-user-id",
        })

        expect(result.success).toBe(true)
        if (!result.success) return
        expect(result.data.organizerGranted).toBe(true)
        expect(result.data.organizerInvitedAt).toBeDefined()
        const localUser = await t.run(async (ctx) =>
          ctx.db
            .query("users")
            .withIndex("zitadelUserId", (q) => q.eq("zitadelUserId", "zitadel-user-id"))
            .unique(),
        )
        expect(localUser?.role).toBe("organizer")
        expect(localUser?.organizerInvitedAt).toBe(result.data.organizerInvitedAt)
      },
    )
  })
})

test("lists current Zitadel members and their current organizer grants", async () => {
  await withEnvironment(async () => {
    const t = convexTest(schema, modules)
    const adminSession = await legacyAdminSession(t)
    const responses = [
      Response.json({
        details: { totalResult: 1 },
        result: [
          {
            human: {
              email: { email: "ada@example.test" },
              profile: { displayName: "Ada Example", firstName: "Ada", lastName: "Example" },
            },
            id: "ada-id",
            preferredLoginName: "ada@example.test",
            userName: "ada",
          },
        ],
      }),
      Response.json({
        details: { totalResult: 1 },
        result: [
          {
            id: "ada-grant-id",
            orgId: "organization-id",
            projectId: "project-id",
            roleKeys: ["organizer"],
            state: "USER_GRANT_STATE_ACTIVE",
            userId: "ada-id",
          },
        ],
      }),
    ]
    await withFetch(
      async () => responses.shift() ?? Response.json({}),
      async () => {
        const result = await t.action(api.auth.authAdminZitadelMembersListAction, {
          limit: 10,
          offset: 0,
          search: "Ada",
          token: adminSession,
        })

        expect(result.success).toBe(true)
        if (!result.success) return
        expect(result.data).toMatchObject({
          members: [
            {
              displayName: "Ada Example",
              email: "ada@example.test",
              organizerGranted: true,
              preferredLoginName: "ada@example.test",
              zitadelUserId: "ada-id",
            },
          ],
          total: 1,
        })
      },
    )
  })
})

test("revokes only the organizer role and synchronizes the current provider roles", async () => {
  await withEnvironment(async () => {
    const t = convexTest(schema, modules)
    const adminSession = await legacyAdminSession(t)
    const now = new Date().toISOString()
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Organizer Example",
        organizerInvitedAt: now,
        role: "organizer",
        roleSource: "zitadel",
        zitadelRoles: ["organizer", "admin"],
        zitadelRolesSynchronizedAt: now,
        zitadelUserId: "zitadel-user-id",
        createdAt: now,
        updatedAt: now,
      })
      await ctx.db.insert("authAccounts", {
        createdAt: now,
        provider: "zitadel",
        providerAccountId: "zitadel-user-id",
        updatedAt: now,
        userId,
      })
    })
    const responses = [
      Response.json({
        user: {
          human: { email: { email: "organizer@example.test" }, profile: { displayName: "Organizer Example" } },
          id: "zitadel-user-id",
          preferredLoginName: "organizer@example.test",
          userName: "organizer",
        },
      }),
      Response.json({
        details: { totalResult: 1 },
        result: [
          {
            id: "grant-id",
            orgId: "organization-id",
            projectId: "project-id",
            roleKeys: ["admin", "organizer"],
            state: "USER_GRANT_STATE_ACTIVE",
            userId: "zitadel-user-id",
          },
        ],
      }),
      Response.json({}),
      Response.json({
        details: { totalResult: 1 },
        result: [
          {
            id: "grant-id",
            orgId: "organization-id",
            projectId: "project-id",
            roleKeys: ["admin"],
            state: "USER_GRANT_STATE_ACTIVE",
            userId: "zitadel-user-id",
          },
        ],
      }),
    ]
    let updateBody: unknown
    await withFetch(
      async (input, init) => {
        if (new URL(input).pathname.endsWith("/grant-id")) updateBody = await new Request(input, init).json()
        return responses.shift() ?? Response.json({})
      },
      async () => {
        const result = await t.action(api.auth.authAdminZitadelOrganizerGrantAction, {
          operation: "revoke",
          token: adminSession,
          zitadelUserId: "zitadel-user-id",
        })

        expect(result.success).toBe(true)
        expect(updateBody).toEqual({ roleKeys: ["admin"] })
        const localUser = await t.run(async (ctx) =>
          ctx.db
            .query("users")
            .withIndex("zitadelUserId", (q) => q.eq("zitadelUserId", "zitadel-user-id"))
            .unique(),
        )
        expect(localUser?.role).toBe("admin")
        expect(localUser?.organizerInvitedAt).toBeUndefined()
      },
    )
  })
})

test("rejects a provider admin after the current Zitadel grant has been revoked", async () => {
  await withEnvironment(async () => {
    const t = convexTest(schema, modules)
    const provider = {
      email: "admin@example.test",
      familyName: "Admin",
      givenName: "Provider",
      image: "",
      provider: "zitadel" as const,
      providerId: "provider-admin-id",
      username: "provider-admin",
      zitadelRoles: ["admin" as const],
    }
    const signedIn = await t.action(api.auth.authSignInUsingZitadelAction, {
      ...provider,
      zitadelRoleSyncProof: await zitadelRoleSyncProofCreate(provider),
    })
    expect(signedIn.success).toBe(true)
    if (!signedIn.success) return

    await withFetch(
      async () => Response.json({ details: { totalResult: 0 }, result: [] }),
      async () => {
        const result = await t.action(api.auth.authAdminZitadelMembersListAction, {
          search: "",
          token: signedIn.data.token,
        })
        expect(result.success).toBe(false)
      },
    )

    const currentUser = await t.run(async (ctx) =>
      ctx.db
        .query("users")
        .withIndex("zitadelUserId", (q) => q.eq("zitadelUserId", "provider-admin-id"))
        .unique(),
    )
    expect(currentUser?.role).toBe("customer")
  })
})

test("scheduled sync applies external organizer revocations to existing user records", async () => {
  await withEnvironment(async () => {
    const t = convexTest(schema, modules)
    const now = new Date().toISOString()
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Externally Revoked Organizer",
        organizerInvitedAt: now,
        role: "organizer",
        roleSource: "zitadel",
        zitadelRoles: ["organizer"],
        zitadelRolesSynchronizedAt: now,
        zitadelUserId: "externally-revoked-id",
        createdAt: now,
        updatedAt: now,
      }),
    )
    await withFetch(
      async () => Response.json({ details: { totalResult: 0 }, result: [] }),
      async () => {
        const result = await t.action(internal.auth.authZitadelRolesSynchronizeScheduledAction, {})
        expect(result.success).toBe(true)
      },
    )
    const user = await t.run(async (ctx) => ctx.db.get("users", userId))
    expect(user?.role).toBe("customer")
    expect(user?.zitadelRoles).toEqual([])
    expect(user?.organizerInvitedAt).toBeUndefined()
  })
})

test("verified customer downgrade survives cron and member reads, while verified admin survives access reads", async () => {
  await withEnvironment(async () => {
    const t = convexTest(schema, modules)
    const customerProvider = {
      provider: "zitadel" as const,
      providerId: "token-customer-id",
      username: "token-customer",
      zitadelRoleSyncEnabled: true,
    }
    const adminProvider = {
      provider: "zitadel" as const,
      providerId: "token-admin-id",
      username: "token-admin",
      zitadelRoleSyncEnabled: true,
      zitadelRoles: ["admin" as const],
    }
    const first = await t.action(api.auth.authSignInUsingZitadelAction, {
      ...customerProvider,
      zitadelRoles: ["admin"],
      zitadelRoleSyncProof: await zitadelRoleSyncProofCreate(
        { ...customerProvider, zitadelRoles: ["admin"] },
        "organization-id",
      ),
    })
    expect(first.success && first.data.profile.role).toBe("admin")
    const downgradedProvider = { ...customerProvider, zitadelRoles: [] }
    const downgraded = await t.action(api.auth.authSignInUsingZitadelAction, {
      ...downgradedProvider,
      zitadelRoleSyncProof: await zitadelRoleSyncProofCreate(downgradedProvider, "organization-id"),
    })
    expect(downgraded.success && downgraded.data.profile.role).toBe("customer")
    const admin = await t.action(api.auth.authSignInUsingZitadelAction, {
      ...adminProvider,
      zitadelRoleSyncProof: await zitadelRoleSyncProofCreate(adminProvider, "organization-id"),
    })
    expect(admin.success && admin.data.profile.role).toBe("admin")
    if (!downgraded.success || !admin.success) return

    const managementAdminGrant = {
      id: "grant-id",
      orgId: "organization-id",
      projectId: "project-id",
      roleKeys: ["admin"],
      state: "USER_GRANT_STATE_ACTIVE",
      userId: "token-customer-id",
    }
    await withFetch(
      async () => Response.json({ details: { totalResult: 1 }, result: [managementAdminGrant] }),
      async () => {
        const result = await t.action(internal.auth.authZitadelRolesSynchronizeScheduledAction, {})
        expect(result.success).toBe(true)
      },
    )
    const customerId = downgraded.data.profile.userId
    expect(await t.run((ctx) => ctx.db.get("users", customerId))).toMatchObject({
      role: "customer",
      roleSource: "zitadel",
      zitadelRoles: [],
      zitadelRolesFromIdToken: true,
    })

    const responses = [
      Response.json({ details: { totalResult: 0 }, result: [] }), // admin access: no management grant
      Response.json({
        details: { totalResult: 1 },
        result: [{ id: "token-customer-id", userName: "token-customer", preferredLoginName: "token-customer" }],
      }),
      Response.json({ details: { totalResult: 1 }, result: [managementAdminGrant] }),
    ]
    await withFetch(
      async () => responses.shift() ?? Response.json({}),
      async () => {
        const result = await t.action(api.auth.authAdminZitadelMembersListAction, { token: admin.data.token })
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.members[0]).toMatchObject({
            eventorenRole: "customer",
            zitadelRoles: ["admin"],
          })
        }
      },
    )
    expect(await t.run((ctx) => ctx.db.get("users", admin.data.profile.userId))).toMatchObject({
      role: "admin",
      zitadelRoles: ["admin"],
      zitadelRolesFromIdToken: true,
    })
    expect(await t.run((ctx) => ctx.db.get("users", customerId))).toMatchObject({
      role: "customer",
      zitadelRoles: [],
      zitadelRolesFromIdToken: true,
    })
  })
})

test("without verified ID-token sync, member reads still update local roles from grants", async () => {
  await withEnvironment(async () => {
    const t = convexTest(schema, modules)
    const token = await legacyAdminSession(t)
    const provider = {
      provider: "zitadel" as const,
      providerId: "legacy-member-id",
      username: "legacy-member",
      zitadelRoles: [],
    }
    const signedIn = await t.action(api.auth.authSignInUsingZitadelAction, {
      ...provider,
      zitadelRoleSyncProof: await zitadelRoleSyncProofCreate(provider),
    })
    expect(signedIn.success && signedIn.data.profile.role).toBe("customer")
    const responses = [
      Response.json({
        details: { totalResult: 1 },
        result: [{ id: "legacy-member-id", userName: "legacy-member", preferredLoginName: "legacy-member" }],
      }),
      Response.json({
        details: { totalResult: 1 },
        result: [
          {
            id: "grant-id",
            orgId: "organization-id",
            projectId: "project-id",
            roleKeys: ["organizer"],
            state: "USER_GRANT_STATE_ACTIVE",
            userId: "legacy-member-id",
          },
        ],
      }),
    ]
    await withFetch(
      async () => responses.shift() ?? Response.json({}),
      async () => {
        const result = await t.action(api.auth.authAdminZitadelMembersListAction, { token })
        expect(result.success).toBe(true)
        if (result.success) expect(result.data.members[0]?.eventorenRole).toBe("organizer")
      },
    )
  })
})

async function legacyAdminSession(t: ReturnType<typeof convexTest>): Promise<string> {
  const signedIn = await t.mutation(internal.auth.signInUsingSocialAuth3InternalMutation, {
    email: "admin@example.test",
    familyName: "Admin",
    givenName: "Test",
    image: "",
    provider: "dev",
    providerId: "test-admin",
    username: "test-admin",
  })
  if (!signedIn.success) throw new Error(signedIn.errorMessage)
  await t.run(async (ctx) => ctx.db.patch("users", signedIn.data.profile.userId, { role: "admin" }))
  return signedIn.data.token
}

async function withFetch(
  implementation: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  callback: () => Promise<void>,
) {
  const previous = globalThis.fetch
  globalThis.fetch = Object.assign(implementation, { preconnect: previous.preconnect })
  try {
    await callback()
  } finally {
    globalThis.fetch = previous
  }
}

async function withEnvironment(callback: () => Promise<void>) {
  const previous = {
    authSecret: process.env.AUTH_SECRET,
    issuer: process.env.ZITADEL_ISSUER,
    managementToken: process.env.ZITADEL_MANAGEMENT_TOKEN,
    organizationId: process.env.ZITADEL_ORGANIZATION_ID,
    projectId: process.env.ZITADEL_PROJECT_ID,
  }
  process.env.AUTH_SECRET = "eventoren-admin-role-test-secret"
  process.env.ZITADEL_ISSUER = "https://auth.example.test"
  process.env.ZITADEL_MANAGEMENT_TOKEN = "management-token"
  process.env.ZITADEL_ORGANIZATION_ID = "organization-id"
  process.env.ZITADEL_PROJECT_ID = "project-id"
  try {
    await callback()
  } finally {
    restore("AUTH_SECRET", previous.authSecret)
    restore("ZITADEL_ISSUER", previous.issuer)
    restore("ZITADEL_MANAGEMENT_TOKEN", previous.managementToken)
    restore("ZITADEL_ORGANIZATION_ID", previous.organizationId)
    restore("ZITADEL_PROJECT_ID", previous.projectId)
  }
}

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}
