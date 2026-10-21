/// <reference types="vite/client" />
import { type ApiFromModules, makeFunctionReference } from "convex/server"
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import schema from "../convex/schema.ts"
import * as operations from "../convex/organizerDashboardBilling.ts"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = { ...import.meta.glob("../convex/**/*.ts") }
type Api = ApiFromModules<{ organizerDashboardBilling: typeof operations }>["organizerDashboardBilling"]
function ref<K extends keyof Api>(key: K): Api[K] {
  return makeFunctionReference(`organizerDashboardBilling:${key}`) as Api[K]
}
const refundRequest = ref("organizerDashboardOrderRefundRequestAction")
const refundStatus = ref("organizerDashboardOrderRefundStatusAction")
const invoiceStatus = ref("organizerDashboardOrderInvoiceStatusAction")
const invoicePdf = ref("organizerDashboardOrderInvoicePdfAction")
const invoiceResend = ref("organizerDashboardOrderInvoiceResendAction")

const now = "2026-10-01T10:00:00.000Z"
const secret = "billing-test-secret-only"
const billingEnv = {
  EVENTOREN_BILLING_BASE_URL: "https://billing.example.org",
  EVENTOREN_BILLING_ORGANIZATION_ID: "org_billing_1",
  EVENTOREN_BILLING_API_CREDENTIAL: "billing-secret-credential",
}
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function refundBody(status: "pending" | "succeeded" | "refunded" | "failed", amountCents = 500) {
  return {
    success: true,
    data: {
      paymentReference: "payment_abc",
      orderReference: "order_ABC123",
      stripeMode: "test",
      refundReference: "refund_1",
      amountCents,
      currency: "EUR",
      status,
      creditNoteStatus: "awaiting_accounting",
      refundedAmountCents: status === "pending" || status === "failed" ? 0 : amountCents,
      remainingAmountCents: status === "refunded" ? 0 : 600,
      createdAt: now,
      updatedAt: now,
    },
  }
}

function invoiceBody(emailStatus: string, pdfAvailable: boolean) {
  return {
    success: true,
    data: {
      paymentReference: "payment_abc",
      orderReference: "order_ABC123",
      stripeMode: "test",
      invoiceStatus: pdfAvailable ? "invoice_created" : "processing",
      invoiceNumber: pdfAvailable ? "RE-2026-001" : null,
      pdfAvailable,
      emailStatus,
      emailSentAt: emailStatus === "sent" ? now : null,
      updatedAt: now,
    },
  }
}

function billingFetchStub(handler: (url: string, init: RequestInit) => Response) {
  const seen: { url: string; init: RequestInit }[] = []
  vi.stubGlobal("fetch", (async (url: string, init?: RequestInit) => {
    seen.push({ url: String(url), init: init ?? {} })
    return handler(String(url), init ?? {})
  }) as typeof fetch)
  return seen
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

async function seed() {
  vi.stubEnv("AUTH_SECRET", secret)
  for (const [key, value] of Object.entries(billingEnv)) vi.stubEnv(key, value)
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("orgs", { orgHandle: "a", name: "A", createdAt: now, updatedAt: now })
    const otherOrg = await ctx.db.insert("orgs", { orgHandle: "b", name: "B", createdAt: now, updatedAt: now })
    const users = {} as Record<"inhaber" | "eventmanager" | "finanzen" | "einlass", string>
    for (const role of ["inhaber", "eventmanager", "finanzen", "einlass"] as const) {
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
    for (const id of [orgId, otherOrg])
      await ctx.db.insert("organizerDashboardOrganizations", {
        orgId: id,
        status: "aktiv",
        profile: { name: "Org", slug: String(id), kind: "verein" },
        tax: { status: "regel", defaultRateBps: 1900 },
        fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
        contracts: { termsAcceptedAt: now, dpaAcceptedAt: now },
        configurationConfirmed: true,
        createdAt: now,
        updatedAt: now,
      })
    const eventData = {
      title: "Testevent",
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
      status: "published" as const,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    }
    await ctx.db.insert("catalogEvents", { ...eventData, orgId, eventKey: "event-a" })
    await ctx.db.insert("catalogEvents", { ...eventData, orgId: otherOrg, eventKey: "event-b" })
    const orderData = {
      checkoutKey: "checkout_billing",
      customerEmail: "buyer@example.org",
      contactSnapshotJson: "{}",
      checkoutContextJson: "{}",
      eventKey: "event-a",
      eventTitle: "Testevent",
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
      subtotalCents: 1000,
      feeCents: 100,
      totalCents: 1100,
      orgId,
      paymentReference: "payment_abc",
      stripeMode: "test" as const,
      billingOrderReference: "order_ABC123",
      status: "paid" as const,
      paymentStatus: "paid" as const,
      reservationExpiresAt: 1,
      createdAt: now,
      updatedAt: now,
      paidAt: now,
    }
    const orderId = await ctx.db.insert("ticketOrders", orderData)
    const unpaidOrderId = await ctx.db.insert("ticketOrders", {
      ...orderData,
      checkoutKey: "checkout_unpaid",
      paymentReference: "payment_unpaid",
      paymentStatus: "pending" as const,
      status: "checkout_created" as const,
    })
    const noBillingOrderId = await ctx.db.insert("ticketOrders", {
      ...orderData,
      checkoutKey: "checkout_nobilling",
      paymentReference: "payment_nobilling",
      billingOrderReference: undefined,
    })
    const foreignOrderId = await ctx.db.insert("ticketOrders", {
      ...orderData,
      checkoutKey: "checkout_foreign",
      eventKey: "event-b",
      orgId: otherOrg,
      paymentReference: "payment_foreign",
      billingOrderReference: "order_FOREIGN",
    })
    return { orgId, otherOrg, users, orderId, unpaidOrderId, noBillingOrderId, foreignOrderId }
  })
  const tokens = {
    inhaber: await testAuthSessionTokenCreate(t, ids.users.inhaber as never, secret),
    eventmanager: await testAuthSessionTokenCreate(t, ids.users.eventmanager as never, secret),
    finanzen: await testAuthSessionTokenCreate(t, ids.users.finanzen as never, secret),
    einlass: await testAuthSessionTokenCreate(t, ids.users.einlass as never, secret),
  }
  return { t, ...ids, tokens }
}

async function auditRows(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) =>
    ctx.db
      .query("organizerDashboardOrderAudit")
      .collect()
      .then((rows) => rows.map((row) => ({ action: row.action, orderId: String(row.orderId) }))),
  )
}

test("refund request calls the real billing path and reports partial coverage with an audit row", async () => {
  const s = await seed()
  const seen = billingFetchStub(() => jsonResponse(refundBody("succeeded")))
  const result = await s.t.action(refundRequest, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    orderId: s.orderId,
    refundReference: "refund_1",
    idempotencyKey: "idem_1",
    amountCents: 500,
    reason: "Doppelte Buchung",
  })
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data).toMatchObject({
    refundReference: "refund_1",
    amountCents: 500,
    currency: "EUR",
    status: "succeeded",
    coverage: "partial",
    creditNoteStatus: "awaiting_accounting",
    refundedAmountCents: 500,
    remainingAmountCents: 600,
  })
  expect(seen).toHaveLength(1)
  expect(seen[0]?.url).toContain("/api/checkout/organizations/eventoren/ticket-checkout/payment_abc/refunds?")
  const body = JSON.parse(String(seen[0]?.init.body))
  expect(body).toMatchObject({
    paymentReference: "payment_abc",
    orderReference: "order_ABC123",
    stripeMode: "test",
    refundReference: "refund_1",
    idempotencyKey: "idem_1",
    amountCents: 500,
  })
  expect(new Headers(seen[0]?.init.headers).get("authorization")).toBe("Bearer billing-secret-credential")
  const rows = await auditRows(s.t)
  expect(rows).toEqual([{ action: "refund_requested", orderId: String(s.orderId) }])
})

test("refund status maps full refunds honestly and refunds require bestellungen.erstatten", async () => {
  const s = await seed()
  billingFetchStub(() => jsonResponse(refundBody("refunded")))
  const full = await s.t.action(refundStatus, {
    token: s.tokens.finanzen,
    orgId: s.orgId,
    orderId: s.orderId,
    refundReference: "refund_1",
  })
  expect(full.success).toBe(true)
  if (!full.success) return
  expect(full.data).toMatchObject({ status: "refunded", coverage: "full", remainingAmountCents: 0 })

  billingFetchStub(() => jsonResponse(refundBody("succeeded")))
  const denied = await s.t.action(refundRequest, {
    token: s.tokens.eventmanager,
    orgId: s.orgId,
    orderId: s.orderId,
    refundReference: "refund_1",
    idempotencyKey: "idem_1",
    amountCents: 500,
    reason: "Doppelte Buchung",
  })
  expect(denied.success).toBe(false)
  const deniedStatus = await s.t.action(refundStatus, {
    token: s.tokens.eventmanager,
    orgId: s.orgId,
    orderId: s.orderId,
    refundReference: "refund_1",
  })
  expect(deniedStatus.success).toBe(false)
})

test("failed and pending refunds keep their honest states", async () => {
  const s = await seed()
  for (const [status, coverage] of [
    ["failed", "failed"],
    ["pending", "pending"],
  ] as const) {
    billingFetchStub(() => jsonResponse(refundBody(status)))
    const result = await s.t.action(refundStatus, {
      token: s.tokens.inhaber,
      orgId: s.orgId,
      orderId: s.orderId,
      refundReference: "refund_1",
    })
    expect(result.success).toBe(true)
    if (!result.success) continue
    expect(result.data).toMatchObject({ status, coverage })
  }
})

test("refund refuses unpaid orders, missing billing references, and foreign scope without calling billing", async () => {
  const s = await seed()
  const seen = billingFetchStub(() => jsonResponse(refundBody("succeeded")))
  const base = {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    refundReference: "refund_1",
    idempotencyKey: "idem_1",
    amountCents: 500,
    reason: "Doppelte Buchung",
  }
  expect((await s.t.action(refundRequest, { ...base, orderId: s.unpaidOrderId })).success).toBe(false)
  expect((await s.t.action(refundRequest, { ...base, orderId: s.noBillingOrderId })).success).toBe(false)
  expect((await s.t.action(refundRequest, { ...base, orderId: s.foreignOrderId })).success).toBe(false)
  expect(seen).toHaveLength(0)
  expect(await auditRows(s.t)).toEqual([])
})

test("invoice status reports pending versus ready from the billing projection", async () => {
  const s = await seed()
  billingFetchStub(() => jsonResponse(invoiceBody("sent", false)))
  const pending = await s.t.action(invoiceStatus, {
    token: s.tokens.eventmanager,
    orgId: s.orgId,
    orderId: s.orderId,
  })
  expect(pending.success).toBe(true)
  if (!pending.success) return
  expect(pending.data).toMatchObject({ readiness: "pending", pdfAvailable: false, invoiceNumber: null })

  billingFetchStub(() => jsonResponse(invoiceBody("sent", true)))
  const ready = await s.t.action(invoiceStatus, { token: s.tokens.finanzen, orgId: s.orgId, orderId: s.orderId })
  expect(ready.success).toBe(true)
  if (!ready.success) return
  expect(ready.data).toMatchObject({
    readiness: "ready",
    pdfAvailable: true,
    invoiceNumber: "RE-2026-001",
    invoiceStatus: "invoice_created",
  })

  const denied = await s.t.action(invoiceStatus, { token: s.tokens.einlass, orgId: s.orgId, orderId: s.orderId })
  expect(denied.success).toBe(false)
})

test("invoice resend reports sent and failed delivery honestly with idempotent replay", async () => {
  const s = await seed()
  const seen = billingFetchStub(() => jsonResponse(invoiceBody("sent", true)))
  const sent = await s.t.action(invoiceResend, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    orderId: s.orderId,
    idempotencyKey: "resend_1",
  })
  expect(sent.success).toBe(true)
  if (!sent.success) return
  expect(sent.data).toMatchObject({ delivery: "sent", emailStatus: "sent" })
  expect(seen).toHaveLength(1)
  expect(seen[0]?.url).toContain("/invoice/resend?organizationId=org_billing_1")

  billingFetchStub(() => jsonResponse(invoiceBody("failed", true)))
  const failed = await s.t.action(invoiceResend, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    orderId: s.orderId,
    idempotencyKey: "resend_1",
  })
  expect(failed.success).toBe(true)
  if (!failed.success) return
  expect(failed.data).toMatchObject({ delivery: "failed", emailStatus: "failed" })

  const rows = await auditRows(s.t)
  expect(rows).toEqual([
    { action: "invoice_resent", orderId: String(s.orderId) },
    { action: "invoice_resent", orderId: String(s.orderId) },
  ])
})

test("invoice PDF downloads real bytes and refuses drafts without an audit row", async () => {
  const s = await seed()
  const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])
  billingFetchStub(() => new Response(pdfBytes, { status: 200, headers: { "content-type": "application/pdf" } }))
  const ok = await s.t.action(invoicePdf, { token: s.tokens.finanzen, orgId: s.orgId, orderId: s.orderId })
  expect(ok.success).toBe(true)
  if (!ok.success) return
  expect(ok.data.byteLength).toBe(5)
  expect(Buffer.from(ok.data.pdfBase64, "base64")).toEqual(Buffer.from(pdfBytes))

  billingFetchStub(() => new Response("draft", { status: 409 }))
  const draft = await s.t.action(invoicePdf, { token: s.tokens.finanzen, orgId: s.orgId, orderId: s.orderId })
  expect(draft.success).toBe(false)
  const rows = await auditRows(s.t)
  expect(rows).toEqual([{ action: "invoice_pdf_downloaded", orderId: String(s.orderId) }])
})

test("billing HTTP failures are errors, never data, and write no audit row", async () => {
  const s = await seed()
  billingFetchStub(() => new Response("upstream", { status: 500 }))
  const failed = await s.t.action(refundRequest, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    orderId: s.orderId,
    refundReference: "refund_1",
    idempotencyKey: "idem_1",
    amountCents: 500,
    reason: "Doppelte Buchung",
  })
  expect(failed.success).toBe(false)
  if (failed.success) return
  expect(failed.errorMessage).toContain("500")
  expect(await auditRows(s.t)).toEqual([])
})
