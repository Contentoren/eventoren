import { createHmac } from "node:crypto"
import { expect, test } from "@rstest/core"
import type { E2eCheckpoint } from "../checkpoint/e2eCheckpointSchema.ts"
import { e2eStripeDevelopmentWebhookForward } from "./e2eStripeDevelopmentWebhookForward.ts"

const runId = "abc-12345678-1234-1234-1234-123456789abc"
const eventKey = `ticket-e2e-${runId}`
const checkpoint = {
  version: 1,
  target: "development",
  baseUrl: "https://eventoren.wonder1.de",
  runId,
  createdAt: 1000000,
  phase: "ticket-unreconciled",
  ticket: {
    step: "payment",
    status: "started",
    eventKey,
    eventTitle: `Ticket E2E ${runId}`,
    participantName: `E2E Participant ${runId}`,
    mailSince: 1000000,
    eventId: eventKey,
    orderId: "order-1",
    stripeSession: "cs_test_123",
  },
} satisfies E2eCheckpoint
const metadata = {
  source: "eventoren_ticket",
  event_key: eventKey,
  organization_id: "org",
  stripe_mode: "test",
  payment_reference: "pay",
  order_reference: "order",
}
const session = {
  id: "cs_test_123",
  livemode: false,
  status: "complete",
  payment_status: "paid",
  mode: "payment",
  subscription: null,
  customer: "cus_123",
  payment_intent: "pi_test123",
  metadata,
}
const event = {
  id: "evt_123",
  type: "checkout.session.completed",
  livemode: false,
  created: 1000,
  data: { object: session },
  preserved: { nested: [1, "original"] },
}
const proof = async () => ({
  success: true,
  data: { paymentReference: "pay", orderReference: "order", status: "reserved", paymentStatus: "pending" },
})

function fixture(
  options: {
    account?: unknown
    session?: unknown
    customer?: unknown
    events?: unknown
    eventPage?: (url: URL, count: number) => unknown
    response?: Response
    reject?: boolean
  } = {},
) {
  const calls: { url: string; init?: RequestInit }[] = []
  let clock = 1000000
  let eventCalls = 0
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    if (options.reject) throw new Error("secret provider body https://private/ sk_test_dummy")
    const path = new URL(String(url)).pathname
    if (path === "/stripe/webhook") return options.response ?? Response.json({ ok: true })
    if (path === "/v1/account") return Response.json(options.account ?? { id: "acct_test" })
    if (path === "/v1/checkout/sessions/cs_test_123") return Response.json(options.session ?? session)
    if (path === "/v1/customers/cus_123")
      return Response.json(options.customer ?? { id: "cus_123", livemode: false, metadata })
    if (options.eventPage) return Response.json(options.eventPage(new URL(String(url)), eventCalls++))
    return Response.json(options.events ?? { data: [event], has_more: false })
  }) as typeof fetch
  return {
    calls,
    input: {
      checkpoint,
      organizationId: "org",
      accountId: "acct_test",
      key: "sk_test_dummy",
      secret: "whsec_dummy",
      orderProof: proof,
      fetcher,
      now: () => clock,
      delay: async (ms: number) => {
        clock += ms
      },
    },
  }
}

test("forwards the original event once with its exact HMAC signature", async () => {
  const { calls, input } = fixture()
  expect(await e2eStripeDevelopmentWebhookForward(input)).toEqual({ success: true, data: true })
  const posts = calls.filter((call) => call.init?.method === "POST")
  expect(posts).toHaveLength(1)
  expect(posts[0]?.url).toBe("https://billing.wonder1.de/stripe/webhook")
  expect(posts[0]?.init?.redirect).toBe("error")
  expect(posts[0]?.init?.body).toBe(JSON.stringify(event))
  expect((posts[0]?.init?.headers as Record<string, string> | undefined)?.["stripe-signature"]).toBe(
    `t=1000,v1=${createHmac("sha256", input.secret)
      .update(`1000.${JSON.stringify(event)}`)
      .digest("hex")}`,
  )
})

test("rejects non-development targets, live keys and tampered checkpoint evidence", async () => {
  for (const change of [
    { key: "sk_live_abc" },
    { checkpoint: { ...checkpoint, target: "production" as const } },
    { checkpoint: { ...checkpoint, baseUrl: "https://eventoren.de" as const } },
    { checkpoint: { ...checkpoint, ticket: { ...checkpoint.ticket, eventId: "foreign" } } },
  ]) {
    const { calls, input } = fixture()
    expect((await e2eStripeDevelopmentWebhookForward({ ...input, ...change })).success).toBe(false)
    expect(calls).toHaveLength(0)
  }
})

test("rejects conflicting app states and provider ownership or payment mismatches", async () => {
  for (const options of [
    { account: { id: "acct_other" } },
    { session: { ...session, mode: "subscription" } },
    { session: { ...session, metadata: { ...metadata, order_reference: "foreign" } } },
    { customer: { id: "cus_123", livemode: false, metadata: { ...metadata, organization_id: "foreign" } } },
    { session: { ...session, livemode: true } },
  ]) {
    const { calls, input } = fixture(options)
    expect((await e2eStripeDevelopmentWebhookForward(input)).success).toBe(false)
    expect(calls.some((call) => call.init?.method === "POST")).toBe(false)
  }
  const { input } = fixture()
  expect(
    (
      await e2eStripeDevelopmentWebhookForward({
        ...input,
        orderProof: async () => ({
          success: true,
          data: {
            paymentReference: "pay",
            orderReference: "order",
            status: "paid_inventory_conflict",
            paymentStatus: "paid",
          },
        }),
      })
    ).success,
  ).toBe(false)
})

test("rejects invalid, ambiguous, truncated and missing original events", async () => {
  for (const events of [
    { data: [{ ...event, livemode: true }], has_more: false },
    {
      data: [{ ...event, data: { object: { ...session, metadata: { ...metadata, event_key: "foreign" } } } }],
      has_more: false,
    },
    { data: [event, { ...event, id: "evt_456", livemode: true }], has_more: false },
    { data: [event], has_more: true },
    { data: [], has_more: false },
  ]) {
    const { calls, input } = fixture({ events })
    expect((await e2eStripeDevelopmentWebhookForward(input)).success).toBe(false)
    expect(calls.some((call) => call.init?.method === "POST")).toBe(false)
  }
})

test("redacts network failures and rejects unsuccessful webhook responses", async () => {
  const failed = fixture({ reject: true })
  const result = await e2eStripeDevelopmentWebhookForward(failed.input)
  expect(result.success).toBe(false)
  expect(JSON.stringify(result)).not.toMatch(/secret|sk_test_dummy|private/u)
  for (const response of [
    new Response("provider secret", { status: 500 }),
    Response.json({ ok: false }),
    new Response("invalid json"),
  ]) {
    const { input } = fixture({ response })
    expect((await e2eStripeDevelopmentWebhookForward(input)).success).toBe(false)
  }
})

test("requires the same direct payment intent on both current session and original event", async () => {
  for (const intent of [undefined, null, "invalid", "pi_wrong"]) {
    const current = fixture({ session: { ...session, payment_intent: intent } })
    expect((await e2eStripeDevelopmentWebhookForward(current.input)).success).toBe(false)
    expect(current.calls.some((call) => call.init?.method === "POST")).toBe(false)
    const original = fixture({
      events: { data: [{ ...event, data: { object: { ...session, payment_intent: intent } } }], has_more: false },
    })
    expect((await e2eStripeDevelopmentWebhookForward(original.input)).success).toBe(false)
    expect(original.calls.some((call) => call.init?.method === "POST")).toBe(false)
  }
  const invalidId = fixture({ events: { data: [{ ...event, id: "invalid" }], has_more: false } })
  expect((await e2eStripeDevelopmentWebhookForward(invalidId.input)).success).toBe(false)
})

test("accepts a reused customer with stable ownership and older run references", async () => {
  const { input } = fixture({
    customer: {
      id: "cus_123",
      livemode: false,
      metadata: { ...metadata, event_key: "old-event", payment_reference: "old-payment", order_reference: "old-order" },
    },
  })
  expect((await e2eStripeDevelopmentWebhookForward(input)).success).toBe(true)
})

test("polls until a delayed original event appears", async () => {
  const { input, calls } = fixture({
    eventPage: (_url, count) => ({ data: count < 2 ? [] : [event], has_more: false }),
  })
  expect((await e2eStripeDevelopmentWebhookForward(input)).success).toBe(true)
  expect(calls.filter((call) => new URL(call.url).pathname === "/v1/events")).toHaveLength(3)
})

test("scans all pages before forwarding and rejects a later conflicting match", async () => {
  for (const conflict of [false, true]) {
    const other = { ...event, id: "evt_other", data: { object: { ...session, id: "cs_test_other" } } }
    const { input, calls } = fixture({
      eventPage: (url) => {
        if (!url.searchParams.has("starting_after")) return { data: [event, other], has_more: true }
        expect(url.searchParams.get("starting_after")).toBe("evt_other")
        return { data: conflict ? [{ ...event, id: "evt_conflict", livemode: true }] : [other], has_more: false }
      },
    })
    expect((await e2eStripeDevelopmentWebhookForward(input)).success).toBe(!conflict)
    expect(calls.filter((call) => new URL(call.url).pathname === "/v1/events")).toHaveLength(2)
    expect(calls.filter((call) => call.init?.method === "POST")).toHaveLength(conflict ? 0 : 1)
  }
})
