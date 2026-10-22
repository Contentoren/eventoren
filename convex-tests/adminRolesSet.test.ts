/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"

const modules = import.meta.glob("../convex/**/*.ts")

test("sets multiple project roles through Management v1 and synchronizes the local record", async () => {
  await withEnvironment(async () => {
    const t = convexTest(schema, modules)
    const adminSession = await legacyAdminSession(t)
    const responses = [
      Response.json({
        user: {
          human: { email: { email: "member@example.test" }, profile: { displayName: "Member Example" } },
          id: "zitadel-user-id",
          preferredLoginName: "member@example.test",
          userName: "member",
        },
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
            roleKeys: ["admin", "organizer"],
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
        const result = await t.action(api.auth.authAdminZitadelRolesSetAction, {
          roles: ["admin", "organizer"],
          token: adminSession,
          zitadelUserId: "zitadel-user-id",
        })

        expect(result.success).toBe(true)
        if (!result.success) return
        expect(result.data.roles).toEqual(["admin", "organizer"])
        expect(result.data.organizerGranted).toBe(true)
        expect(updateBody).toEqual({ roleKeys: ["admin", "organizer"] })
        const localUser = await t.run(async (ctx) =>
          ctx.db
            .query("users")
            .withIndex("zitadelUserId", (q) => q.eq("zitadelUserId", "zitadel-user-id"))
            .unique(),
        )
        expect(localUser?.role).toBe("admin")
        expect(localUser?.zitadelRoles).toEqual(["admin", "organizer"])
        expect(localUser?.organizerInvitedAt).toBeDefined()
      },
    )
  })
})

test("rejects an empty role set without touching Zitadel", async () => {
  await withEnvironment(async () => {
    const t = convexTest(schema, modules)
    const adminSession = await legacyAdminSession(t)
    let fetchCalls = 0
    await withFetch(
      async () => {
        fetchCalls += 1
        return Response.json({})
      },
      async () => {
        const result = await t.action(api.auth.authAdminZitadelRolesSetAction, {
          roles: [],
          token: adminSession,
          zitadelUserId: "zitadel-user-id",
        })

        expect(result.success).toBe(false)
        expect(fetchCalls).toBe(0)
      },
    )
  })
})

test("refuses to remove the last admin role of the project", async () => {
  await withEnvironment(async () => {
    const t = convexTest(schema, modules)
    const adminSession = await legacyAdminSession(t)
    const adminGrant = {
      id: "grant-id",
      orgId: "organization-id",
      projectId: "project-id",
      roleKeys: ["admin", "organizer"],
      state: "USER_GRANT_STATE_ACTIVE",
      userId: "zitadel-user-id",
    }
    const responses = [
      Response.json({
        user: {
          human: { email: { email: "admin@example.test" }, profile: { displayName: "Admin Example" } },
          id: "zitadel-user-id",
          preferredLoginName: "admin@example.test",
          userName: "admin",
        },
      }),
      Response.json({ details: { totalResult: 1 }, result: [adminGrant] }),
      Response.json({ details: { totalResult: 1 }, result: [adminGrant] }),
    ]
    await withFetch(
      async () => responses.shift() ?? Response.json({}),
      async () => {
        const result = await t.action(api.auth.authAdminZitadelRolesSetAction, {
          roles: ["organizer"],
          token: adminSession,
          zitadelUserId: "zitadel-user-id",
        })

        expect(result.success).toBe(false)
        if (result.success) return
        expect(result.errorMessage).toContain("last admin")
      },
    )
  })
})

test("removes the admin role when another project admin remains", async () => {
  await withEnvironment(async () => {
    const t = convexTest(schema, modules)
    const adminSession = await legacyAdminSession(t)
    const ownGrant = {
      id: "grant-id",
      orgId: "organization-id",
      projectId: "project-id",
      roleKeys: ["admin"],
      state: "USER_GRANT_STATE_ACTIVE",
      userId: "zitadel-user-id",
    }
    const otherAdminGrant = {
      id: "other-grant-id",
      orgId: "organization-id",
      projectId: "project-id",
      roleKeys: ["admin"],
      state: "USER_GRANT_STATE_ACTIVE",
      userId: "other-user-id",
    }
    const responses = [
      Response.json({
        user: {
          human: { email: { email: "admin@example.test" }, profile: { displayName: "Admin Example" } },
          id: "zitadel-user-id",
          preferredLoginName: "admin@example.test",
          userName: "admin",
        },
      }),
      Response.json({ details: { totalResult: 1 }, result: [ownGrant] }),
      Response.json({ details: { totalResult: 2 }, result: [ownGrant, otherAdminGrant] }),
      Response.json({}),
      Response.json({
        details: { totalResult: 1 },
        result: [{ ...ownGrant, roleKeys: ["organizer"] }],
      }),
    ]
    let updateBody: unknown
    await withFetch(
      async (input, init) => {
        if (new URL(input).pathname.endsWith("/grant-id")) updateBody = await new Request(input, init).json()
        return responses.shift() ?? Response.json({})
      },
      async () => {
        const result = await t.action(api.auth.authAdminZitadelRolesSetAction, {
          roles: ["organizer"],
          token: adminSession,
          zitadelUserId: "zitadel-user-id",
        })

        expect(result.success).toBe(true)
        expect(updateBody).toEqual({ roleKeys: ["organizer"] })
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
  process.env.AUTH_SECRET = "eventoren-admin-roles-set-test-secret"
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
