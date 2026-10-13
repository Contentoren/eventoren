/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { api } from "../convex/_generated/api.js"
import type { Doc } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const secret = "saved-order-proof-test-secret"
process.env.AUTH_SECRET = secret
const runId = "mv58srp6-a49e3a99-972b-430a-914f-ac38a0d408de"
const eventKey = `ticket-e2e-${runId}`
const title = `Ticket E2E ${runId}`
const organizer = `Eventoren Ticket E2E ${runId}`
const now = "2026-10-12T13:36:31.885Z"
afterEach(() => vi.restoreAllMocks())

async function fixture() {
  const t = convexTest(schema, modules)
  const clock = vi.spyOn(Date, "now").mockReturnValue(1791812191885)
  const admin = await t.run((ctx) =>
    ctx.db.insert("users", {
      name: "admin",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    }),
  )
  await t.run((ctx) =>
    ctx.db.insert("catalogEvents", {
      eventKey,
      title,
      organizer,
      subtitle: "",
      description: "",
      category: "test",
      startsAt: now,
      endsAt: now,
      doorsAt: now,
      venue: "Test",
      city: "Berlin",
      address: "Test",
      imageUrl: "",
      imageAlt: "",
      tags: [],
      status: "published",
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    }),
  )
  const order = {
    checkoutKey: "saved-checkout",
    customerEmail: "fixture@example.test",
    customerGivenName: "E2E",
    customerFamilyName: runId,
    contactSnapshotJson: "{}",
    eventKey,
    eventTitle: title,
    organizer,
    eventSubtitle: "",
    eventDescription: "",
    eventStartsAt: now,
    eventEndsAt: now,
    eventDoorsAt: now,
    venue: "Test",
    city: "Berlin",
    address: "Test",
    imageUrl: "",
    imageAlt: "",
    catalogVersion: 1,
    subtotalCents: 2400,
    feeCents: 0,
    totalCents: 2400,
    checkoutContextJson: "{}",
    paymentReference: "payment_JBZtTLimt3BelIVKQCeOPmnYM9zR7D4Dvch7yIWBUMTIAIN2",
    billingOrderReference: "order_d66dbb19dac9434daba3d690adbff6c1",
    checkoutUrl:
      "https://checkout.stripe.com/c/pay/cs_test_a1pUsv4RziuFTEiJYhfTg296fbIU43vWR3taboKQRJ9aNRjo6zwqSEDLfl#fixture",
    stripeMode: "test" as const,
    status: "expired" as const,
    paymentStatus: "expired" as const,
    reservationExpiresAt: 1791838436376,
    createdAt: "2026-10-12T20:38:56.376Z",
    updatedAt: "2026-10-12T20:53:56.791Z",
    releasedAt: "2026-10-12T20:53:56.791Z",
  }
  let orderId: Doc<"ticketOrders">["_id"] | undefined
  async function savedInsert() {
    if (orderId) return orderId
    clock.mockReturnValue(1791837536376)
    orderId = await t.run((ctx) => ctx.db.insert("ticketOrders", order))
    clock.mockRestore()
    return orderId
  }
  async function previousInsert(overrides: Partial<Omit<Doc<"ticketOrders">, "_id" | "_creationTime">> = {}) {
    clock.mockReturnValue(1791818098128)
    const { billingOrderReference, checkoutUrl, ...previous } = order
    return t.run((ctx) =>
      ctx.db.insert("ticketOrders", {
        ...previous,
        checkoutKey: "previous-checkout",
        paymentReference: "payment_BKJ5d2gOAPCXBDxwfSd2syVuwpMVAHGm3bgCmLrNcPWPmLkY",
        status: "released",
        paymentStatus: "failed",
        createdAt: "2026-10-12T15:14:58.128Z",
        releasedAt: "2026-10-12T15:29:58.192Z",
        ...overrides,
      }),
    )
  }
  const query = async () => {
    const saved = await savedInsert()
    const token = await testAuthSessionTokenCreate(t, admin, secret)
    return t.query(api.ticketing.ticketE2eOrderProofQuery, {
      token,
      orderId: saved,
      eventKey,
      runId,
      runCreatedAt: 1791812190000,
    })
  }
  return { t, admin, savedInsert, previousInsert, query }
}

test("proves exact saved expired order alongside the observed released failed preparation without Billing refs", async () => {
  const f = await fixture()
  await f.previousInsert()
  expect(await f.query()).toMatchObject({
    success: true,
    data: {
      paymentReference: "payment_JBZtTLimt3BelIVKQCeOPmnYM9zR7D4Dvch7yIWBUMTIAIN2",
      orderReference: "order_d66dbb19dac9434daba3d690adbff6c1",
      status: "expired",
      paymentStatus: "expired",
    },
  })
})

test("proves saved order with multiple earlier owned released and expired records", async () => {
  const f = await fixture()
  await f.previousInsert()
  await f.previousInsert({
    status: "expired",
    paymentStatus: "expired",
    paymentReference: "payment_other",
    billingOrderReference: "order_other",
  })
  expect((await f.query()).success).toBe(true)
})

test.each([
  ["foreign customer", { customerEmail: "foreign@example.test" }],
  ["foreign run", { customerFamilyName: "foreign-run" }],
  ["foreign Stripe mode", { stripeMode: "live" }],
  ["active reservation", { status: "reserved", paymentStatus: "pending" }],
  ["paid history", { status: "paid", paymentStatus: "paid" }],
  ["uncorrelated pending payment", { paymentStatus: "pending" }],
  ["shared payment reference", { paymentReference: "payment_JBZtTLimt3BelIVKQCeOPmnYM9zR7D4Dvch7yIWBUMTIAIN2" }],
  ["history before run", { createdAt: "2026-10-12T12:00:00.000Z" }],
  ["shared Billing reference", { billingOrderReference: "order_d66dbb19dac9434daba3d690adbff6c1" }],
  ["active checkout lease", { checkoutAttemptLeaseUntil: 9_000_000_000_000 }],
] as const)("refuses %s without adopting another order", async (_, overrides) => {
  const f = await fixture()
  await f.previousInsert(overrides)
  expect(await f.query()).toMatchObject({
    success: false,
    errorMessage: "Other active or uncorrelated event order conflicts with saved proof",
  })
})

test("prepare-only saved order reports missing Billing references distinctly", async () => {
  const f = await fixture()
  const orderId = await f.savedInsert()
  await f.t.run((ctx) => ctx.db.patch(orderId, { billingOrderReference: undefined, checkoutUrl: undefined }))
  expect(await f.query()).toMatchObject({
    success: false,
    errorMessage: "Saved order payment/Billing references missing",
  })
})

test("proof refuses incomplete discovery at the fixed index bound", async () => {
  const f = await fixture()
  for (let i = 0; i < 100; i++) await f.previousInsert({ paymentReference: `payment_old_${i}` })
  expect(await f.query()).toMatchObject({
    success: false,
    errorMessage: "Exact event order discovery exceeds proof bound",
  })
})

test("admin authorization refuses independently of order ownership", async () => {
  const f = await fixture()
  await f.savedInsert()
  await f.t.run((ctx) => ctx.db.patch(f.admin, { role: "user" }))
  expect(await f.query()).toMatchObject({
    success: false,
    op: "catalogAdminAuthorizeFn",
    errorMessage: "Admin role required",
  })
})
