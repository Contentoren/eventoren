import { isDeepStrictEqual } from "node:util"
import { expect } from "@rstest/playwright"
import { ConvexHttpClient } from "convex/browser"
import type { Page } from "playwright"
import { api } from "../../../convex/_generated/api.js"
import { e2eCheckpointLoad } from "../../checkpoint/e2eCheckpointLoad.ts"
import { e2eCheckpointSave } from "../../checkpoint/e2eCheckpointSave.ts"
import type { E2eCheckpoint } from "../../checkpoint/e2eCheckpointSchema.ts"
import { e2eTicketBackendResolve } from "../../config/e2eTicketBackendResolve.ts"
import { e2eStripeTestClientCreate } from "../../stripe/e2eStripeTestClientCreate.ts"
import { ticketE2eAdminSignIn } from "../ticketE2eAdminSignIn.ts"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseCardMethodSelect } from "./ticketPurchaseCardMethodSelect.ts"
import { ticketPurchaseCheckoutEvidenceCheck } from "./ticketPurchaseCheckoutEvidenceCheck.ts"
import { ticketPurchasePaymentProofCheck } from "./ticketPurchasePaymentProofCheck.ts"
import { ticketPurchaseStepRun } from "./ticketPurchaseStepRun.ts"

type PaymentProofInput = {
  client?: ConvexHttpClient
  environment?: Record<string, string | undefined>
  orderProof?: Parameters<typeof ticketPurchasePaymentProofCheck>[0]["orderProof"]
  stripe?: Parameters<typeof ticketPurchasePaymentProofCheck>[0]["stripe"]
  stripeKey?: string
  stripeAccountId?: string
  stripeOrganizationId?: string
}

export async function ticketPurchasePaymentStep(
  context: TicketPurchaseContext,
  input: PaymentProofInput = {},
): Promise<void> {
  if (
    (context.checkpoint.ticket.step === "payment" && context.checkpoint.ticket.status === "completed") ||
    ["delivery", "pdf", "access", "checkin", "duplicate", "done"].includes(context.checkpoint.ticket.step)
  ) {
    await ticketPurchaseCheckoutEvidenceCheck(context)
    return
  }
  if (context.checkpoint.ticket.step === "checkout" && context.checkpoint.ticket.status === "completed") {
    await ticketPurchaseCheckoutEvidenceCheck(context)
    if (!context.checkoutPage)
      throw new Error(
        "Checkout exists but the hosted session is no longer open; reconcile Stripe TEST and the order before payment retry",
      )
  }
  // Uncertain payment-started reaches this child through the runner gate
  // because this step proves the exact saved run before touching the hosted
  // form: a proven paid session/order adopts the known success without card
  // entry, a proven open/unpaid session in a known active app state with no
  // payment intent/charge restores the SAME authoritative hosted session URL
  // (exact Stripe GET url including its fragment) before the normal card
  // form, and every terminal-app/pending/foreign/expired/unknown/unavailable
  // case retains without effect. No new order/checkout is ever created here;
  // intents persist through the standard steps. Completed payment above skips
  // mutation entirely.
  if (context.checkpoint.ticket.step === "payment" && context.checkpoint.ticket.status === "started") {
    await ticketPurchasePaymentStartedReconcile(context, input)
    return
  }
  await ticketPurchaseStepRun(context, "payment", false, async () => {
    await ticketPurchasePaymentBrowserSubmit(context)
    await ticketPurchasePaymentStartedReconcile(context, input, true)
  })
  await context.guestContext?.close()
  context.guestContext = undefined
  context.checkoutPage = undefined
}

async function ticketPurchasePaymentStartedReconcile(
  context: TicketPurchaseContext,
  input: PaymentProofInput,
  paidOnly = false,
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
  const stripeKey = input.stripeKey ?? environment["E2E_STRIPE_TEST_SECRET_KEY"]?.trim() ?? ""
  const stripeAccountId = input.stripeAccountId ?? environment["E2E_STRIPE_TEST_ACCOUNT_ID"]?.trim() ?? ""
  const stripeOrganizationId = input.stripeOrganizationId ?? environment["E2E_BILLING_ORGANIZATION_ID"]?.trim() ?? ""
  // Without the canonical backend and TEST credentials the uncertain payment
  // stays blocked without touching the page, preserving the historic
  // fails-closed gate for unproven retries.
  if (!backend.success || !stripeKey || !stripeAccountId || !stripeOrganizationId)
    throw new Error("Ticket payment has an uncertain external effect; reconcile the exact run before retrying")
  const adminClient = input.client ?? new ConvexHttpClient(backend.data.convexUrl)
  let orderProof = input.orderProof
  if (!orderProof) {
    await ticketE2eAdminSignIn(context.page, context.baseUrl)
    let sessionToken: string | null = null
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
    const memoryToken = sessionToken
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
  const stripe = input.stripe ?? e2eStripeTestClientCreate(stripeKey)
  const proof = await ticketPurchasePaymentProofCheck({
    checkpoint: context.checkpoint,
    organizationId: stripeOrganizationId,
    accountId: stripeAccountId,
    key: stripeKey,
    orderProof,
    stripe,
  })
  if (!proof.success) throw new Error(proof.errorMessage)
  if (proof.data.state === "paid") {
    if (proof.data.orderId !== ticket.orderId || proof.data.stripeSession !== ticket.stripeSession)
      throw new Error("Adopted payment evidence changed; reconcile before continuing")
    if (!paidOnly) await ticketPurchasePaymentRecordCompleted(context)
    return
  }
  if (paidOnly) throw new Error("Canonical saved order/Stripe paid proof missing; checkpoint retained")
  if (proof.data.orderId !== ticket.orderId || proof.data.stripeSession !== ticket.stripeSession)
    throw new Error("Adopted payment evidence changed; reconcile before continuing")
  await ticketPurchasePaymentRestoreHostedPage(context, proof.data.hostedUrl, proof.data.stripeSession)
  await ticketPurchasePaymentBrowserSubmit(context)
  // The UI label is not a receipt. Re-read the exact saved order, account,
  // session and owned customer; no retry or new session is allowed here.
  await ticketPurchasePaymentStartedReconcile(context, input, true)
  await ticketPurchasePaymentRecordCompleted(context)
  await context.guestContext?.close()
  context.guestContext = undefined
  context.checkoutPage = undefined
}

async function ticketPurchasePaymentRestoreHostedPage(
  context: TicketPurchaseContext,
  hostedUrl: string,
  sessionId: string,
): Promise<void> {
  // The hosted URL must be the exact authoritative Stripe session URL
  // (https checkout.stripe.com origin, saved session path segment, required
  // fragment): a constructed or foreign URL never proves the saved session.
  let authoritative: URL
  try {
    authoritative = new URL(hostedUrl)
  } catch {
    throw new Error("Authoritative hosted session URL is unavailable; reconcile manually")
  }
  if (
    authoritative.protocol !== "https:" ||
    authoritative.host !== "checkout.stripe.com" ||
    !authoritative.pathname.split("/").includes(sessionId) ||
    !authoritative.hash
  )
    throw new Error("Authoritative hosted session URL does not prove the saved TEST session; reconcile manually")
  const current = context.checkoutPage
  if (current) {
    let url: URL | undefined
    try {
      url = new URL(current.url())
    } catch {
      url = undefined
    }
    // Reuse only the exact authoritative URL (including its fragment) or an
    // owned recognized Stripe checkout redirect on the same origin whose path
    // still carries the exact saved session segment: never any page that
    // merely contains the session id as a substring.
    if (url && context.checkpoint.ticket.orderId) {
      if (url.href === authoritative.href) return
      if (
        url.origin === authoritative.origin &&
        url.pathname.split("/").includes(sessionId) &&
        /^\/(c\/pay|checkout|pay)\//u.test(url.pathname)
      )
        return
    }
  }
  if (!context.browser) throw new Error("Exact test checkout session and order must be observed before card entry")
  const guestContext = await context.browser.newContext()
  context.browserErrors.observe(guestContext)
  try {
    const page = await guestContext.newPage()
    context.guestContext = guestContext
    context.checkoutPage = page
    await page.goto(hostedUrl)
  } catch (error) {
    try {
      await guestContext.close()
    } catch (closeError) {
      throw new AggregateError([error, closeError], "Ticket payment restore and guest context cleanup both failed")
    }
    throw error
  }
}

async function ticketPurchasePaymentBrowserSubmit(context: TicketPurchaseContext): Promise<void> {
  const page = context.checkoutPage as Page | undefined
  const session = context.checkpoint.ticket.stripeSession
  let url: URL | undefined
  try {
    if (page) url = new URL(page.url())
  } catch {
    // An unavailable browser URL is not evidence that the saved session is still open.
  }
  if (
    !page ||
    !session ||
    !context.checkpoint.ticket.orderId ||
    url?.origin !== "https://checkout.stripe.com" ||
    !url.pathname.split("/").includes(session) ||
    !/^\/(c\/pay|checkout|pay)\//u.test(url.pathname)
  ) {
    throw new Error("Exact test checkout session and order must be observed before card entry")
  }
  await ticketPurchaseCardMethodSelect(page)
  await expect(page.getByLabel(/card number|kartennummer/i)).toBeVisible()
  await page.getByLabel(/card number|kartennummer/i).fill("4242424242424242")
  await page.getByLabel(/expiration date|expiry|gültig bis/i).fill("1234")
  await page.getByRole("textbox", { name: /cvc\/cvv/i }).fill("123")
  await page.getByLabel(/cardholder|karteninhaber/i).fill("E2E Ticket Test")
  await page.getByText("Adresse manuell eingeben", { exact: true }).click()
  await page.locator('input[name="billingAddressLine1"]').fill("Teststraße 1")
  await page.locator('input[name="billingLocality"]').fill("Berlin")
  await page.locator('input[name="billingPostalCode"]').fill("10115")
  const postalCode = page.getByLabel(/zip|postal code/i)
  if ((await postalCode.count()) > 0 && (await postalCode.isVisible())) await postalCode.fill("10115")
  await page.getByTestId("hosted-payment-submit-button").click()
  await expect(page).toHaveURL(/\/checkout(?:\?|#)/u, { timeout: 90_000 })
  await expect(page.getByText("Bezahlt", { exact: true }).first()).toBeVisible({ timeout: 180_000 })
}

async function ticketPurchasePaymentRecordCompleted(context: TicketPurchaseContext): Promise<void> {
  const stored = await e2eCheckpointLoad(context.directory, context.checkpoint)
  if (!stored.success || !stored.data || !isDeepStrictEqual(stored.data, context.checkpoint))
    throw new Error("Ticket payment checkpoint changed; reconcile before continuing")
  const next: E2eCheckpoint = {
    ...context.checkpoint,
    ticket: { ...context.checkpoint.ticket, step: "payment", status: "completed" },
  }
  const saved = await e2eCheckpointSave(context.directory, next)
  if (!saved.success) throw new Error(saved.errorMessage)
  context.checkpoint = next as TicketPurchaseContext["checkpoint"]
}
