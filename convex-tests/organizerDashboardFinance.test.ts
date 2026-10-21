/// <reference types="vite/client" />
import { type ApiFromModules, type FunctionReturnType, makeFunctionReference } from "convex/server"
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import schema from "../convex/schema.ts"
import * as operations from "../convex/organizerDashboardFinance.ts"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = { ...import.meta.glob("../convex/**/*.ts") }
type Api = ApiFromModules<{ organizerDashboardFinance: typeof operations }>["organizerDashboardFinance"]
function ref<K extends keyof Api>(key: K): Api[K] {
  return makeFunctionReference(`organizerDashboardFinance:${key}`) as Api[K]
}
const overview = ref("organizerDashboardFinanceOverviewQuery")
const settlement = ref("organizerDashboardSettlementGetQuery")
const payoutList = ref("organizerDashboardPayoutListQuery")
const payoutRecord = ref("organizerDashboardPayoutRecordMutation")

type OverviewData = Extract<FunctionReturnType<typeof overview>, { success: true }>["data"]

const now = "2026-10-01T10:00:00.000Z"
const secret = "finance-test-secret-only"
afterEach(() => vi.unstubAllEnvs())

async function seed() {
  vi.stubEnv("AUTH_SECRET", secret)
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("orgs", { orgHandle: "a", name: "A", createdAt: now, updatedAt: now })
    const otherOrg = await ctx.db.insert("orgs", { orgHandle: "b", name: "B", createdAt: now, updatedAt: now })
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
      startsAt: now,
      endsAt: now,
      doorsAt: now,
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
      sold: 3,
      sortOrder: 0,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
    const orderBase = {
      checkoutKey: "finance_checkout",
      customerEmail: "buyer@example.org",
      contactSnapshotJson: "{}",
      checkoutContextJson: "{}",
      eventKey: "event-a",
      eventTitle: "Sommerfest",
      eventSubtitle: "",
      eventDescription: "",
      eventStartsAt: now,
      eventEndsAt: now,
      eventDoorsAt: now,
      venue: "Ort",
      city: "Berlin",
      address: "",
      organizer: "Org",
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      orgId,
      paymentReference: "finance_pay",
      stripeMode: "test" as const,
      status: "paid" as const,
      paymentStatus: "paid" as const,
      reservationExpiresAt: 1,
      createdAt: now,
      updatedAt: now,
      paidAt: now,
    }
    const orderA = await ctx.db.insert("ticketOrders", {
      ...orderBase,
      checkoutKey: "finance_checkout_a",
      subtotalCents: 2000,
      feeCents: 200,
      totalCents: 2200,
    })
    await ctx.db.insert("ticketOrders", {
      ...orderBase,
      checkoutKey: "finance_checkout_b",
      subtotalCents: 1500,
      feeCents: 150,
      totalCents: 1650,
      cancellation: {
        cancelledAt: now,
        organizationId: String(orgId),
        eventKey: "event-a",
        orderReference: "finance_b",
        paymentReference: "finance_pay_b",
        stripeMode: "test",
        paymentMethodType: "sepa_debit",
        stripeEventId: "evt_test",
        stripeSessionId: "sess_test",
        stripePaymentIntentId: "pi_test",
        reason: "sepa_disputed",
        stripeEventType: "charge.dispute.created",
        stripeChargeId: "ch_test",
        stripeDisputeId: "dp_test",
      },
    })
    for (const [orderId, sequence] of [
      [orderA, 1],
      [orderA, 2],
    ] as const) {
      await ctx.db.insert("ticketIssued", {
        orderId,
        sequence,
        code: `finance_ticket_${sequence}`,
        eventKey: "event-a",
        eventTitle: "Sommerfest",
        eventStartsAt: now,
        eventDoorsAt: now,
        venue: "Ort",
        city: "Berlin",
        address: "",
        tierKey: "standard",
        tierName: "Standard",
        priceCents: 1000,
        feeCents: 100,
        participantName: "Holder",
        ...(sequence === 1 ? { checkedInAt: now } : {}),
        issuedAt: now,
      })
    }
    return { orgId, otherOrg, users, eventId }
  })
  const tokens = {
    inhaber: await testAuthSessionTokenCreate(t, ids.users.inhaber, secret),
    finanzen: await testAuthSessionTokenCreate(t, ids.users.finanzen, secret),
    einlass: await testAuthSessionTokenCreate(t, ids.users.einlass, secret),
  }
  return { t, ...ids, tokens }
}

test("finance overview aggregates integer-cent totals with Berlin day buckets", async () => {
  const s = await seed()
  const result = await s.t.query(overview, {
    token: s.tokens.finanzen,
    orgId: s.orgId,
    fromDay: "2026-09-01",
    toDay: "2026-10-31",
  })
  expect(result.success).toBe(true)
  if (!result.success) return
  const data = result.data as OverviewData
  expect(data.paidOrders).toBe(2)
  expect(data.grossCents).toBe(3500)
  expect(data.feeCents).toBe(350)
  expect(data.disputeCents).toBe(1650)
  expect(data.payoutCents).toBe(1500)
  expect(data.tickets).toBe(2)
  expect(data.checkedIn).toBe(1)
  expect(data.events).toHaveLength(1)
  expect(data.events[0]).toMatchObject({ eventKey: "event-a", capacity: 100, remainingPayoutCents: 1500 })
  const day = data.salesCurve.find((point) => point.day === "2026-10-01")
  expect(day).toMatchObject({ grossCents: 3500, tickets: 2 })
})

test("finance overview requires the finance permission", async () => {
  const s = await seed()
  const denied = await s.t.query(overview, { token: s.tokens.einlass, orgId: s.orgId })
  expect(denied.success).toBe(false)
})

test("settlement exposes per-event accounting and payout recording guards the remainder", async () => {
  const s = await seed()
  const base = { token: s.tokens.finanzen, orgId: s.orgId, eventKey: "event-a" }
  const before = await s.t.query(settlement, base)
  expect(before.success).toBe(true)
  if (!before.success) return
  expect(before.data).toMatchObject({ grossCents: 3500, payoutCents: 1500, remainingPayoutCents: 1500 })

  const recorded = await s.t.mutation(payoutRecord, { ...base, amountCents: 1000, note: "Teil 1" })
  expect(recorded.success).toBe(true)

  const over = await s.t.mutation(payoutRecord, { ...base, amountCents: 600 })
  expect(over.success).toBe(false)

  const bad = await s.t.mutation(payoutRecord, { ...base, amountCents: 0 })
  expect(bad.success).toBe(false)

  const after = await s.t.query(settlement, base)
  expect(after.success).toBe(true)
  if (!after.success) return
  expect(after.data).toMatchObject({ recordedPayoutsCents: 1000, remainingPayoutCents: 500 })

  const listed = await s.t.query(payoutList, {
    token: s.tokens.finanzen,
    orgId: s.orgId,
    paginationOpts: { numItems: 10, cursor: null },
  })
  expect(listed.success).toBe(true)
  if (!listed.success) return
  expect(listed.data.page).toHaveLength(1)
  expect(listed.data.page[0]).toMatchObject({ eventKey: "event-a", amountCents: 1000, status: "vorgemerkt" })
})

test("settlement refuses foreign events and payout recording needs finance rights", async () => {
  const s = await seed()
  const foreign = await s.t.query(settlement, { token: s.tokens.finanzen, orgId: s.otherOrg, eventKey: "event-a" })
  expect(foreign.success).toBe(false)
  const denied = await s.t.mutation(payoutRecord, {
    token: s.tokens.einlass,
    orgId: s.orgId,
    eventKey: "event-a",
    amountCents: 100,
  })
  expect(denied.success).toBe(false)
})
