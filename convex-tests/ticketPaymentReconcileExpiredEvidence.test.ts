import { getFunctionName } from "convex/server"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import type { Id } from "../convex/_generated/dataModel.js"
import type { ActionCtx } from "../convex/_generated/server.js"
import { createResult, createResultError } from "#result"
import { billingEventorenClient } from "../src/ticketing/convex/billingEventorenClient.js"
import { ticketPaymentReconcileAction } from "../src/ticketing/convex/ticketPaymentReconcileAction.js"
import { ticketPaymentReconcileScheduledAction } from "../src/ticketing/convex/ticketPaymentReconcileScheduledAction.js"

const orderId = "order" as Id<"ticketOrders">
const providerPayment = {
  paymentReference: "payment_reconcile_evidence",
  orderReference: "order_billing",
  stripeMode: "test" as const,
  status: "expired" as const,
  payment: "expired" as const,
  expiresAt: null,
  bookingNumber: null,
  bookingReference: null,
}
const localContext = {
  paymentReference: providerPayment.paymentReference,
  stripeMode: "test" as const,
  billingOrderReference: providerPayment.orderReference,
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

/** The explicit reconciliation reads the local payment context of the order. */
function reconcileContextCreate() {
  const runQuery = vi.fn().mockResolvedValue(createResult(localContext))
  const runMutation = vi
    .fn()
    .mockResolvedValue(createResult({ orderId, status: "expired", paymentStatus: "expired", ticketCount: 0 }))
  const ctx = { runQuery, runMutation, scheduler: { runAfter: vi.fn() } } as unknown as ActionCtx
  return { ctx, runQuery, runMutation }
}

/** The scheduled reconciliation reads the active contexts and one terminal page. */
function scheduledContextCreate() {
  const runQuery = vi
    .fn()
    .mockResolvedValueOnce(createResult([{ orderId, ...localContext }]))
    .mockResolvedValueOnce(createResult({ contexts: [], isDone: true, continueCursor: "done" }))
  const runMutation = vi
    .fn()
    .mockResolvedValue(createResult({ orderId, status: "expired", paymentStatus: "expired", ticketCount: 0 }))
  const ctx = { runQuery, runMutation, scheduler: { runAfter: vi.fn() } } as unknown as ActionCtx
  return { ctx, runQuery, runMutation }
}

function mutationNames(runMutation: ReturnType<typeof vi.fn>): string[] {
  return runMutation.mock.calls.map(([reference]) => getFunctionName(reference))
}

test("explicit reconciliation claims the trusted expiry evidence for the matching expired payment", async () => {
  const { ctx, runMutation } = reconcileContextCreate()
  vi.spyOn(billingEventorenClient, "statusGet").mockResolvedValue(
    createResult({ kind: "status", data: providerPayment }),
  )
  await ticketPaymentReconcileAction._handler(ctx, { orderId, guestAccessToken: "a".repeat(32) })
  expect(mutationNames(runMutation)).toEqual(["ticketing:ticketReservationExpireMutation"])
  expect(runMutation.mock.calls[0]![1]).toMatchObject({
    orderId,
    paymentReference: providerPayment.paymentReference,
    billingOrderReference: providerPayment.orderReference,
    stripeMode: "test",
    paymentConfirmedExpired: true,
  })
})

test("explicit reconciliation never claims the trusted expiry evidence for a pending payment", async () => {
  const { ctx, runMutation } = reconcileContextCreate()
  vi.spyOn(billingEventorenClient, "statusGet").mockResolvedValue(
    createResult({
      kind: "status",
      data: { ...providerPayment, status: "checkout_created", payment: "pending" },
    }),
  )
  await ticketPaymentReconcileAction._handler(ctx, { orderId, guestAccessToken: "a".repeat(32) })
  expect(mutationNames(runMutation)).toEqual(["ticketing:ticketPaymentStatusApplyMutation"])
  expect(runMutation.mock.calls[0]![1]).not.toHaveProperty("paymentConfirmedExpired")
})

test("explicit reconciliation never claims the trusted expiry evidence for a foreign payment response", async () => {
  const { ctx, runMutation } = reconcileContextCreate()
  vi.spyOn(billingEventorenClient, "statusGet").mockResolvedValue(
    createResult({
      kind: "status",
      data: { ...providerPayment, paymentReference: "payment_foreign" },
    }),
  )
  await ticketPaymentReconcileAction._handler(ctx, { orderId, guestAccessToken: "a".repeat(32) })
  expect(mutationNames(runMutation)).toEqual(["ticketing:ticketReservationExpireMutation"])
  expect(runMutation.mock.calls[0]![1]).toMatchObject({ paymentConfirmedExpired: false })
})

test("explicit reconciliation never claims the trusted expiry evidence when the provider fails", async () => {
  const { ctx, runMutation } = reconcileContextCreate()
  vi.spyOn(billingEventorenClient, "statusGet").mockResolvedValue(createResultError("provider", "Unavailable"))
  expect(await ticketPaymentReconcileAction._handler(ctx, { orderId, guestAccessToken: "a".repeat(32) })).toMatchObject(
    { success: false },
  )
  expect(runMutation).not.toHaveBeenCalled()
})

test("scheduled reconciliation claims the trusted expiry evidence for the matching expired payment", async () => {
  const { ctx, runMutation } = scheduledContextCreate()
  vi.spyOn(billingEventorenClient, "statusGet").mockResolvedValue(
    createResult({ kind: "status", data: providerPayment }),
  )
  expect(await ticketPaymentReconcileScheduledAction._handler(ctx, {})).toMatchObject({
    success: true,
    data: { checked: 1 },
  })
  expect(mutationNames(runMutation)).toEqual(["ticketing:ticketReservationExpireMutation"])
  expect(runMutation.mock.calls[0]![1]).toMatchObject({
    orderId,
    paymentReference: providerPayment.paymentReference,
    billingOrderReference: providerPayment.orderReference,
    stripeMode: "test",
    paymentConfirmedExpired: true,
  })
})

test("scheduled reconciliation never claims the trusted expiry evidence for a pending payment", async () => {
  const { ctx, runMutation } = scheduledContextCreate()
  vi.spyOn(billingEventorenClient, "statusGet").mockResolvedValue(
    createResult({
      kind: "status",
      data: { ...providerPayment, status: "checkout_created", payment: "pending" },
    }),
  )
  await ticketPaymentReconcileScheduledAction._handler(ctx, {})
  expect(mutationNames(runMutation)).toEqual(["ticketing:ticketPaymentStatusApplyMutation"])
  expect(runMutation.mock.calls[0]![1]).not.toHaveProperty("paymentConfirmedExpired")
})

test("scheduled reconciliation never claims the trusted expiry evidence for a foreign payment response", async () => {
  const { ctx, runMutation } = scheduledContextCreate()
  vi.spyOn(billingEventorenClient, "statusGet").mockResolvedValue(
    createResult({
      kind: "status",
      data: { ...providerPayment, paymentReference: "payment_foreign" },
    }),
  )
  await ticketPaymentReconcileScheduledAction._handler(ctx, {})
  expect(mutationNames(runMutation)).toEqual(["ticketing:ticketReservationExpireMutation"])
  expect(runMutation.mock.calls[0]![1]).toMatchObject({ paymentConfirmedExpired: false })
})

test("scheduled reconciliation never claims the trusted expiry evidence when the provider fails", async () => {
  const { ctx, runMutation } = scheduledContextCreate()
  vi.spyOn(billingEventorenClient, "statusGet").mockResolvedValue(createResultError("provider", "Unavailable"))
  expect(await ticketPaymentReconcileScheduledAction._handler(ctx, {})).toMatchObject({ success: true })
  expect(mutationNames(runMutation)).toEqual(["ticketing:ticketPaymentReconcileFailureMutation"])
  expect(runMutation.mock.calls[0]![1]).not.toHaveProperty("paymentConfirmedExpired")
})

test("scheduled reconciliation never claims the trusted expiry evidence for an unknown payment", async () => {
  const { ctx, runMutation } = scheduledContextCreate()
  vi.spyOn(billingEventorenClient, "statusGet").mockResolvedValue(createResult({ kind: "not_found" }))
  expect(await ticketPaymentReconcileScheduledAction._handler(ctx, {})).toMatchObject({ success: true })
  expect(mutationNames(runMutation)).toEqual(["ticketing:ticketPaymentReconcileFailureMutation"])
  expect(runMutation.mock.calls[0]![1]).not.toHaveProperty("paymentConfirmedExpired")
})
