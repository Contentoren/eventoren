/// <reference types="vite/client" />
import { type ApiFromModules, type FunctionReturnType, makeFunctionReference } from "convex/server"
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import schema from "../convex/schema.ts"
import * as overviewOperations from "../convex/organizerDashboardOverview.ts"
import * as exportOperations from "../convex/organizerDashboardExports.ts"
import * as publicOperations from "../convex/organizerDashboardPublic.ts"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const overviewModules = { ...import.meta.glob("../convex/**/*.ts") }
type OverviewApi = ApiFromModules<{
  organizerDashboardOverview: typeof overviewOperations
}>["organizerDashboardOverview"]
type ExportApi = ApiFromModules<{ organizerDashboardExports: typeof exportOperations }>["organizerDashboardExports"]
type PublicApi = ApiFromModules<{ organizerDashboardPublic: typeof publicOperations }>["organizerDashboardPublic"]

function overviewRef<K extends keyof OverviewApi>(key: K): OverviewApi[K] {
  return makeFunctionReference(`organizerDashboardOverview:${key}`) as OverviewApi[K]
}
function exportRef<K extends keyof ExportApi>(key: K): ExportApi[K] {
  return makeFunctionReference(`organizerDashboardExports:${key}`) as ExportApi[K]
}
function publicRef<K extends keyof PublicApi>(key: K): PublicApi[K] {
  return makeFunctionReference(`organizerDashboardPublic:${key}`) as PublicApi[K]
}

const overviewGet = overviewRef("organizerDashboardOverviewQuery")
const eventStatsGet = overviewRef("organizerDashboardEventStatsQuery")
const exportList = exportRef("organizerDashboardExportListQuery")
const publicProfileGet = publicRef("organizerDashboardPublicProfileQuery")
const publicEventGet = publicRef("organizerDashboardPublicEventQuery")

type OverviewData = Extract<FunctionReturnType<typeof overviewGet>, { success: true }>["data"]
type EventStatsData = Extract<FunctionReturnType<typeof eventStatsGet>, { success: true }>["data"]
type ExportData = Extract<FunctionReturnType<typeof exportList>, { success: true }>["data"]

const now = "2026-10-01T10:00:00.000Z"
const secret = "overview-exports-test-secret-only"
afterEach(() => vi.unstubAllEnvs())

async function seed() {
  vi.stubEnv("AUTH_SECRET", secret)
  const t = convexTest(schema, overviewModules)
  const ids = await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("orgs", { orgHandle: "a", name: "A", createdAt: now, updatedAt: now })
    const users = {} as Record<"inhaber" | "finanzen" | "einlass", Awaited<ReturnType<typeof ctx.db.insert<"users">>>>
    for (const role of ["inhaber", "finanzen", "einlass"] as const) {
      const userId = await ctx.db.insert("users", { name: role, role: "customer", createdAt: now, updatedAt: now })
      users[role] = userId
      await ctx.db.insert("orgMembers", {
        userId,
        orgId,
        orgHandle: "a",
        role: "member",
        organizerRole: role,
        invitedBy: userId,
        createdAt: now,
        updatedAt: now,
      })
    }
    await ctx.db.insert("organizerDashboardOrganizations", {
      orgId,
      status: "aktiv",
      profile: { name: "Org", slug: "org", kind: "verein" },
      tax: { status: "regel", defaultRateBps: 1900 },
      fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
      contracts: { termsAcceptedAt: now, dpaAcceptedAt: now },
      configurationConfirmed: true,
      createdAt: now,
      updatedAt: now,
    })
    const eventId = await ctx.db.insert("catalogEvents", {
      eventKey: "event-a",
      title: "Sommerfest",
      subtitle: "",
      description: "",
      category: "festival",
      startsAt: "2026-12-01T18:00:00.000Z",
      endsAt: "2026-12-01T22:00:00.000Z",
      doorsAt: "2026-12-01T17:00:00.000Z",
      venue: "Ort",
      city: "Berlin",
      address: "",
      organizer: "Org",
      imageUrl: "",
      imageAlt: "",
      tags: [],
      status: "published",
      orgId,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey: "standard",
      name: "Standard",
      description: "",
      priceCents: 1000,
      feeCents: 100,
      capacity: 100,
      reserved: 0,
      sold: 2,
      sortOrder: 0,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
    const orderId = await ctx.db.insert("ticketOrders", {
      checkoutKey: "overview_checkout",
      customerEmail: "buyer@example.org",
      contactSnapshotJson: "{}",
      checkoutContextJson: "{}",
      eventKey: "event-a",
      eventTitle: "Sommerfest",
      eventSubtitle: "",
      eventDescription: "",
      eventStartsAt: "2026-12-01T18:00:00.000Z",
      eventEndsAt: "2026-12-01T22:00:00.000Z",
      eventDoorsAt: "2026-12-01T17:00:00.000Z",
      venue: "Ort",
      city: "Berlin",
      address: "",
      organizer: "Org",
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      orgId,
      paymentReference: "overview_pay",
      stripeMode: "test" as const,
      status: "paid" as const,
      paymentStatus: "paid" as const,
      reservationExpiresAt: 1,
      subtotalCents: 2000,
      feeCents: 200,
      totalCents: 2200,
      createdAt: now,
      updatedAt: now,
      paidAt: now,
    })
    const ticketA = await ctx.db.insert("ticketIssued", {
      orderId,
      sequence: 1,
      code: "overview_ticket_1",
      eventKey: "event-a",
      eventTitle: "Sommerfest",
      eventStartsAt: "2026-12-01T18:00:00.000Z",
      eventDoorsAt: "2026-12-01T17:00:00.000Z",
      venue: "Ort",
      city: "Berlin",
      address: "",
      tierKey: "standard",
      tierName: "Standard",
      priceCents: 1000,
      feeCents: 100,
      participantName: "Lea Schneider",
      participantEmail: "lea.schneider@example.de",
      checkedInAt: now,
      issuedAt: now,
    })
    await ctx.db.insert("ticketIssued", {
      orderId,
      sequence: 2,
      code: "overview_ticket_2",
      eventKey: "event-a",
      eventTitle: "Sommerfest",
      eventStartsAt: "2026-12-01T18:00:00.000Z",
      eventDoorsAt: "2026-12-01T17:00:00.000Z",
      venue: "Ort",
      city: "Berlin",
      address: "",
      tierKey: "standard",
      tierName: "Standard",
      priceCents: 1000,
      feeCents: 100,
      participantName: "Max Frei",
      issuedAt: now,
    })
    await ctx.db.insert("ticketCheckInHistory", {
      ticketId: ticketA,
      orderId,
      eventKey: "event-a",
      ticketNumber: "overview_ticket_1",
      action: "check_in" as const,
      occurredAt: now,
      checkInAt: now,
      operatorName: "Team",
      participantName: "Lea Schneider",
      buyerName: "Buyer",
      buyerEmail: "buyer@example.org",
    })
    return { orgId, users }
  })
  const tokens = {
    inhaber: await testAuthSessionTokenCreate(t, ids.users.inhaber, secret),
    finanzen: await testAuthSessionTokenCreate(t, ids.users.finanzen, secret),
    einlass: await testAuthSessionTokenCreate(t, ids.users.einlass, secret),
  }
  return { t, ...ids, tokens }
}

test("overview aggregates Berlin buckets with occupancy and null deltas", async () => {
  const s = await seed()
  const result = await s.t.query(overviewGet, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    fromDay: "2026-09-25",
    toDay: "2026-10-01",
  })
  expect(result.success).toBe(true)
  if (!result.success) return
  const data = result.data as OverviewData
  expect(data.revenueCents).toBe(2000)
  expect(data.tickets).toBe(2)
  expect(data.orders).toBe(1)
  expect(data.avgOrderCents).toBe(2000)
  expect(data.occupancyBps).toBe(200)
  expect(data.deltas).toEqual({ revenue: null, tickets: null, orders: null, avgOrder: null })
  expect(data.series.find((point) => point.day === "2026-10-01")).toMatchObject({
    revenueCents: 2000,
    tickets: 2,
    orders: 1,
  })
  expect(data.events).toHaveLength(1)
})

test("overview without umsatz.sehen is refused", async () => {
  const s = await seed()
  const result = await s.t.query(overviewGet, { token: s.tokens.einlass, orgId: s.orgId })
  expect(result.success).toBe(false)
})

test("event stats read live tiers, check-ins and occupancy", async () => {
  const s = await seed()
  const result = await s.t.query(eventStatsGet, { token: s.tokens.inhaber, orgId: s.orgId, eventKey: "event-a" })
  expect(result.success).toBe(true)
  if (!result.success) return
  const data = result.data as EventStatsData
  expect(data.revenueCents).toBe(2000)
  expect(data.tickets).toBe(2)
  expect(data.checkedIn).toBe(1)
  expect(data.capacity).toBe(100)
  expect(data.occupancyBps).toBe(200)
  expect(data.byTier).toHaveLength(1)
  expect(data.byTier[0]).toMatchObject({ tierKey: "standard", sold: 2, checkedIn: 1 })
})

test("export teilnehmer needs bestellungen.sehen and paginates", async () => {
  const s = await seed()
  const denied = await s.t.query(exportList, {
    token: s.tokens.einlass,
    orgId: s.orgId,
    eventKey: "event-a",
    kind: "teilnehmer",
    paginationOpts: { numItems: 50, cursor: null },
  })
  expect(denied.success).toBe(false)
  const result = await s.t.query(exportList, {
    token: s.tokens.finanzen,
    orgId: s.orgId,
    eventKey: "event-a",
    kind: "teilnehmer",
    paginationOpts: { numItems: 1, cursor: null },
  })
  expect(result.success).toBe(true)
  if (!result.success) return
  const data = result.data as ExportData
  expect(data.header[0]).toBe("Name")
  expect(data.rows).toHaveLength(1)
  expect(data.isDone).toBe(false)
  const next = await s.t.query(exportList, {
    token: s.tokens.finanzen,
    orgId: s.orgId,
    eventKey: "event-a",
    kind: "teilnehmer",
    paginationOpts: { numItems: 50, cursor: data.continueCursor },
  })
  expect(next.success).toBe(true)
  if (!next.success) return
  expect((next.data as ExportData).rows).toHaveLength(1)
  expect((next.data as ExportData).isDone).toBe(true)
})

test("export checkins needs einlass.nutzen", async () => {
  const s = await seed()
  const denied = await s.t.query(exportList, {
    token: s.tokens.finanzen,
    orgId: s.orgId,
    eventKey: "event-a",
    kind: "checkins",
    paginationOpts: { numItems: 50, cursor: null },
  })
  expect(denied.success).toBe(false)
  const result = await s.t.query(exportList, {
    token: s.tokens.einlass,
    orgId: s.orgId,
    eventKey: "event-a",
    kind: "checkins",
    paginationOpts: { numItems: 50, cursor: null },
  })
  expect(result.success).toBe(true)
  if (!result.success) return
  const data = result.data as ExportData
  expect(data.header[0]).toBe("Ticketcode")
  expect(data.rows).toHaveLength(1)
})

test("public profile and event read live data without token", async () => {
  const s = await seed()
  const profile = await s.t.query(publicProfileGet, { orgSlug: "org" })
  expect(profile.success).toBe(true)
  if (!profile.success) return
  expect(profile.data.name).toBe("Org")
  expect(profile.data.events).toHaveLength(1)
  expect(profile.data.events[0]?.eventKey).toBe("event-a")
  const missing = await s.t.query(publicProfileGet, { orgSlug: "unbekannt" })
  expect(missing.success).toBe(false)
  const event = await s.t.query(publicEventGet, { orgSlug: "org", eventKey: "event-a" })
  expect(event.success).toBe(true)
  if (!event.success) return
  expect(event.data.title).toBe("Sommerfest")
  expect(event.data.tiers).toHaveLength(1)
  expect(event.data.tiers[0]).toMatchObject({ tierKey: "standard", sold: 2 })
  const foreign = await s.t.query(publicEventGet, { orgSlug: "org", eventKey: "gibt-es-nicht" })
  expect(foreign.success).toBe(false)
})
