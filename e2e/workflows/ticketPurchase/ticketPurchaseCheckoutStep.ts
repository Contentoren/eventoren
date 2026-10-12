import { isDeepStrictEqual } from "node:util"
import { expect } from "@rstest/playwright"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api.js"
import { e2eCheckpointLoad } from "../../checkpoint/e2eCheckpointLoad.ts"
import { e2eCheckpointSave } from "../../checkpoint/e2eCheckpointSave.ts"
import type { E2eCheckpoint } from "../../checkpoint/e2eCheckpointSchema.ts"
import { e2eTicketBackendResolve } from "../../config/e2eTicketBackendResolve.ts"
import { e2eStripeTestClientCreate } from "../../stripe/e2eStripeTestClientCreate.ts"
import { ticketE2eAdminSignIn } from "../ticketE2eAdminSignIn.ts"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseCheckoutEvidenceCheck } from "./ticketPurchaseCheckoutEvidenceCheck.ts"
import { ticketPurchaseCheckoutProofCheck } from "./ticketPurchaseCheckoutProofCheck.ts"
import { ticketPurchaseBillingReadinessProve } from "./ticketPurchaseBillingReadinessProve.ts"
import { ticketPurchaseStepRun } from "./ticketPurchaseStepRun.ts"

type CheckoutProofInput = {
  client?: ConvexHttpClient
  environment?: Record<string, string | undefined>
  orderProof?: Parameters<typeof ticketPurchaseCheckoutProofCheck>[0]["orderProof"]
  orderDiscovery?: Parameters<typeof ticketPurchaseCheckoutProofCheck>[0]["orderDiscovery"]
  stripe?: Parameters<typeof ticketPurchaseCheckoutProofCheck>[0]["stripe"]
  stripeKey?: string
  stripeAccountId?: string
  stripeOrganizationId?: string
  billingReadinessProve?: () => Promise<void>
}

export async function ticketPurchaseCheckoutStep(
  context: TicketPurchaseContext,
  input: CheckoutProofInput = {},
): Promise<void> {
  const ticket = context.checkpoint.ticket
  if (
    (ticket.step === "checkout" && ticket.status === "completed") ||
    ["payment", "delivery", "pdf", "access", "checkin", "duplicate", "done"].includes(ticket.step)
  ) {
    await ticketPurchaseCheckoutEvidenceCheck(context)
    return
  }
  // Uncertain checkout-started reaches this child through the runner gate
  // because this step proves the exact run before creating: a proven own
  // session/order is adopted with the same run intent and completed without
  // a new browser session, a proven global absence permits a single browser
  // create with the same run intent, and every partial/multiple/foreign or
  // unproven case retains without mutation. Completed checkout above skips
  // mutation entirely.
  if (ticket.step === "checkout" && ticket.status === "started") {
    await ticketPurchaseCheckoutStartedReconcile(context, input)
    return
  }
  // Fresh checkout never starts against an unregistered catalog version:
  // the shared Billing readiness proof runs before any browser/order
  // create. An already-proven existing checkout/payment receipt is adopted
  // elsewhere without requiring catalog readiness.
  const readiness =
    input.billingReadinessProve ??
    (() => ticketPurchaseBillingReadinessProve(context, { client: input.client, environment: input.environment }))
  await ticketPurchaseStepRun(context, "checkout", false, async (_completed, record) => {
    await readiness()
    await checkoutBrowserCreate(context, record)
  })
}

async function ticketPurchaseCheckoutStartedReconcile(
  context: TicketPurchaseContext,
  input: CheckoutProofInput,
): Promise<void> {
  const runId = context.checkpoint.runId
  const ticket = context.checkpoint.ticket
  if (
    ticket.eventKey !== `ticket-e2e-${runId}` ||
    ticket.eventTitle !== `Ticket E2E ${runId}` ||
    ticket.participantName !== `E2E Participant ${runId}`
  )
    throw new Error("Ticket marker does not match the run; reconcile manually")
  const environment = input.environment ?? process.env
  const backend = e2eTicketBackendResolve(environment)
  if (!backend.success) throw new Error(backend.errorMessage)
  const adminClient = input.client ?? new ConvexHttpClient(backend.data.convexUrl)
  let orderProof = input.orderProof
  let sessionToken: string | null = null
  if (!orderProof || !input.orderDiscovery) {
    await ticketE2eAdminSignIn(context.page, context.baseUrl)
    try {
      const session = await context.page.evaluate(async () => {
        const response = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" })
        if (!response.ok) throw new Error(`/api/session returned ${response.status}`)
        const body = (await response.json()) as { session: { token: string } | null }
        return body.session
      })
      sessionToken = session?.token ?? null
    } catch {
      throw new Error("Admin session proof unavailable; reconcile manually")
    }
    if (!sessionToken) throw new Error("Admin session proof unavailable; reconcile manually")
  }
  if (!orderProof) {
    const memoryToken = sessionToken as string
    orderProof = async (orderId, eventKey, proofRunId, runCreatedAt) => {
      try {
        return await adminClient.query(api.ticketing.ticketE2eOrderProofQuery, {
          token: memoryToken,
          orderId,
          eventKey,
          runId: proofRunId,
          runCreatedAt,
        })
      } catch {
        return { success: false as const, errorMessage: "App order proof unavailable; checkpoint retained" }
      }
    }
  }
  const stripeKey = input.stripeKey ?? environment["E2E_STRIPE_TEST_SECRET_KEY"]?.trim() ?? ""
  const stripeAccountId = input.stripeAccountId ?? environment["E2E_STRIPE_TEST_ACCOUNT_ID"]?.trim() ?? ""
  const stripeOrganizationId = input.stripeOrganizationId ?? environment["E2E_BILLING_ORGANIZATION_ID"]?.trim() ?? ""
  if (!stripeKey || !stripeAccountId || !stripeOrganizationId)
    throw new Error("Exact Stripe TEST/organization credentials missing; checkpoint retained")
  const stripe = input.stripe ?? e2eStripeTestClientCreate(stripeKey)
  const ticketEventKey = ticket.eventKey
  const proofRunId = context.checkpoint.runId
  const proofRunCreatedAt = context.checkpoint.createdAt
  let orderDiscovery = input.orderDiscovery
  if (!orderDiscovery) {
    if (!sessionToken) throw new Error("Admin session proof unavailable; reconcile manually")
    const discoveryToken = sessionToken
    orderDiscovery = async (cursor) => {
      try {
        return await adminClient.query(api.ticketing.ticketE2eOrderDiscoveryQuery, {
          token: discoveryToken,
          eventKey: ticketEventKey,
          runId: proofRunId,
          runCreatedAt: proofRunCreatedAt,
          paginationOpts: { cursor: cursor ?? null, numItems: 50 },
        })
      } catch {
        return { success: false as const, errorMessage: "App order discovery unavailable; checkpoint retained" }
      }
    }
  }
  const proof = await ticketPurchaseCheckoutProofCheck({
    checkpoint: context.checkpoint,
    organizationId: stripeOrganizationId,
    accountId: stripeAccountId,
    key: stripeKey,
    orderProof,
    orderDiscovery,
    stripe,
  })
  if (!proof.success) throw new Error(proof.errorMessage)
  if (proof.data.state === "own") {
    if (proof.data.orderId !== ticket.orderId || proof.data.stripeSession !== ticket.stripeSession)
      throw new Error("Adopted checkout evidence changed; reconcile before continuing")
    await checkoutRecordCompleted(context)
    return
  }
  // Proven global absence (no Stripe session and no owned app order, or N
  // terminal expired/released/failed rows with payment expired/failed whose
  // graphs stay until success) with no saved IDs: prove Billing readiness
  // before the single browser create with the same run intent, then
  // complete. Pending-order discovery above stays first so a reservation
  // without a Stripe session never duplicates blindly. The saved IDs make
  // every later retry adopt instead of creating again; an already-proven
  // own checkout is adopted above without requiring catalog readiness.
  const readiness =
    input.billingReadinessProve ??
    (() => ticketPurchaseBillingReadinessProve(context, { client: input.client, environment: input.environment }))
  await readiness()
  await checkoutBrowserCreateOnce(context)
}

async function checkoutRecordCompleted(context: TicketPurchaseContext): Promise<void> {
  const stored = await e2eCheckpointLoad(context.directory, context.checkpoint)
  if (!stored.success || !stored.data || !isDeepStrictEqual(stored.data, context.checkpoint))
    throw new Error("Ticket checkout checkpoint changed; reconcile before continuing")
  const next: E2eCheckpoint = {
    ...context.checkpoint,
    ticket: { ...context.checkpoint.ticket, step: "checkout", status: "completed" },
  }
  const saved = await e2eCheckpointSave(context.directory, next)
  if (!saved.success) throw new Error(saved.errorMessage)
  context.checkpoint = next as TicketPurchaseContext["checkpoint"]
}

async function checkoutBrowserCreateOnce(context: TicketPurchaseContext): Promise<void> {
  const stored = await e2eCheckpointLoad(context.directory, context.checkpoint)
  if (!stored.success || !stored.data || !isDeepStrictEqual(stored.data, context.checkpoint))
    throw new Error("Ticket checkout checkpoint changed; reconcile before continuing")
  await checkoutBrowserCreate(context, async (evidence) => {
    const current = await e2eCheckpointLoad(context.directory, context.checkpoint)
    if (!current.success || !current.data || !isDeepStrictEqual(current.data, context.checkpoint))
      throw new Error("Ticket checkout checkpoint changed; reconcile before continuing")
    const next: E2eCheckpoint = {
      ...context.checkpoint,
      ticket: { ...context.checkpoint.ticket, step: "checkout", status: "started", ...evidence },
    }
    const saved = await e2eCheckpointSave(context.directory, next)
    if (!saved.success) throw new Error(saved.errorMessage)
    context.checkpoint = next as TicketPurchaseContext["checkpoint"]
  })
  await checkoutRecordCompleted(context)
}

async function checkoutBrowserCreate(
  context: TicketPurchaseContext,
  record: (evidence: Partial<NonNullable<E2eCheckpoint["ticket"]>>) => Promise<void>,
): Promise<void> {
  const { browser, baseUrl, mail } = context
  const { eventKey, eventTitle, participantName } = context.checkpoint.ticket
  const guestContext = await browser.newContext()
  context.browserErrors.observe(guestContext)
  try {
    const page = await guestContext.newPage()
    context.guestContext = guestContext
    context.checkoutPage = page
    await page.goto(`${baseUrl}/events/${encodeURIComponent(eventKey)}`)
    await expect(page.getByRole("heading", { name: eventTitle, level: 1 })).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('main[data-hydrated="true"]')).toBeVisible({ timeout: 30_000 })
    await expect(
      page
        .getByRole("region", { name: "Tickets auswählen" })
        .getByRole("status", { name: /1 Tickets für Paid ticket/u }),
    ).toBeVisible({ timeout: 30_000 })
    const addToCart = page.getByRole("button", { name: "In den Warenkorb" }).first()
    await expect(addToCart).toBeEnabled()
    await Promise.all([page.waitForURL((url) => url.pathname === "/warenkorb", { timeout: 30_000 }), addToCart.click()])
    await Promise.all([
      page.waitForURL((url) => url.pathname === "/checkout", { timeout: 30_000 }),
      page
        .getByRole("complementary", { name: "Warenkorb-Zusammenfassung" })
        .getByRole("button", { name: "Zur Kasse", exact: true })
        .click(),
    ])
    // An empty checkout (lost cart draft, unpublished tier, or catalog miss)
    // renders only the Kasse title plus the empty state. It must never create
    // an order: retain the checkpoint for manual reconciliation instead of
    // filling a missing form or duplicating payment.
    if ((await page.getByText(/Dein Warenkorb enthält keine gültigen Tickets/u).count()) > 0)
      throw new Error("Checkout shows an empty cart; reconcile the owned event/product before retrying")
    await expect(page.locator("#checkout-first-name")).toBeVisible({ timeout: 30_000 })
    await expect(page.locator("form:has(#checkout-first-name)")).toHaveAttribute("data-hydrated", "true", {
      timeout: 30_000,
    })
    await page.locator("#checkout-first-name").fill("E2E")
    await page.locator("#checkout-last-name").fill(context.checkpoint.runId)
    await page.locator("#checkout-email").fill(mail.user)
    await page.locator("#checkout-address").fill("Teststraße 1")
    await page.locator("#checkout-postal-code").fill("10115")
    await page.locator("#checkout-city").fill("Berlin")
    await page.locator("#checkout-country").fill("DE")
    const participantInputs = page.locator('input[name^="participant-"]')
    const participantCount = await participantInputs.count()
    if (participantCount === 0) throw new Error("Checkout shows no participant field; reconcile before continuing")
    for (let index = 0; index < participantCount; index += 1) {
      await participantInputs.nth(index).fill(participantName)
    }
    await page.locator("#checkout-terms-acceptance").check()
    await page.locator("#checkout-privacy-acknowledgement").check()
    await page.getByRole("button", { name: "Weiter zur sicheren Zahlung" }).click()
    await expect(page).toHaveURL(/checkout\.stripe\.com/u, { timeout: 30_000 })
    const session = page.url().match(/\bcs_test_[A-Za-z0-9]+/u)?.[0]
    if (!session) throw new Error("Refusing payment: checkout is not a Stripe test session")
    // Only the session identifier, never the complete hosted URL or client secret.
    const state = await guestContext.storageState()
    const origin = state.origins.find((entry) => entry.origin === new URL(baseUrl).origin)
    const stored = origin?.localStorage.find((entry) => entry.name === "eventoren.ticketOrderAccess.v1")?.value
    const orders: unknown = stored ? JSON.parse(stored) : null
    if (
      !Array.isArray(orders) ||
      orders.length !== 1 ||
      !orders[0] ||
      typeof orders[0].orderId !== "string" ||
      !orders[0].orderId
    ) {
      await record({ stripeSession: session })
      throw new Error("Stripe test session created but exact order ID not observed; reconcile manually")
    }
    await record({ stripeSession: session, orderId: orders[0].orderId })
  } catch (error) {
    try {
      await guestContext.close()
    } catch (closeError) {
      throw new AggregateError([error, closeError], "Ticket checkout and guest context cleanup both failed")
    }
    throw error
  }
}
