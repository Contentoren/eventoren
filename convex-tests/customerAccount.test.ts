/// <reference types="vite/client" />
import { type ApiFromModules, type FunctionReturnType, makeFunctionReference } from "convex/server"
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import schema from "../convex/schema.ts"
import * as operations from "../convex/customerAccount.ts"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = { ...import.meta.glob("../convex/**/*.ts") }
type Api = ApiFromModules<{ customerAccount: typeof operations }>["customerAccount"]
function ref<K extends keyof Api>(key: K): Api[K] {
  return makeFunctionReference(`customerAccount:${key}`) as Api[K]
}
const tickets = ref("customerAccountTicketListQuery")
const orders = ref("customerAccountOrderListQuery")
const orderGet = ref("customerAccountOrderGetQuery")
const profileGet = ref("customerAccountProfileGetQuery")
const profileUpdate = ref("customerAccountProfileUpdateMutation")
const now = "2026-10-01T10:00:00.000Z"
const secret = "account-test-secret-only"
afterEach(() => vi.unstubAllEnvs())

async function seed() {
  vi.stubEnv("AUTH_SECRET", secret)
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const customer = await ctx.db.insert("users", {
      name: "Lea Schneider",
      email: "lea.schneider@example.de",
      role: "customer",
      createdAt: now,
      updatedAt: now,
    })
    const stranger = await ctx.db.insert("users", {
      name: "Stranger",
      role: "customer",
      createdAt: now,
      updatedAt: now,
    })
    const orderBase = {
      checkoutKey: "key",
      ownerUserId: customer,
      customerEmail: "lea.schneider@example.de",
      customerGivenName: "Lea",
      customerFamilyName: "Schneider",
      contactSnapshotJson: "{}",
      checkoutContextJson: "{}",
      eventKey: "event-a",
      eventTitle: "Indie Night",
      eventSubtitle: "",
      eventDescription: "",
      eventStartsAt: now,
      eventEndsAt: now,
      eventDoorsAt: now,
      venue: "Lichtspiel",
      city: "Berlin",
      address: "",
      organizer: "Org",
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      subtotalCents: 4500,
      feeCents: 128,
      totalCents: 4628,
      paymentReference: "SECRET_payment",
      checkoutUrl: "https://SECRET_checkout",
      billingDetailsJson: '{"secret":"SECRET_billing"}',
      stripeMode: "test" as const,
      reservationExpiresAt: 1,
      createdAt: now,
      updatedAt: now,
      bookingNumber: 123,
      bookingReference: "EV-260123",
    }
    const paidOrderId = await ctx.db.insert("ticketOrders", {
      ...orderBase,
      status: "paid" as const,
      paymentStatus: "paid" as const,
      paidAt: now,
      checkoutCompletedAt: now,
    })
    const openOrderId = await ctx.db.insert("ticketOrders", {
      ...orderBase,
      checkoutKey: "key-open",
      status: "checkout_created" as const,
      paymentStatus: "pending" as const,
    })
    const eventId = await ctx.db.insert("catalogEvents", {
      title: "Indie Night",
      subtitle: "",
      description: "",
      category: "konzert",
      startsAt: now,
      endsAt: now,
      doorsAt: now,
      venue: "Lichtspiel",
      city: "Berlin",
      address: "",
      organizer: "Org",
      imageUrl: "",
      imageAlt: "",
      tags: [],
      status: "published" as const,
      catalogVersion: 1,
      eventKey: "event-a",
      createdAt: now,
      updatedAt: now,
    })
    const tierId = await ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey: "standard",
      name: "Standard",
      description: "",
      priceCents: 2250,
      feeCents: 64,
      capacity: 100,
      reserved: 0,
      sold: 2,
      sortOrder: 0,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("ticketOrderLines", {
      orderId: paidOrderId,
      tierId,
      eventKey: "event-a",
      tierKey: "standard",
      tierName: "Standard",
      tierDescription: "",
      quantity: 2,
      priceCents: 2250,
      feeCents: 128,
      createdAt: now,
    })
    await ctx.db.insert("ticketIssued", {
      orderId: paidOrderId,
      sequence: 1,
      ownerUserId: customer,
      guestAccessDigest: "SECRET_digest",
      code: "T-AAAA-1111",
      eventKey: "event-a",
      eventTitle: "Indie Night",
      eventStartsAt: now,
      eventDoorsAt: now,
      venue: "Lichtspiel",
      city: "Berlin",
      address: "",
      tierKey: "standard",
      tierName: "Standard",
      priceCents: 2250,
      feeCents: 64,
      participantName: "Lea Schneider",
      issuedAt: now,
    })
    return { customer, stranger, paidOrderId, openOrderId }
  })
  const token = await testAuthSessionTokenCreate(t, ids.customer, secret)
  const strangerToken = await testAuthSessionTokenCreate(t, ids.stranger, secret)
  return { t, ...ids, token, strangerToken }
}

test("tickets are owner-bound and digest-free", async () => {
  const s = await seed()
  const mine = await s.t.query(tickets, { token: s.token, paginationOpts: { numItems: 10, cursor: null } })
  expect(mine.success).toBe(true)
  if (!mine.success) return
  expect(mine.data.page).toHaveLength(1)
  expect(mine.data.page[0]?.code).toBe("T-AAAA-1111")
  expect(JSON.stringify(mine.data).includes("SECRET")).toBe(false)
  const foreign = await s.t.query(tickets, { token: s.strangerToken, paginationOpts: { numItems: 10, cursor: null } })
  expect(foreign.success).toBe(true)
  if (foreign.success) expect(foreign.data.page).toHaveLength(0)
})

test("orders list, paid detail with invoice, open detail without", async () => {
  const s = await seed()
  const mine = await s.t.query(orders, { token: s.token, paginationOpts: { numItems: 10, cursor: null } })
  expect(mine.success).toBe(true)
  if (!mine.success) return
  expect(mine.data.page).toHaveLength(2)
  expect(JSON.stringify(mine.data).includes("SECRET")).toBe(false)
  const paid = await s.t.query(orderGet, { token: s.token, orderId: s.paidOrderId })
  expect(paid.success).toBe(true)
  if (!paid.success) return
  expect(paid.data.invoice?.invoiceNumber).toBe("EV-260123")
  expect(paid.data.invoice?.totalCents).toBe(4628)
  expect(paid.data.tickets).toHaveLength(1)
  const open = await s.t.query(orderGet, { token: s.token, orderId: s.openOrderId })
  expect(open.success).toBe(true)
  if (open.success) expect(open.data.invoice).toBeNull()
  expect((await s.t.query(orderGet, { token: s.strangerToken, orderId: s.paidOrderId })).success).toBe(false)
})

test("profile read and display-name update", async () => {
  const s = await seed()
  const profile = await s.t.query(profileGet, { token: s.token })
  expect(profile.success).toBe(true)
  if (!profile.success) return
  expect(profile.data).toEqual({ name: "Lea Schneider", email: "lea.schneider@example.de" })
  const updated = await s.t.mutation(profileUpdate, { token: s.token, name: "  Lea S.  " })
  expect(updated.success).toBe(true)
  if (updated.success) expect(updated.data.name).toBe("Lea S.")
  expect((await s.t.mutation(profileUpdate, { token: s.token, name: "   " })).success).toBe(false)
})
