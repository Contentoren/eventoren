import { organizerContractDocuments } from "#src/organizer/dashboard/contracts/organizerContractDocuments.ts"
/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
afterEach(() => vi.unstubAllEnvs())

test("retiring a sold ticket type preserves organizer history while excluding the type from public sale", async () => {
  const secret = "archived-tier-test-secret"
  vi.stubEnv("AUTH_SECRET", secret)
  const t = convexTest(schema, modules)
  const now = "2026-10-20T00:00:00.000Z"
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", { name: "Owner", role: "customer", createdAt: now, updatedAt: now }),
  )
  const token = await testAuthSessionTokenCreate(t, userId, secret)
  const organization = await t.mutation(api.organizerDashboard.organizerDashboardOrganizationCreateMutation, {
    token,
    name: "History",
    slug: "archived-tier-history",
    kind: "verein",
    termsRevision: organizerContractDocuments.terms.revision,
    dpaRevision: organizerContractDocuments.dpa.revision,
    termsAccepted: true,
    dpaAccepted: true,
  })
  if (!organization.success) throw new Error(organization.errorMessage)
  const orgId = organization.data.orgId
  const created = await t.mutation(api.organizerDashboardEvents.organizerDashboardEventCreateMutation, {
    token,
    orgId,
    title: "History event",
    category: "konzert",
    subtitle: "",
    description: "",
    venue: "Hall",
    city: "Berlin",
    startsAt: "2027-10-20T18:00:00.000Z",
    endsAt: "2027-10-20T22:00:00.000Z",
    doorsAt: "2027-10-20T17:30:00.000Z",
    address: "",
    organizer: "History",
    imageUrl: "https://example.org/image.webp",
    imageAlt: "Stage",
  })
  if (!created.success) throw new Error(created.errorMessage)
  const eventKey = created.data.eventKey
  const tier = await t.mutation(api.organizerDashboardEvents.organizerDashboardTierUpsertMutation, {
    token,
    orgId,
    eventKey,
    name: "Early bird",
    description: "",
    priceCents: 2100,
    capacity: 100,
  })
  if (!tier.success) throw new Error(tier.errorMessage)
  await t.run(async (ctx) => {
    const row = await ctx.db
      .query("catalogTicketTiers")
      .filter((q) => q.eq(q.field("tierKey"), tier.data.tierKey))
      .first()
    if (!row) throw new Error("Missing test tier")
    await ctx.db.patch("catalogTicketTiers", row._id, { sold: 8 })
  })
  const archived = await t.mutation(api.organizerDashboardEvents.organizerDashboardTierArchiveMutation, {
    token,
    orgId,
    eventKey,
    tierKey: tier.data.tierKey,
  })
  expect(archived.success).toBe(true)
  const detail = await t.query(api.organizerDashboardEvents.organizerDashboardEventGetQuery, { token, orgId, eventKey })
  expect(detail.success).toBe(true)
  if (!detail.success) return
  expect(detail.data.tiers).toMatchObject([{ tierKey: tier.data.tierKey, sold: 8, available: 0 }])
  expect(detail.data.tiers[0]?.archivedAt).toBeTruthy()
  expect(detail.data.tiers[0]?.priceCents).toBe(2100)
  await t.run(async (ctx) => {
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
      .unique()
    if (!event) throw new Error("Missing test event")
    await ctx.db.patch("catalogEvents", event._id, { status: "published" })
  })
  const publicEvent = await t.query(api.catalog.catalogEventGetPublishedQuery, { eventKey })
  expect(publicEvent?.tiers.some((item) => item.id === tier.data.tierKey)).toBe(false)
})
