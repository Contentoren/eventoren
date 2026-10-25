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

const historyMetadata = (n: number) => ({
  source: "eventoren_ticket",
  event_key: `ticket-e2e-hist-${n}`,
  organization_id: org,
  stripe_mode: "test",
  payment_reference: `payment_hist_${n}`,
  order_reference: `order_hist_${n}`,
})
const staleCustomerMetadata = {
  source: "eventoren_ticket",
  event_key: "ticket-e2e-first-run",
  organization_id: org,
  stripe_mode: "test",
  payment_reference: "payment_first",
  order_reference: "order_first",
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
    staleCustomer?: boolean
    sharedHistory?: boolean
    sharedSessionsOnly?: boolean
    invalidCustomer?: "source" | "org" | "mode" | "empty"
    malformedEntry?: "intent" | "invoice" | "session" | "subscription"
    partialCollision?: "payment" | "order"
    partialCollisionEntry?: "session" | "subscription" | "intent" | "invoice"
    orphanCharge?: boolean
    missingSaved?: boolean
    unlinkedSub?: boolean
    multipleCurrentIntents?: boolean
  } = {},
) {
  const calls: string[] = []
  let status = options.paid ? "complete" : "open"
  let deleted = false
  const subStatus = new Map<string, string>()
  const customerMetadata = (): Record<string, string> => {
    if (options.invalidCustomer === "source") return { ...metadata, source: "other" }
    if (options.invalidCustomer === "org") return { ...metadata, organization_id: "foreign" }
    if (options.invalidCustomer === "mode") return { ...metadata, stripe_mode: "live" }
    if (options.invalidCustomer === "empty") return {}
    if (options.staleCustomer || options.sharedHistory) return { ...staleCustomerMetadata }
    return { ...metadata }
  }
  const partialMetadata = (): Record<string, string> =>
    options.partialCollision === "payment"
      ? { ...metadata, order_reference: "order_other" }
      : { ...metadata, payment_reference: "payment_other" }
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
  const sessionEntries = () => {
    const entries: ReturnType<typeof session>[] = []
    if (!options.missingSaved) entries.push(session())
    if (options.foreign) entries.push({ ...session(), id: "cs_test_foreign" })
    if (options.sharedHistory || options.sharedSessionsOnly)
      for (const n of [1, 2])
        entries.push({
          ...session(),
          id: `cs_test_hist_${n}`,
          mode: "payment",
          status: "complete",
          payment_status: "paid",
          subscription: null,
          metadata: historyMetadata(n),
        })
    if (options.malformedEntry === "session") entries.push({ ...session(), id: "cs_test_bad", metadata: {} })
    if (options.partialCollision && options.partialCollisionEntry === "session")
      entries.push({ ...session(), id: "cs_test_partial", metadata: partialMetadata() })
    return entries
  }
  const subEntries = () => {
    const entries: { id: string; metadata: Record<string, string> }[] = []
    if (options.subscription) entries.push({ id: "sub_123", metadata })
    if (options.unlinkedSub) entries.push({ id: "sub_999", metadata })
    if (options.sharedHistory)
      for (const n of [1, 2]) entries.push({ id: `sub_hist_${n}`, metadata: historyMetadata(n) })
    if (options.malformedEntry === "subscription") entries.push({ id: "sub_bad", metadata: {} })
    if (options.partialCollision && options.partialCollisionEntry === "subscription")
      entries.push({ id: "sub_partial", metadata: partialMetadata() })
    for (const entry of entries) if (!subStatus.has(entry.id)) subStatus.set(entry.id, "active")
    return entries
  }
  const intentEntries = () => {
    const entries: { id: string; metadata: Record<string, string> }[] = []
    if (options.intents || options.paid || options.multipleCurrentIntents) entries.push({ id: "pi_123", metadata })
    if (options.multipleCurrentIntents) entries.push({ id: "pi_124", metadata })
    if (options.sharedHistory)
      for (const n of [1, 2]) entries.push({ id: `pi_hist_${n}`, metadata: historyMetadata(n) })
    if (options.malformedEntry === "intent") entries.push({ id: "pi_bad", metadata: {} })
    if (options.partialCollision && options.partialCollisionEntry === "intent")
      entries.push({ id: "pi_partial", metadata: partialMetadata() })
    return entries
  }
  const invoiceEntries = () => {
    const entries: { id: string; metadata: Record<string, string> }[] = []
    if (options.invoice)
      entries.push({
        id: "in_123",
        metadata: options.foreignInvoice ? { ...metadata, event_key: "foreign" } : metadata,
      })
    if (options.sharedHistory) entries.push({ id: "in_hist_1", metadata: historyMetadata(1) })
    if (options.malformedEntry === "invoice") entries.push({ id: "in_bad", metadata: {} })
    if (options.partialCollision && options.partialCollisionEntry === "invoice")
      entries.push({ id: "in_partial", metadata: partialMetadata() })
    return entries
  }
  const chargeEntries = () => {
    const entries: { id: string; payment_intent: string }[] = []
    if (options.paid) entries.push({ id: "ch_123", payment_intent: "pi_123" })
    if (options.sharedHistory)
      for (const n of [1, 2]) entries.push({ id: `ch_hist_${n}`, payment_intent: `pi_hist_${n}` })
    if (options.orphanCharge) entries.push({ id: "ch_orphan", payment_intent: "pi_missing" })
    return entries
  }
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
            : { id: "cus_123", livemode: false, metadata: customerMetadata() }
    }
    if (path === "checkout/sessions") body = { data: sessionEntries(), has_more: false }
    if (path === "subscriptions")
      body = {
        data: subEntries().map((entry) => ({
          id: entry.id,
          livemode: false,
          customer: "cus_123",
          status: subStatus.get(entry.id),
          metadata: entry.metadata,
        })),
        has_more: false,
      }
    if (path.startsWith("subscriptions/sub_")) {
      const id = path.replace("subscriptions/", "")
      const entry = subEntries().find((candidate) => candidate.id === id)
      if (entry) {
        if (init?.method === "DELETE") subStatus.set(id, "canceled")
        body = {
          id,
          livemode: false,
          customer: "cus_123",
          status: subStatus.get(id),
          metadata: entry.metadata,
        }
      }
    }
    if (path === "payment_intents")
      body = {
        data: intentEntries().map((entry) => ({
          id: entry.id,
          livemode: false,
          customer: "cus_123",
          metadata: entry.metadata,
        })),
        has_more: false,
      }
    if (path === "invoices")
      body = {
        data: invoiceEntries().map((entry) => ({
          id: entry.id,
          livemode: false,
          customer: "cus_123",
          metadata: entry.metadata,
        })),
        has_more: false,
      }
    if (path === "charges")
      body = {
        data: chargeEntries().map((entry) => ({
          id: entry.id,
          livemode: false,
          customer: "cus_123",
          payment_intent: entry.payment_intent,
        })),
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

const paidConfig = (stripe: ReturnType<typeof e2eStripeTestClientCreate>) => ({
  ...config(stripe),
  orderProof: async () => ({
    success: true,
    data: {
      paymentReference: "payment_123",
      orderReference: "order_123",
      status: "paid",
      paymentStatus: "paid",
    },
  }),
})

const expectNoMutation = (calls: string[]) => {
  expect(calls.every((call) => call.startsWith("GET"))).toBe(true)
}

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
    expectNoMutation(calls)
  }
})

test("reports paid charges and invoices as retained without deleting customer", async () => {
  const { calls, stripe } = fixture({ paid: true, intents: true, invoice: true })
  const result = await e2eStripeTicketReconcile({
    ...paidConfig(stripe),
    customerExclusive: async () => true,
  })
  expect(result).toMatchObject({
    success: true,
    data: { chargesRetained: 1, invoicesRetained: 1, customer: "retained" },
  })
  expectNoMutation(calls)
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
  expectNoMutation(calls)
})

test("retains reused-customer history and expires only the saved unpaid session with its linked subscription", async () => {
  const { calls, stripe } = fixture({ staleCustomer: true, sharedHistory: true, subscription: true })
  const result = await e2eStripeTicketReconcile(config(stripe))
  expect(result).toMatchObject({
    success: true,
    data: {
      customer: "retained",
      subscriptionsCanceled: 1,
      chargesRetained: 2,
      invoicesRetained: 1,
      paymentIntentsRetained: 2,
    },
  })
  expect(calls).toContain("POST checkout/sessions/cs_test_123/expire")
  expect(calls).toContain("DELETE subscriptions/sub_123")
  expect(calls.some((call) => call.includes("sub_hist"))).toBe(false)
  expect(calls).not.toContain("DELETE customers/cus_123")
})

test("reports a paid checkout with reused-customer history as retained without any mutation", async () => {
  const { calls, stripe } = fixture({ paid: true, sharedHistory: true, invoice: true })
  const result = await e2eStripeTicketReconcile({
    ...paidConfig(stripe),
    customerExclusive: async () => true,
  })
  expect(result).toMatchObject({
    success: true,
    data: {
      customer: "retained",
      subscriptionsCanceled: 0,
      chargesRetained: 3,
      invoicesRetained: 2,
      paymentIntentsRetained: 3,
    },
  })
  expectNoMutation(calls)
})

test("never deletes a shared or stale historical customer even when Billing reports exclusivity", async () => {
  for (const options of [{ sharedHistory: true }, { staleCustomer: true }, { sharedSessionsOnly: true }]) {
    const { calls, stripe } = fixture(options)
    let exclusiveCalled = false
    const result = await e2eStripeTicketReconcile({
      ...config(stripe),
      customerExclusive: async () => {
        exclusiveCalled = true
        return true
      },
    })
    expect(result).toMatchObject({ success: true, data: { customer: "retained" } })
    expect(exclusiveCalled).toBe(false)
    expect(calls).not.toContain("DELETE customers/cus_123")
  }
})

test("rejects invalid stable customer fields before mutation", async () => {
  for (const invalidCustomer of ["source", "org", "mode", "empty"] as const) {
    const { calls, stripe } = fixture({ invalidCustomer })
    expect((await e2eStripeTicketReconcile(config(stripe))).success).toBe(false)
    expectNoMutation(calls)
  }
})

test("rejects malformed entry metadata before mutation", async () => {
  for (const malformedEntry of ["intent", "invoice", "session", "subscription"] as const) {
    const { calls, stripe } = fixture({ malformedEntry })
    expect((await e2eStripeTicketReconcile(config(stripe))).success).toBe(false)
    expectNoMutation(calls)
  }
})

test("rejects partial current reference collisions in each provider object before mutation", async () => {
  for (const partialCollision of ["payment", "order"] as const) {
    for (const partialCollisionEntry of ["session", "subscription", "intent", "invoice"] as const) {
      const { calls, stripe } = fixture({ partialCollision, partialCollisionEntry })
      expect((await e2eStripeTicketReconcile(config(stripe))).success).toBe(false)
      expectNoMutation(calls)
    }
  }
})

test("rejects orphan charges, missing saved discovery, unlinked current subscriptions and multiple current intents", async () => {
  for (const options of [
    { orphanCharge: true },
    { missingSaved: true, sharedHistory: true },
    { unlinkedSub: true },
    { multipleCurrentIntents: true },
  ]) {
    const { calls, stripe } = fixture(options)
    expect((await e2eStripeTicketReconcile(config(stripe))).success).toBe(false)
    expectNoMutation(calls)
  }
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
