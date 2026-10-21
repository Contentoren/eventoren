import { organizerContractDocuments } from "#src/organizer/dashboard/contracts/organizerContractDocuments.ts"
/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
afterEach(() => vi.unstubAllEnvs())

async function contextCreate() {
  const secret = "dashboard-authorization-edge-test-secret"
  vi.stubEnv("AUTH_SECRET", secret)
  const t = convexTest(schema, modules)
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      name: "Owner",
      role: "customer",
      createdAt: "2026-10-20T00:00:00.000Z",
      updatedAt: "2026-10-20T00:00:00.000Z",
    }),
  )
  const token = await testAuthSessionTokenCreate(t, userId, secret)
  const created = await t.mutation(api.organizerDashboard.organizerDashboardOrganizationCreateMutation, {
    token,
    name: "Original organization",
    slug: "authorization-edge",
    kind: "verein",
    termsRevision: organizerContractDocuments.terms.revision,
    dpaRevision: organizerContractDocuments.dpa.revision,
    termsAccepted: true,
    dpaAccepted: true,
  })
  if (!created.success) throw new Error(created.errorMessage)
  return { t, token, userId, orgId: created.data.orgId }
}

test("duplicate legacy memberships return a denied Result rather than throwing or choosing an arbitrary role", async () => {
  const { t, token, orgId } = await contextCreate()
  await t.run(async (ctx) => {
    const membership = await ctx.db
      .query("orgMembers")
      .withIndex("orgId", (q) => q.eq("orgId", orgId))
      .first()
    if (!membership) throw new Error("Missing test membership")
    const { _id: _id, _creationTime: _creationTime, ...fields } = membership
    await ctx.db.insert("orgMembers", { ...fields, organizerRole: "einlass" })
  })
  const result = await t.query(api.organizerDashboard.organizerDashboardContextQuery, { token, orgId })
  expect(result.success).toBe(false)
  if (result.success) return
  expect(result.errorMessage).toContain("ambiguous")
})

test("renaming an organization updates both the canonical organization and live context projection", async () => {
  const { t, token, orgId } = await contextCreate()
  const result = await t.mutation(api.organizerDashboard.organizerDashboardOrganizationUpdateMutation, {
    token,
    orgId,
    name: "Renamed organization",
  })
  expect(result.success).toBe(true)
  const context = await t.query(api.organizerDashboard.organizerDashboardContextQuery, { token, orgId })
  expect(context.success).toBe(true)
  if (!context.success) return
  expect(context.data.organizations[0]?.name).toBe("Renamed organization")
  expect(context.data.activeOrganization?.profile.name).toBe("Renamed organization")
  expect(await t.run((ctx) => ctx.db.get("orgs", orgId))).toMatchObject({ name: "Renamed organization" })
})
