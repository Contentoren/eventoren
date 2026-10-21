import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { organizerDashboardGuestReferences } from "#src/organizer/dashboard/api/organizerDashboardGuestReferences.ts"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "eventoren-auth-convex-test-secret"
process.env.AUTH_SECRET = authSecret
const now = "2026-10-21T00:00:00.000Z"

const guestApi = { organizerDashboardGuests: organizerDashboardGuestReferences }

type GuestRole = "inhaber" | "admin" | "eventmanager" | "finanzen" | "einlass"

async function guestFixture() {
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("orgs", {
      orgHandle: "guest-org",
      name: "Guest Org",
      createdAt: now,
      updatedAt: now,
    })
    const otherOrg = await ctx.db.insert("orgs", {
      orgHandle: "guest-other",
      name: "Guest Other",
      createdAt: now,
      updatedAt: now,
    })
    const users = {} as Record<GuestRole, Id<"users">>
    for (const role of ["inhaber", "admin", "eventmanager", "finanzen", "einlass"] as const) {
      const userId = await ctx.db.insert("users", { name: role, role: "customer", createdAt: now, updatedAt: now })
      users[role] = userId
      await ctx.db.insert("orgMembers", {
        userId,
        orgId,
        orgHandle: "guest-org",
        role: "member",
        organizerRole: role,
        invitedBy: userId,
        createdAt: now,
        updatedAt: now,
      })
    }
    for (const id of [orgId, otherOrg]) {
      await ctx.db.insert("organizerDashboardOrganizations", {
        orgId: id,
        status: "aktiv",
        profile: { name: "Org", slug: "org", kind: "verein" },
        tax: { status: "regel", defaultRateBps: 1900 },
        fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
        configurationConfirmed: true,
        contracts: {},
        createdAt: now,
        updatedAt: now,
      })
    }
    const eventData = {
      title: "Guest Event",
      subtitle: "",
      description: "",
      category: "konzert",
      startsAt: "2026-11-21T19:00:00.000Z",
      endsAt: "2026-11-21T23:00:00.000Z",
      doorsAt: "2026-11-21T18:00:00.000Z",
      venue: "Halle",
      city: "Berlin",
      address: "",
      organizer: "Org",
      imageUrl: "",
      imageAlt: "",
      tags: [],
      status: "published" as const,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    }
    await ctx.db.insert("catalogEvents", { ...eventData, orgId, eventKey: "guest-event" })
    await ctx.db.insert("catalogEvents", { ...eventData, orgId: otherOrg, eventKey: "guest-other-event" })
    return { orgId, otherOrg, users }
  })
  const tokens = {} as Record<GuestRole, string>
  for (const role of ["inhaber", "admin", "eventmanager", "finanzen", "einlass"] as const) {
    tokens[role] = await testAuthSessionTokenCreate(t, ids.users[role], authSecret)
  }
  return { t, ...ids, tokens }
}

test("quota upsert/list enforces the gaesteliste permission and foreign events stay out of scope", async () => {
  const s = await guestFixture()
  const base = { token: s.tokens.inhaber, orgId: s.orgId, eventKey: "guest-event" }
  const created = await s.t.mutation(guestApi.organizerDashboardGuests.organizerDashboardGuestQuotaUpsertMutation, {
    ...base,
    name: "Presse",
    limit: 10,
  })
  expect(created.success).toBe(true)
  const denied = await s.t.mutation(guestApi.organizerDashboardGuests.organizerDashboardGuestQuotaUpsertMutation, {
    ...base,
    token: s.tokens.finanzen,
    name: "Presse",
    limit: 10,
  })
  expect(denied.success).toBe(false)
  const foreign = await s.t.mutation(guestApi.organizerDashboardGuests.organizerDashboardGuestQuotaUpsertMutation, {
    ...base,
    eventKey: "guest-other-event",
    name: "Presse",
    limit: 10,
  })
  expect(foreign.success).toBe(false)
  const listed = await s.t.query(guestApi.organizerDashboardGuests.organizerDashboardGuestQuotaListQuery, base)
  expect(listed.success).toBe(true)
  if (!listed.success) return
  expect(listed.data.quotas).toHaveLength(1)
  expect(listed.data.quotas[0]).toMatchObject({ name: "Presse", limit: 10, seats: 0, guests: 0 })
})

test("guest plusOnes beyond 5 are refused and a full quota blocks new seats", async () => {
  const s = await guestFixture()
  const base = { token: s.tokens.inhaber, orgId: s.orgId, eventKey: "guest-event" }
  const quota = await s.t.mutation(guestApi.organizerDashboardGuests.organizerDashboardGuestQuotaUpsertMutation, {
    ...base,
    name: "Klein",
    limit: 2,
  })
  expect(quota.success).toBe(true)
  if (!quota.success) return
  const tooMany = await s.t.mutation(guestApi.organizerDashboardGuests.organizerDashboardGuestUpsertMutation, {
    ...base,
    name: "Gast",
    plusOnes: 6,
  })
  expect(tooMany.success).toBe(false)
  const first = await s.t.mutation(guestApi.organizerDashboardGuests.organizerDashboardGuestUpsertMutation, {
    ...base,
    quotaId: quota.data.quotaId,
    name: "Gast",
    plusOnes: 1,
  })
  expect(first.success).toBe(true)
  const full = await s.t.mutation(guestApi.organizerDashboardGuests.organizerDashboardGuestUpsertMutation, {
    ...base,
    quotaId: quota.data.quotaId,
    name: "Gast 2",
    plusOnes: 0,
  })
  expect(full.success).toBe(false)
})

test("ticket send creates a free gaesteliste order and check-in state is durable", async () => {
  const s = await guestFixture()
  const base = { token: s.tokens.inhaber, orgId: s.orgId, eventKey: "guest-event" }
  const guest = await s.t.mutation(guestApi.organizerDashboardGuests.organizerDashboardGuestUpsertMutation, {
    ...base,
    name: "Mara",
    plusOnes: 1,
  })
  expect(guest.success).toBe(true)
  if (!guest.success) return
  const guestId = guest.data.guestId as Id<"organizerDashboardGuests">
  const sent = await s.t.mutation(guestApi.organizerDashboardGuests.organizerDashboardGuestTicketSendMutation, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    guestId,
  })
  expect(sent.success).toBe(true)
  if (!sent.success) return
  expect(sent.data.tickets).toBe(2)
  const stored = await s.t.run(async (ctx) => {
    const order = await ctx.db.get("ticketOrders", sent.data.orderId as Id<"ticketOrders">)
    const tickets = await ctx.db
      .query("ticketIssued")
      .withIndex("orderIdAndSequence", (q) => q.eq("orderId", sent.data.orderId as Id<"ticketOrders">))
      .collect()
    return { order, tickets }
  })
  expect(stored.order?.totalCents).toBe(0)
  expect(stored.order?.status).toBe("paid")
  expect(JSON.parse(stored.order?.checkoutContextJson ?? "{}").channel).toBe("gaesteliste")
  expect(stored.tickets).toHaveLength(2)
  const again = await s.t.mutation(guestApi.organizerDashboardGuests.organizerDashboardGuestTicketSendMutation, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    guestId,
  })
  expect(again.success).toBe(false)
  const checkIn = await s.t.mutation(guestApi.organizerDashboardGuests.organizerDashboardGuestCheckInMutation, {
    token: s.tokens.einlass,
    orgId: s.orgId,
    guestId,
    entrance: "Haupteingang",
  })
  expect(checkIn.success).toBe(true)
  const listed = await s.t.query(guestApi.organizerDashboardGuests.organizerDashboardGuestListQuery, base)
  expect(listed.success).toBe(true)
  if (!listed.success) return
  expect(listed.data.guests[0]).toMatchObject({ name: "Mara", ticketSent: true, entrance: "Haupteingang" })
  expect(listed.data.guests[0]?.checkedInAt).not.toBeNull()
  const undo = await s.t.mutation(guestApi.organizerDashboardGuests.organizerDashboardGuestCheckInUndoMutation, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    guestId,
  })
  expect(undo.success).toBe(true)
  const relisted = await s.t.query(guestApi.organizerDashboardGuests.organizerDashboardGuestListQuery, base)
  expect(relisted.success).toBe(true)
  if (!relisted.success) return
  expect(relisted.data.guests[0]?.checkedInAt).toBeNull()
})

test("occupied quotas and ticketed guests cannot be deleted", async () => {
  const s = await guestFixture()
  const base = { token: s.tokens.inhaber, orgId: s.orgId, eventKey: "guest-event" }
  const quota = await s.t.mutation(guestApi.organizerDashboardGuests.organizerDashboardGuestQuotaUpsertMutation, {
    ...base,
    name: "Band",
    limit: 10,
  })
  expect(quota.success).toBe(true)
  if (!quota.success) return
  const quotaId = quota.data.quotaId as Id<"organizerDashboardGuestQuotas">
  const guest = await s.t.mutation(guestApi.organizerDashboardGuests.organizerDashboardGuestUpsertMutation, {
    ...base,
    quotaId: String(quotaId),
    name: "Gast",
    plusOnes: 0,
  })
  expect(guest.success).toBe(true)
  if (!guest.success) return
  const quotaDelete = await s.t.mutation(guestApi.organizerDashboardGuests.organizerDashboardGuestQuotaDeleteMutation, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    quotaId,
  })
  expect(quotaDelete.success).toBe(false)
  const guestId = guest.data.guestId as Id<"organizerDashboardGuests">
  await s.t.mutation(guestApi.organizerDashboardGuests.organizerDashboardGuestTicketSendMutation, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    guestId,
  })
  const guestDelete = await s.t.mutation(guestApi.organizerDashboardGuests.organizerDashboardGuestDeleteMutation, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    guestId,
  })
  expect(guestDelete.success).toBe(false)
})
