/// <reference types="vite/client" />

import { BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from "@zxing/library"
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { api } from "../convex/_generated/api.js"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"
import { ticketCheckoutLegalDocumentSnapshot } from "../src/ticketing/ticketCheckoutLegalDocumentSnapshot.ts"
import { ticketQrMatrixCreate } from "../src/ticketing/ticketQrMatrixCreate.ts"
import { ticketQrSvgGenerate } from "../src/ticketing/ticketQrSvgGenerate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "ticket-purchase-check-in-convex-test-secret"
process.env.AUTH_SECRET = authSecret

afterEach(() => {
  vi.unstubAllGlobals()
})

async function tokenFor(userId: Id<"users">): Promise<string> {
  return await createToken(userId, authSecret)
}

async function seedUsers(t: ReturnType<typeof convexTest>) {
  const timestamp = "2026-09-15T12:00:00.000Z"
  return await t.run(async (ctx) => {
    const adminId = await ctx.db.insert("users", {
      name: "Catalog Admin",
      email: "admin@example.com",
      role: "admin",
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    const customerId = await ctx.db.insert("users", {
      name: "Ada Lovelace",
      email: "buyer@example.com",
      role: "customer",
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    const organizerId = await ctx.db.insert("users", {
      name: "Organizer Operator",
      email: "organizer@example.com",
      role: "organizer",
      organizerInvitedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    return { adminId, customerId, organizerId }
  })
}

function billingMock() {
  let payment: "pending" | "paid" = "pending"
  let checkoutCalls = 0
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith("/ticket-checkout")) {
      checkoutCalls += 1
      const body = JSON.parse(String(init?.body)) as { paymentReference: string }
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            paymentReference: body.paymentReference,
            orderReference: "billing-order-integrated",
            stripeMode: "test",
            status: "checkout_created",
            expiresAt: null,
            url: "https://checkout.stripe.test/integrated",
          },
        }),
        { status: 201 },
      )
    }
    if (url.pathname.endsWith("/status")) {
      const pathParts = url.pathname.split("/")
      const paymentReference = decodeURIComponent(pathParts.at(-2) ?? "")
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            paymentReference,
            orderReference: "billing-order-integrated",
            stripeMode: "test",
            status: "checkout_created",
            payment,
            expiresAt: null,
          },
        }),
        { status: 200 },
      )
    }
    return new Response(null, { status: 404 })
  })
  vi.stubGlobal("fetch", fetchMock)
  return {
    fetchMock,
    checkoutCallsGet: () => checkoutCalls,
    paymentSet: (value: "pending" | "paid") => {
      payment = value
    },
  }
}

async function createPublishedCatalog(t: ReturnType<typeof convexTest>, token: string) {
  const event = await t.mutation(api.catalog.catalogEventUpsertMutation, {
    eventKey: "integrated-ticket-event",
    title: "Integrated Ticket Event",
    subtitle: "Lifecycle test event",
    description: "Lifecycle test event description",
    category: "konzerte",
    startsAt: "2026-10-01T18:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    venue: "Test Hall",
    city: "Berlin",
    address: "Test Street 1",
    organizer: "Eventoren",
    imageUrl: "https://eventoren.test/integrated-event.jpg",
    imageAlt: "Integrated event",
    tags: [],
    status: "draft",
    token,
  })
  expect(event.success).toBe(true)

  const tier = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    eventKey: "integrated-ticket-event",
    tierKey: "standard",
    name: "Standard",
    description: "Standard ticket",
    startsAt: "2026-10-01T18:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    priceCents: 2_500,
    feeCents: 300,
    capacity: 1,
    token,
  })
  expect(tier.success).toBe(true)

  const published = await t.mutation(api.catalog.catalogEventPublishMutation, {
    eventKey: "integrated-ticket-event",
    token,
  })
  expect(published.success).toBe(true)
  if (!published.success) return undefined
  return published.data.catalogVersion
}

function checkoutArgs(token: string, catalogVersion: number) {
  return {
    token,
    checkoutKey: "integratedcheckoutkey1234567890123456",
    eventKey: "integrated-ticket-event",
    catalogVersion,
    tickets: [{ tierKey: "standard", quantity: 1, participantNames: ["Grace Hopper"] }],
    successUrl: "https://eventoren.test/checkout/success",
    cancelUrl: "https://eventoren.test/checkout/cancel",
    locale: "en" as const,
    customer: { email: "buyer@example.com", givenName: "Ada", familyName: "Lovelace", phone: "" },
    legalContext: {
      cta: "Pay now",
      termsAccepted: true as const,
      privacyAcknowledged: true as const,
      documentSetRevision: `sha256:${"a".repeat(64)}`,
      termsMarkdown: ticketCheckoutLegalDocumentSnapshot.termsMarkdown,
      privacyMarkdown: ticketCheckoutLegalDocumentSnapshot.privacyMarkdown,
    },
  }
}

function qrDecode(code: string): string {
  const generated = ticketQrMatrixCreate(code)
  expect(generated.success).toBe(true)
  if (!generated.success) return ""

  const border = 4
  const scale = 6
  const size = (generated.data.length + border * 2) * scale
  const luminances = new Uint8ClampedArray(size * size)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const moduleX = Math.floor(x / scale) - border
      const moduleY = Math.floor(y / scale) - border
      const dark =
        moduleX >= 0 &&
        moduleY >= 0 &&
        moduleX < generated.data.length &&
        moduleY < generated.data.length &&
        generated.data[moduleY]?.[moduleX]
      luminances[y * size + x] = dark ? 0 : 255
    }
  }

  const source = new RGBLuminanceSource(luminances, size, size)
  return new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(source))).getText()
}

test("completes the real purchase, wallet, QR check-in, duplicate, reset, and history lifecycle", async () => {
  process.env.EVENTOREN_BILLING_BASE_URL = "https://billing.test"
  process.env.EVENTOREN_BILLING_ORGANIZATION_ID = "eventoren-test"
  process.env.EVENTOREN_BILLING_API_CREDENTIAL = "bapi_test"
  process.env.EVENTOREN_BILLING_STRIPE_MODE = "test"
  process.env.EVENTOREN_PUBLIC_BASE_URL = "https://eventoren.test"
  const billing = billingMock()
  const t = convexTest(schema, modules)
  const users = await seedUsers(t)
  const adminToken = await tokenFor(users.adminId)
  const customerToken = await tokenFor(users.customerId)
  const organizerToken = await tokenFor(users.organizerId)
  const catalogVersion = await createPublishedCatalog(t, adminToken)
  if (catalogVersion === undefined) return

  const args = checkoutArgs(customerToken, catalogVersion)
  const checkout = await t.action(api.ticketing.ticketCheckoutCreateAction, args)
  expect(checkout).toMatchObject({
    success: true,
    data: { status: "checkout_created", paymentStatus: "pending", replayed: false },
  })
  if (!checkout.success) return
  const orderId = checkout.data.orderId as Id<"ticketOrders">

  const unpaidWallet = await t.query(api.ticketing.ticketOrderGetQuery, { orderId, token: customerToken })
  expect(unpaidWallet).toMatchObject({
    success: true,
    data: { status: "checkout_created", paymentStatus: "pending", tickets: [] },
  })
  const beforePayment = await t.run(async (ctx) => ctx.db.query("ticketIssued").collect())
  expect(beforePayment).toHaveLength(0)

  const pending = await t.action(api.ticketing.ticketPaymentReconcileAction, { orderId, token: customerToken })
  expect(pending).toMatchObject({
    success: true,
    data: { status: "checkout_created", paymentStatus: "pending", ticketCount: 0 },
  })

  billing.paymentSet("paid")
  const paid = await t.action(api.ticketing.ticketPaymentReconcileAction, { orderId, token: customerToken })
  const issuedAfterPaid = await t.run(async (ctx) =>
    ctx.db
      .query("ticketIssued")
      .withIndex("orderIdAndSequence", (query) => query.eq("orderId", orderId))
      .collect(),
  )
  expect(issuedAfterPaid).toHaveLength(1)
  const firstIssuedTicket = issuedAfterPaid[0]
  expect(firstIssuedTicket).toBeDefined()
  if (!firstIssuedTicket) return

  const paidRetry = await t.action(api.ticketing.ticketPaymentReconcileAction, { orderId, token: customerToken })
  const issuedAfterPaidRetry = await t.run(async (ctx) =>
    ctx.db
      .query("ticketIssued")
      .withIndex("orderIdAndSequence", (query) => query.eq("orderId", orderId))
      .collect(),
  )
  expect(paid).toMatchObject({ success: true, data: { status: "paid", paymentStatus: "paid", ticketCount: 1 } })
  expect(paidRetry).toMatchObject({ success: true, data: { status: "paid", paymentStatus: "paid", ticketCount: 1 } })
  expect(issuedAfterPaidRetry).toHaveLength(1)
  const retriedIssuedTicket = issuedAfterPaidRetry[0]
  expect(retriedIssuedTicket).toBeDefined()
  if (!retriedIssuedTicket) return
  expect(retriedIssuedTicket._id).toBe(firstIssuedTicket._id)
  expect(retriedIssuedTicket.code).toBe(firstIssuedTicket.code)
  expect(billing.checkoutCallsGet()).toBe(1)

  const wallet = await t.query(api.ticketing.ticketOrderGetQuery, { orderId, token: customerToken })
  expect(wallet).toMatchObject({
    success: true,
    data: {
      eventKey: "integrated-ticket-event",
      status: "paid",
      paymentStatus: "paid",
      contact: { givenName: "Ada", familyName: "Lovelace", email: "buyer@example.com" },
      tickets: [{ eventKey: "integrated-ticket-event", participantName: "Grace Hopper", tierKey: "standard" }],
    },
  })
  if (!wallet.success) return
  const walletData = wallet.data as {
    eventKey: string
    tickets: readonly [{ id: Id<"ticketIssued">; code: string; eventKey: string; participantName: string }]
  }
  const walletTicket = walletData.tickets[0]
  expect(walletTicket).toBeDefined()
  if (!walletTicket) return
  expect(walletTicket.eventKey).toBe(walletData.eventKey)
  expect(walletTicket.id).toBe(firstIssuedTicket._id)
  expect(walletTicket.code).toBe(firstIssuedTicket.code)
  const qr = ticketQrSvgGenerate(walletTicket.code)
  expect(qr.success).toBe(true)
  const decodedCode = qrDecode(walletTicket.code)
  expect(decodedCode).toBe(walletTicket.code)

  const eventList = await t.query(api.organizer.organizerEventListQuery, {
    token: organizerToken,
    paginationOpts: { numItems: 10, cursor: null },
  })
  const eventDetail = await t.query(api.organizer.organizerEventGetQuery, {
    eventKey: walletData.eventKey,
    token: organizerToken,
  })
  expect(eventList).toMatchObject({ success: true, data: { page: [{ eventKey: walletData.eventKey }] } })
  expect(eventDetail).toMatchObject({ success: true, data: { eventKey: walletData.eventKey } })
  if (!eventList.success || !eventDetail.success) return

  const checkedIn = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: walletData.eventKey,
    ticketCode: decodedCode,
    token: organizerToken,
  })
  expect(checkedIn).toMatchObject({
    success: true,
    data: {
      status: "checked-in",
      ticket: {
        ticketNumber: walletTicket.code,
        eventKey: walletData.eventKey,
        participantName: "Grace Hopper",
        buyerName: "Ada Lovelace",
        checkedIn: true,
      },
    },
  })
  const ticketAfterCheckIn = await t.run(async (ctx) => ctx.db.get("ticketIssued", walletTicket.id))
  expect(ticketAfterCheckIn).toMatchObject({
    _id: walletTicket.id,
    code: walletTicket.code,
    checkedInBy: users.organizerId,
    checkedInByName: "Organizer Operator",
  })
  expect(ticketAfterCheckIn?.checkedInAt).toBeTypeOf("string")

  const historyAfterFirstCheckIn = await t.query(api.organizer.organizerTicketCheckInHistoryQuery, {
    eventKey: walletData.eventKey,
    ticketId: walletTicket.id,
    token: organizerToken,
  })
  expect(historyAfterFirstCheckIn).toMatchObject({ success: true, data: [{ action: "check_in" }] })
  if (!historyAfterFirstCheckIn.success) return
  expect(historyAfterFirstCheckIn.data).toHaveLength(1)

  const duplicate = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: walletData.eventKey,
    ticketCode: walletTicket.code,
    token: organizerToken,
  })
  const historyAfterDuplicate = await t.query(api.organizer.organizerTicketCheckInHistoryQuery, {
    eventKey: walletData.eventKey,
    ticketId: walletTicket.id,
    token: organizerToken,
  })
  expect(historyAfterDuplicate).toMatchObject({ success: true })
  if (!historyAfterDuplicate.success) return
  expect(historyAfterDuplicate.data).toEqual(historyAfterFirstCheckIn.data)

  expect(duplicate).toMatchObject({ success: false, code: "organizer.check-in.duplicate" })
  if (duplicate.success || typeof duplicate.errorData !== "string") return
  expect(duplicate.errorMessage).toContain("Organizer Operator")
  expect(duplicate.errorMessage).toContain("Grace Hopper")
  expect(duplicate.errorMessage).toContain("Ada Lovelace")
  expect(duplicate.errorMessage).toContain(walletTicket.code)
  expect(JSON.parse(duplicate.errorData)).toMatchObject({
    previousOperator: "Organizer Operator",
    participantName: "Grace Hopper",
    buyerName: "Ada Lovelace",
    buyerEmail: "buyer@example.com",
    ticketNumber: walletTicket.code,
  })

  const reset = await t.mutation(api.organizer.organizerTicketCheckInResetMutation, {
    eventKey: walletData.eventKey,
    ticketCode: walletTicket.code,
    token: organizerToken,
  })
  expect(reset).toMatchObject({ success: true, data: { status: "reset", ticket: { checkedIn: false } } })
  const ticketAfterReset = await t.run(async (ctx) => ctx.db.get("ticketIssued", walletTicket.id))
  expect(ticketAfterReset).toMatchObject({ _id: walletTicket.id, code: walletTicket.code })
  expect(ticketAfterReset?.checkedInAt).toBeUndefined()
  expect(ticketAfterReset?.checkedInBy).toBeUndefined()
  expect(ticketAfterReset?.checkedInByName).toBeUndefined()

  const listAfterReset = await t.query(api.organizer.organizerEventTicketListQuery, {
    eventKey: walletData.eventKey,
    token: organizerToken,
    paginationOpts: { numItems: 10, cursor: null },
  })
  expect(listAfterReset).toMatchObject({
    success: true,
    data: { page: [{ eventKey: walletData.eventKey, participantName: "Grace Hopper", checkedIn: false }] },
  })

  const recheckedIn = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: walletData.eventKey,
    ticketCode: walletTicket.code,
    token: organizerToken,
  })
  expect(recheckedIn).toMatchObject({ success: true, data: { status: "checked-in", ticket: { checkedIn: true } } })
  const ticketAfterRecheck = await t.run(async (ctx) => ctx.db.get("ticketIssued", walletTicket.id))
  expect(ticketAfterRecheck).toMatchObject({
    _id: walletTicket.id,
    code: walletTicket.code,
    checkedInBy: users.organizerId,
    checkedInByName: "Organizer Operator",
  })
  expect(ticketAfterRecheck?.checkedInAt).toBeTypeOf("string")

  const ticketDetail = await t.query(api.organizer.organizerEventTicketGetQuery, {
    eventKey: walletData.eventKey,
    ticketId: walletTicket.id,
    token: organizerToken,
  })
  const history = await t.query(api.organizer.organizerTicketCheckInHistoryQuery, {
    eventKey: walletData.eventKey,
    ticketId: walletTicket.id,
    token: organizerToken,
  })
  expect(ticketDetail).toMatchObject({
    success: true,
    data: {
      eventId: eventDetail.data.id,
      eventKey: eventDetail.data.eventKey,
      ticketNumber: walletTicket.code,
      participantName: "Grace Hopper",
      buyerEmail: "buyer@example.com",
      checkedIn: true,
    },
  })
  expect(history).toMatchObject({ success: true })
  if (!history.success || !ticketDetail.success) return
  expect(history.data).toHaveLength(3)
  expect(history.data.map((entry) => entry.action).sort()).toEqual(["check_in", "check_in", "reset"])
  expect(history.data.every((entry) => entry.ticketNumber === walletTicket.code)).toBe(true)
  expect(history.data.every((entry) => entry.participantName === "Grace Hopper")).toBe(true)
  expect(history.data.every((entry) => entry.buyerName === "Ada Lovelace")).toBe(true)
  expect(ticketDetail.data.eventId).toBe(eventList.data.page[0]?.id)
})
