/// <reference types="vite/client" />
import { type ApiFromModules, type FunctionReturnType, makeFunctionReference } from "convex/server"
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import schema from "../convex/schema.ts"
import * as operations from "../convex/organizerDashboardBoxOffice.ts"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = { ...import.meta.glob("../convex/**/*.ts") }
type Api = ApiFromModules<{ organizerDashboardBoxOffice: typeof operations }>["organizerDashboardBoxOffice"]
function ref<K extends keyof Api>(key: K): Api[K] {
  return makeFunctionReference(`organizerDashboardBoxOffice:${key}`) as Api[K]
}
const create = ref("organizerDashboardBoxOfficeSaleCreateMutation")
const get = ref("organizerDashboardBoxOfficeSaleGetQuery")
const list = ref("organizerDashboardBoxOfficeSaleListQuery")
const cancel = ref("organizerDashboardBoxOfficeSaleCancelMutation")
const testPay = ref("organizerDashboardBoxOfficeSaleTestPayMutation")
const complete = ref("organizerDashboardBoxOfficeSaleCompleteMutation")
const devicePay = ref("organizerDashboardBoxOfficeSaleTestDevicePayMutation")
const publicGet = ref("organizerDashboardBoxOfficeSalePublicGetQuery")
const now = "2026-10-01T10:00:00.000Z"
const secret = "boxoffice-test-secret-only"
afterEach(() => vi.unstubAllEnvs())

async function seed() {
  vi.stubEnv("AUTH_SECRET", secret)
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("orgs", { orgHandle: "a", name: "A", createdAt: now, updatedAt: now })
    const userId = await ctx.db.insert("users", { name: "Cashier", role: "customer", createdAt: now, updatedAt: now })
    const entryId = await ctx.db.insert("users", { name: "Entry", role: "customer", createdAt: now, updatedAt: now })
    for (const [id, role] of [
      [userId, "admin"],
      [entryId, "einlass"],
    ] as const)
      await ctx.db.insert("orgMembers", {
        userId: id,
        orgId,
        orgHandle: "a",
        role: "member",
        organizerRole: role,
        invitedBy: id,
        createdAt: now,
        updatedAt: now,
      })
    await ctx.db.insert("organizerDashboardOrganizations", {
      orgId,
      status: "aktiv",
      profile: { name: "Org", slug: "a", kind: "verein" },
      tax: { status: "regel", defaultRateBps: 1900 },
      fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
      contracts: { termsAcceptedAt: now, dpaAcceptedAt: now },
      configurationConfirmed: true,
      createdAt: now,
      updatedAt: now,
    })
    const eventId = await ctx.db.insert("catalogEvents", {
      title: "Abendshow",
      subtitle: "",
      description: "",
      category: "konzert",
      startsAt: now,
      endsAt: now,
      doorsAt: now,
      venue: "Hof",
      city: "Berlin",
      address: "",
      organizer: "Org",
      imageUrl: "",
      imageAlt: "",
      tags: [],
      status: "published" as const,
      catalogVersion: 1,
      orgId,
      eventKey: "event-a",
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey: "abendkasse",
      name: "Abendkasse Stehplatz",
      description: "",
      priceCents: 2800,
      feeCents: 0,
      capacity: 50,
      reserved: 0,
      sold: 48,
      sortOrder: 0,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
    const paidOrderId = await ctx.db.insert("ticketOrders", {
      checkoutKey: "paid-key",
      ownerUserId: userId,
      customerEmail: "guest@example.org",
      contactSnapshotJson: "{}",
      checkoutContextJson: "{}",
      eventKey: "event-a",
      eventTitle: "Abendshow",
      eventSubtitle: "",
      eventDescription: "",
      eventStartsAt: now,
      eventEndsAt: now,
      eventDoorsAt: now,
      venue: "Hof",
      city: "Berlin",
      address: "",
      organizer: "Org",
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      subtotalCents: 2800,
      feeCents: 0,
      totalCents: 2800,
      orgId,
      paymentReference: "pay",
      stripeMode: "test" as const,
      status: "paid" as const,
      paymentStatus: "paid" as const,
      reservationExpiresAt: 1,
      paidAt: now,
      createdAt: now,
      updatedAt: now,
    })
    const unpaidOrderId = await ctx.db.insert("ticketOrders", {
      checkoutKey: "unpaid-key",
      ownerUserId: userId,
      customerEmail: "guest@example.org",
      contactSnapshotJson: "{}",
      checkoutContextJson: "{}",
      eventKey: "event-a",
      eventTitle: "Abendshow",
      eventSubtitle: "",
      eventDescription: "",
      eventStartsAt: now,
      eventEndsAt: now,
      eventDoorsAt: now,
      venue: "Hof",
      city: "Berlin",
      address: "",
      organizer: "Org",
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      subtotalCents: 2800,
      feeCents: 0,
      totalCents: 2800,
      orgId,
      paymentReference: "pay2",
      stripeMode: "test" as const,
      status: "checkout_created" as const,
      paymentStatus: "pending" as const,
      reservationExpiresAt: 1,
      createdAt: now,
      updatedAt: now,
    })
    const paidTicketId = await ctx.db.insert("ticketIssued", {
      orderId: paidOrderId,
      sequence: 1,
      ownerUserId: userId,
      code: "BOX-1",
      eventKey: "event-a",
      eventTitle: "Abendshow",
      eventStartsAt: now,
      eventDoorsAt: now,
      venue: "Hof",
      city: "Berlin",
      address: "",
      tierKey: "abendkasse",
      tierName: "Abendkasse Stehplatz",
      priceCents: 2800,
      feeCents: 0,
      participantName: "Guest",
      issuedAt: now,
    })
    return { orgId, userId, entryId, paidOrderId, unpaidOrderId, paidTicketId }
  })
  const token = await testAuthSessionTokenCreate(t, ids.userId, secret)
  const entryToken = await testAuthSessionTokenCreate(t, ids.entryId, secret)
  return { t, ...ids, token, entryToken }
}

test("sale create enforces contingent and defaults price from tier", async () => {
  const s = await seed()
  const base = { token: s.token, orgId: s.orgId, eventKey: "event-a", tierKey: "abendkasse" }
  const created = await s.t.mutation(create, { ...base, quantity: 2 })
  expect(created.success).toBe(true)
  if (!created.success) return
  expect(created.data.totalCents).toBe(5600)
  expect(created.data.status).toBe("wartet")
  // Only 2 of 50 left (48 sold): quantity 3 exceeds the contingent.
  expect((await s.t.mutation(create, { ...base, quantity: 3 })).success).toBe(false)
  // Entry role may use the cash desk but never set price/contingent.
  expect((await s.t.mutation(create, { ...base, quantity: 1, token: s.entryToken })).success).toBe(false)
  const listed = await s.t.query(list, { token: s.token, orgId: s.orgId, eventKey: "event-a" })
  expect(listed.success).toBe(true)
  if (listed.success) expect(listed.data.sales).toHaveLength(1)
})

test("demo-harness test pay only accepts explicit test sales", async () => {
  const s = await seed()
  const base = { token: s.token, orgId: s.orgId, eventKey: "event-a", tierKey: "abendkasse" }
  const real = await s.t.mutation(create, { ...base, quantity: 1 })
  expect(real.success).toBe(true)
  if (!real.success) return
  // Real sale rejects the simulated device payment.
  expect(
    (
      await s.t.mutation(testPay, {
        token: s.token,
        orgId: s.orgId,
        saleId: real.data.saleId,
        testHarness: true as const,
      })
    ).success,
  ).toBe(false)
  const demo = await s.t.mutation(create, { ...base, quantity: 1, testHarness: true })
  expect(demo.success).toBe(true)
  if (!demo.success) return
  const paid = await s.t.mutation(testPay, {
    token: s.token,
    orgId: s.orgId,
    saleId: demo.data.saleId,
    testHarness: true as const,
  })
  expect(paid.success).toBe(true)
  if (paid.success) expect(paid.data.status).toBe("bezahlt")
  const fetched = await s.t.query(get, { token: s.token, orgId: s.orgId, saleId: demo.data.saleId })
  expect(fetched.success).toBe(true)
  if (fetched.success) expect(fetched.data.orderId).toBeNull()
})

test("real completion needs a paid order and checks in atomically", async () => {
  const s = await seed()
  const base = { token: s.token, orgId: s.orgId, eventKey: "event-a", tierKey: "abendkasse" }
  const created = await s.t.mutation(create, { ...base, quantity: 1 })
  expect(created.success).toBe(true)
  if (!created.success) return
  const saleId = created.data.saleId
  // Unpaid order never completes: no faked paid state.
  expect(
    (await s.t.mutation(complete, { token: s.token, orgId: s.orgId, saleId, orderId: s.unpaidOrderId })).success,
  ).toBe(false)
  const done = await s.t.mutation(complete, { token: s.token, orgId: s.orgId, saleId, orderId: s.paidOrderId })
  expect(done.success).toBe(true)
  if (!done.success) return
  expect(done.data.checkedIn).toBe(1)
  expect(done.data.sale.status).toBe("bezahlt")
  const ticket = await s.t.run((ctx) => ctx.db.get("ticketIssued", s.paidTicketId))
  expect(ticket?.checkedInAt).toBeDefined()
  // Cancel after payment is rejected; paid sales stay immutable.
  expect((await s.t.mutation(cancel, { token: s.token, orgId: s.orgId, saleId })).success).toBe(false)
})

test("public TEST device pay only flips explicit test sales, never real ones", async () => {
  const s = await seed()
  const base = { token: s.token, orgId: s.orgId, eventKey: "event-a", tierKey: "abendkasse" }
  const real = await s.t.mutation(create, { ...base, quantity: 1 })
  expect(real.success).toBe(true)
  if (!real.success) return
  expect((await s.t.mutation(devicePay, { saleId: real.data.saleId, testHarness: true as const })).success).toBe(false)
  const demo = await s.t.mutation(create, { ...base, quantity: 1, testHarness: true })
  expect(demo.success).toBe(true)
  if (!demo.success) return
  const paid = await s.t.mutation(devicePay, { saleId: demo.data.saleId, testHarness: true as const })
  expect(paid.success).toBe(true)
  if (!paid.success) return
  expect(paid.data.status).toBe("bezahlt")
  expect(paid.data.testHarness).toBe(true)
  expect(paid.data.orderId).toBeNull()
})

test("guest page is public, minimal and hides cancelled sales", async () => {
  const s = await seed()
  const created = await s.t.mutation(create, {
    token: s.token,
    orgId: s.orgId,
    eventKey: "event-a",
    tierKey: "abendkasse",
    quantity: 1,
    buyerEmail: "guest@example.org",
  })
  expect(created.success).toBe(true)
  if (!created.success) return
  const shown = await s.t.query(publicGet, { saleId: created.data.saleId })
  expect(shown.success).toBe(true)
  if (!shown.success) return
  expect(shown.data.eventTitle).toBe("Abendshow")
  expect(shown.data.totalCents).toBe(2800)
  expect(JSON.stringify(shown.data).includes("guest@example.org")).toBe(false)
  expect((await s.t.mutation(cancel, { token: s.token, orgId: s.orgId, saleId: created.data.saleId })).success).toBe(
    true,
  )
  expect((await s.t.query(publicGet, { saleId: created.data.saleId })).success).toBe(false)
})
