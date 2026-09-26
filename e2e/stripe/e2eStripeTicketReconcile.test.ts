import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@rstest/core"
import { e2eCheckpointSave } from "../checkpoint/e2eCheckpointSave.ts"
import type { E2eCheckpoint } from "../checkpoint/e2eCheckpointSchema.ts"
import { e2eStripeCleanupScan } from "./e2eStripeCleanupScan.ts"
import { e2eStripeTestClientCreate } from "./e2eStripeTestClientCreate.ts"
import { e2eStripeTicketReconcile } from "./e2eStripeTicketReconcile.ts"

const runId = "abc-12345678-1234-1234-1234-123456789abc"
const eventKey = `ticket-e2e-${runId}`
const org = "org_test"
const metadata = {
  source: "eventoren_ticket",
  event_key: eventKey,
  organization_id: org,
  stripe_mode: "test",
  payment_reference: "payment_123",
  order_reference: "order_123",
}
const checkpoint: E2eCheckpoint = {
  version: 1,
  target: "development",
  baseUrl: "https://eventoren.leonardomora.de",
  runId,
  createdAt: Date.now() - 25 * 60 * 60_000,
  phase: "ticket-unreconciled",
  ticket: {
    step: "payment",
    status: "started",
    eventKey,
    eventTitle: `Ticket E2E ${runId}`,
    participantName: `E2E Participant ${runId}`,
    mailSince: Date.now() - 25 * 60 * 60_000,
    orderId: "app-order",
    stripeSession: "cs_test_123",
  },
}

function fixture(
  options: {
    paid?: boolean
    foreign?: boolean
    account?: string
    intents?: boolean
    invoice?: boolean
    subscription?: boolean
    live?: boolean
    foreignInvoice?: boolean
  } = {},
) {
  const calls: string[] = []
  let status = options.paid ? "complete" : "open"
  let deleted = false
  let subscriptionStatus = "active"
  const session = () => ({
    id: "cs_test_123",
    livemode: options.live ?? false,
    mode: options.subscription ? "subscription" : "payment",
    status,
    payment_status: options.paid ? "paid" : "unpaid",
    customer: "cus_123",
    subscription: options.subscription ? "sub_123" : null,
    metadata,
  })
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(url)).pathname.replace("/v1/", "")
    calls.push(`${init?.method ?? "GET"} ${path}`)
    let body: unknown
    if (path === "account") body = { id: options.account ?? "acct_test" }
    if (path === "checkout/sessions/cs_test_123") body = session()
    if (path === "checkout/sessions/cs_test_123/expire") {
      status = "expired"
      body = session()
    }
    if (path === "customers/cus_123") {
      body =
        init?.method === "DELETE"
          ? { id: "cus_123", deleted: (deleted = true) }
          : deleted
            ? { id: "cus_123", deleted: true }
            : { id: "cus_123", livemode: false, metadata }
    }
    if (path === "checkout/sessions")
      body = {
        data: [session(), ...(options.foreign ? [{ ...session(), id: "cs_test_foreign" }] : [])],
        has_more: false,
      }
    if (path === "subscriptions")
      body = {
        data: options.subscription
          ? [{ id: "sub_123", livemode: false, customer: "cus_123", status: subscriptionStatus, metadata }]
          : [],
        has_more: false,
      }
    if (path === "subscriptions/sub_123") {
      if (init?.method === "DELETE") subscriptionStatus = "canceled"
      body = { id: "sub_123", livemode: false, customer: "cus_123", status: subscriptionStatus, metadata }
    }
    if (path === "payment_intents")
      body = {
        data: options.intents ? [{ id: "pi_123", livemode: false, customer: "cus_123", metadata }] : [],
        has_more: false,
      }
    if (path === "invoices")
      body = {
        data: options.invoice
          ? [
              {
                id: "in_123",
                livemode: false,
                customer: "cus_123",
                metadata: options.foreignInvoice ? { ...metadata, event_key: "foreign" } : metadata,
              },
            ]
          : [],
        has_more: false,
      }
    if (path === "charges")
      body = {
        data: options.paid ? [{ id: "ch_123", livemode: false, customer: "cus_123", payment_intent: "pi_123" }] : [],
        has_more: false,
      }
    return Response.json(body ?? {}, { status: body ? 200 : 404 })
  }) as typeof fetch
  return { calls, stripe: e2eStripeTestClientCreate("sk_test_dummy", fetcher) }
}

const config = (stripe: ReturnType<typeof e2eStripeTestClientCreate>) => ({
  checkpoint,
  organizationId: org,
  accountId: "acct_test",
  key: "sk_test_dummy",
  stripe,
  orderProof: async () => ({
    success: true,
    data: {
      paymentReference: "payment_123",
      orderReference: "order_123",
      status: "checkout_created",
      paymentStatus: "pending",
    },
  }),
})

test("expires only the saved owned unpaid session; retains customer while Billing mapping is unproven", async () => {
  const { calls, stripe } = fixture()
  const result = await e2eStripeTicketReconcile(config(stripe))
  expect(result).toMatchObject({
    success: true,
    data: { customer: "retained", chargesRetained: 0, invoicesRetained: 0 },
  })
  expect(calls).toContain("POST checkout/sessions/cs_test_123/expire")
  expect(calls).not.toContain("DELETE customers/cus_123")
})

test("deletes an unpaid customer only with independent Billing exclusivity proof and verified deletion", async () => {
  const { calls, stripe } = fixture()
  const result = await e2eStripeTicketReconcile({
    ...config(stripe),
    customerExclusive: async (id) => id === "cus_123",
  })
  expect(result).toMatchObject({ success: true, data: { customer: "verified-deleted" } })
  expect(calls).toContain("DELETE customers/cus_123")
})

test("rejects another account, live session, shared customer and foreign invoice before mutation", async () => {
  for (const options of [
    { account: "acct_other" },
    { foreign: true },
    { live: true },
    { invoice: true, foreignInvoice: true },
  ]) {
    const { calls, stripe } = fixture(options)
    expect((await e2eStripeTicketReconcile(config(stripe))).success).toBe(false)
    expect(calls.every((call) => call.startsWith("GET"))).toBe(true)
  }
})

test("reports paid charges and invoices as retained without deleting customer", async () => {
  const { calls, stripe } = fixture({ paid: true, intents: true, invoice: true })
  const result = await e2eStripeTicketReconcile({
    ...config(stripe),
    orderProof: async () => ({
      success: true,
      data: { paymentReference: "payment_123", orderReference: "order_123", status: "paid", paymentStatus: "paid" },
    }),
    customerExclusive: async () => true,
  })
  expect(result).toMatchObject({
    success: true,
    data: { chargesRetained: 1, invoicesRetained: 1, customer: "retained" },
  })
  expect(calls.every((call) => call.startsWith("GET"))).toBe(true)
})

test("cancels only a matching test subscription and verifies its terminal state", async () => {
  const { calls, stripe } = fixture({ subscription: true })
  const result = await e2eStripeTicketReconcile(config(stripe))
  expect(result).toMatchObject({ success: true, data: { subscriptionsCanceled: 1, customer: "retained" } })
  expect(calls).toContain("DELETE subscriptions/sub_123")
  expect(calls).toContain("POST checkout/sessions/cs_test_123/expire")
})

test("fails closed for mismatched app order, foreign metadata and live credentials", async () => {
  const { calls, stripe } = fixture()
  expect((await e2eStripeTicketReconcile({ ...config(stripe), key: "sk_live_bad" })).success).toBe(false)
  expect((await e2eStripeTicketReconcile({ ...config(stripe), organizationId: "foreign" })).success).toBe(false)
  expect(
    (await e2eStripeTicketReconcile({ ...config(stripe), orderProof: async () => ({ success: false }) })).success,
  ).toBe(false)
  expect(calls.every((call) => call.startsWith("GET"))).toBe(true)
})

test("sweeps a stale failed run and successful current run, preserving checkpoint and current failure", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-stripe-test-"))
  try {
    expect((await e2eCheckpointSave(directory, checkpoint)).success).toBe(true)
    const before = await readFile(join(directory, "checkpoint.json"), "utf8")
    let swept = 0
    const reconcile = (async () => {
      swept++
      return { success: false as const, op: "test", errorMessage: "uncertain" }
    }) as typeof e2eStripeTicketReconcile
    const input = { directory, target: checkpoint, config: config(fixture().stripe), reconcile }
    expect((await e2eStripeCleanupScan(input)).success).toBe(false)
    expect(swept).toBe(1)
    expect(await readFile(join(directory, "checkpoint.json"), "utf8")).toBe(before)
    expect((await e2eStripeCleanupScan({ ...input, now: checkpoint.createdAt + 1000 })).data).toEqual({
      status: "preserved-current-run",
    })
    expect(swept).toBe(1)
    const done = {
      ...checkpoint,
      ticket: { ...checkpoint.ticket!, step: "done" as const, status: "completed" as const },
    }
    // Separate checkpoint: progression cannot skip steps through the safe save API.
    const another = await mkdtemp(join(tmpdir(), "eventoren-stripe-done-"))
    try {
      expect((await e2eCheckpointSave(another, done)).success).toBe(true)
      expect((await e2eStripeCleanupScan({ ...input, directory: another, now: done.createdAt + 1000 })).success).toBe(
        false,
      )
      expect(swept).toBe(2)
    } finally {
      await rm(another, { recursive: true, force: true })
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("does not infer an orphan checkout from an order without a saved Stripe session", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-stripe-orphan-"))
  try {
    expect(
      (
        await e2eCheckpointSave(directory, {
          ...checkpoint,
          ticket: { ...checkpoint.ticket!, stripeSession: undefined },
        })
      ).success,
    ).toBe(true)
    const before = await readFile(join(directory, "checkpoint.json"), "utf8")
    let called = false
    const result = await e2eStripeCleanupScan({
      directory,
      target: checkpoint,
      reconcile: (async () => {
        called = true
        return { success: true, data: {} }
      }) as typeof e2eStripeTicketReconcile,
      config: config(fixture().stripe),
    })
    expect(result.success).toBe(false)
    expect(called).toBe(false)
    expect(await readFile(join(directory, "checkpoint.json"), "utf8")).toBe(before)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
