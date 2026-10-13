import { getFunctionName } from "convex/server"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import type { ActionCtx } from "../convex/_generated/server.js"
import type { Id } from "../convex/_generated/dataModel.js"
import { createResult, createResultError } from "#result"
import { billingEventorenClient } from "../src/ticketing/convex/billingEventorenClient.js"
import { ticketPaymentReconcileAction } from "../src/ticketing/convex/ticketPaymentReconcileAction.js"
import { ticketPaymentReconcileScheduledAction } from "../src/ticketing/convex/ticketPaymentReconcileScheduledAction.js"
import { ticketReservationExpireAction } from "../src/ticketing/convex/ticketReservationExpireAction.js"

const orderId = "order" as Id<"ticketOrders">
const evidence = {
  checkoutCompletedAt: "2026-10-02T12:00:00.000Z",
  paymentMethodType: "sepa_debit",
  stripePaymentIntentStatus: "processing" as const,
}
const payment = {
  paymentReference: "payment_reconciliation",
  orderReference: "order_billing",
  stripeMode: "test" as const,
  status: "checkout_created" as const,
  payment: "pending" as const,
  expiresAt: null,
  bookingNumber: null,
  bookingReference: null,
  ...evidence,
}
const cancellation = {
  cancelledAt: "2026-10-03T12:00:00.000Z",
  organizationId: "eventoren-test",
  eventKey: "event",
  orderReference: payment.orderReference,
  paymentReference: payment.paymentReference,
  stripeMode: "test" as const,
  paymentMethodType: "sepa_debit" as const,
  stripeEventId: "evt_dispute",
  stripeSessionId: "cs_test_reconciliation",
  stripePaymentIntentId: "pi_reconciliation",
  reason: "sepa_disputed" as const,
  stripeEventType: "charge.dispute.created" as const,
  stripeChargeId: "ch_reconciliation",
  stripeDisputeId: "dp_reconciliation",
}

beforeEach(() => {
  vi.stubEnv("EVENTOREN_BILLING_BASE_URL", "https://billing.test")
  vi.stubEnv("EVENTOREN_BILLING_ORGANIZATION_ID", "eventoren-test")
  vi.stubEnv("EVENTOREN_BILLING_API_CREDENTIAL", "bapi_test")
  vi.stubEnv("EVENTOREN_BILLING_STRIPE_MODE", "test")
  vi.stubEnv("EVENTOREN_PUBLIC_BASE_URL", "https://eventoren.test")
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

function contextCreate() {
  const runQuery = vi.fn().mockResolvedValue(
    createResult({
      paymentReference: payment.paymentReference,
      stripeMode: "test",
      billingOrderReference: payment.orderReference,
      status: "checkout_created",
      paymentStatus: "pending",
    }),
  )
  const runMutation = vi.fn().mockResolvedValue(
    createResult({
      orderId,
      status: "checkout_created",
      paymentStatus: "pending",
      ticketCount: 1,
    }),
  )
  const runAfter = vi.fn()
  const ctx = { runQuery, runMutation, scheduler: { runAfter } } as unknown as ActionCtx
  return { ctx, runQuery, runMutation, runAfter }
}

test("explicit reconciliation fetches an already-paid order and forwards one response's full cancellation evidence", async () => {
  const { ctx, runQuery, runMutation } = contextCreate()
  runQuery.mockResolvedValue(
    createResult({ paymentReference: payment.paymentReference, stripeMode: "test", status: "paid" }),
  )
  const settled = {
    ...payment,
    payment: "paid" as const,
    stripePaymentIntentStatus: "succeeded" as const,
    cancellation,
  }
  const statusGet = vi
    .spyOn(billingEventorenClient, "statusGet")
    .mockResolvedValue(createResult({ kind: "status", data: settled }))
  await ticketPaymentReconcileAction._handler(ctx, { orderId, guestAccessToken: "a".repeat(32) })
  expect(statusGet).toHaveBeenCalledOnce()
  expect(getFunctionName(runMutation.mock.calls[0]![0])).toBe("ticketing:ticketPaymentStatusApplyMutation")
  expect(runMutation.mock.calls[0]![1]).toMatchObject({
    orderId,
    ...evidence,
    payment: "paid",
    stripePaymentIntentStatus: "succeeded",
    cancellation,
  })
})

test("scheduled reconciliation applies completion evidence even without booking details and records no duplicate fetch", async () => {
  const { ctx, runQuery, runMutation, runAfter } = contextCreate()
  runQuery
    .mockResolvedValueOnce(createResult([{ orderId, paymentReference: payment.paymentReference, stripeMode: "test" }]))
    .mockResolvedValueOnce(createResult({ contexts: [], isDone: true, continueCursor: "done" }))
  const statusGet = vi
    .spyOn(billingEventorenClient, "statusGet")
    .mockResolvedValue(createResult({ kind: "status", data: payment }))
  expect(await ticketPaymentReconcileScheduledAction._handler(ctx, {})).toMatchObject({
    success: true,
    data: { checked: 1 },
  })
  expect(statusGet).toHaveBeenCalledOnce()
  expect(runMutation.mock.calls[0]![1]).toMatchObject({ orderId, ...evidence, payment: "pending" })
  expect(runAfter.mock.calls[0]![2]).toMatchObject({ scan: { status: "released", activeOrderIds: [orderId] } })
})

test("local expiry applies a provider-completed but locally-unissued processing debit before scheduling its retry", async () => {
  const { ctx, runMutation } = contextCreate()
  vi.spyOn(billingEventorenClient, "ticketCheckoutExpire").mockResolvedValue(
    createResult({ kind: "status", data: payment }),
  )
  expect(await ticketReservationExpireAction._handler(ctx, { orderId })).toMatchObject({
    success: true,
    data: { action: "deferred" },
  })
  expect(runMutation.mock.calls.map(([reference]) => getFunctionName(reference))).toEqual([
    "ticketing:ticketPaymentStatusApplyMutation",
    "ticketing:ticketReservationDeferMutation",
  ])
  expect(runMutation.mock.calls[0]![1]).toMatchObject({ orderId, ...evidence, payment: "pending" })
})

test("scheduled reconciliation forwards cancellation without combining evidence from the selected local context", async () => {
  const { ctx, runQuery, runMutation } = contextCreate()
  runQuery
    .mockResolvedValueOnce(
      createResult([
        {
          orderId,
          paymentReference: payment.paymentReference,
          stripeMode: "test",
          ...evidence,
        },
      ]),
    )
    .mockResolvedValueOnce(createResult({ contexts: [], isDone: true, continueCursor: "done" }))
  vi.spyOn(billingEventorenClient, "statusGet").mockResolvedValue(
    createResult({
      kind: "status",
      data: {
        ...payment,
        checkoutCompletedAt: null,
        paymentMethodType: null,
        stripePaymentIntentStatus: null,
        cancellation,
      },
    }),
  )
  await ticketPaymentReconcileScheduledAction._handler(ctx, {})
  expect(runMutation.mock.calls[0]![1]).toMatchObject({
    cancellation,
    checkoutCompletedAt: null,
    paymentMethodType: null,
    stripePaymentIntentStatus: null,
  })
})

test("old provider responses do not invent early issuance evidence or cancellation", async () => {
  const { ctx, runMutation } = contextCreate()
  const { checkoutCompletedAt, paymentMethodType, stripePaymentIntentStatus, ...legacy } = payment
  vi.spyOn(billingEventorenClient, "statusGet").mockResolvedValue(createResult({ kind: "status", data: legacy }))
  await ticketPaymentReconcileAction._handler(ctx, { orderId, guestAccessToken: "a".repeat(32) })
  for (const key of ["checkoutCompletedAt", "paymentMethodType", "stripePaymentIntentStatus", "cancellation"])
    expect(runMutation.mock.calls[0]![1]).not.toHaveProperty(key)
})

test("local expiry applies cancellation and booking evidence rather than dropping it", async () => {
  const { ctx, runMutation } = contextCreate()
  vi.spyOn(billingEventorenClient, "ticketCheckoutExpire").mockResolvedValue(
    createResult({
      kind: "status",
      data: {
        ...payment,
        payment: "paid",
        bookingNumber: 42,
        bookingReference: "booking",
        cancellation,
      },
    }),
  )
  await ticketReservationExpireAction._handler(ctx, { orderId })
  expect(runMutation.mock.calls[0]![1]).toMatchObject({
    ...evidence,
    cancellation,
    bookingNumber: 42,
    bookingReference: "booking",
  })
})

test("provider failure during local expiry only defers; it never releases or applies guessed evidence", async () => {
  const { ctx, runMutation } = contextCreate()
  vi.spyOn(billingEventorenClient, "ticketCheckoutExpire").mockResolvedValue(
    createResultError("provider", "Unavailable"),
  )
  expect(await ticketReservationExpireAction._handler(ctx, { orderId })).toMatchObject({ success: false })
  expect(runMutation.mock.calls.map(([reference]) => getFunctionName(reference))).toEqual([
    "ticketing:ticketReservationDeferMutation",
  ])
})
