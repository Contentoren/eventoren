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
  proofTimeoutMs?: number
  proofPollIntervalMs?: number
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
  // Completed checkout never creates a new checkout/order here: fall through
  // to the standard payment runner below, which persists payment-started then
  // proves read-only (paid adopts, retry restores the exact saved URL).
  if (context.checkpoint.ticket.step === "checkout" && context.checkpoint.ticket.status === "completed") {
    await ticketPurchaseCheckoutEvidenceCheck(context)
  }
  // Resumed payment-started: reconcile (prove/submit/poll, no record), then
  // record completion once. Fresh: standard runner records started/completed
  // around the same reconcile. Top level closes the guest after either success.
  if (context.checkpoint.ticket.step === "payment" && context.checkpoint.ticket.status === "started") {
    await ticketPurchasePaymentStartedReconcile(context, input)
    await ticketPurchasePaymentRecordCompleted(context)
    await ticketPurchasePaymentCloseGuest(context)
    return
  }
  await ticketPurchaseStepRun(context, "payment", false, async () => {
    await ticketPurchasePaymentStartedReconcile(context, input)
  })
  await ticketPurchasePaymentCloseGuest(context)
}

async function ticketPurchasePaymentStartedReconcile(
  context: TicketPurchaseContext,
  input: PaymentProofInput,
): Promise<void> {
  const runId = context.checkpoint.runId
  const ticket = context.checkpoint.ticket
  if (
    ticket.eventKey !== `ticket-e2e-${runId}` ||
    ticket.eventTitle !== `Ticket E2E ${runId}` ||
    ticket.participantName !== `E2E Participant ${runId}`
  )
    throw new Error("Ticket marker does not match the run; reconcile manually")
  // Changed disk state never pays.
  await ticketPurchasePaymentAssertPersisted(context)
  const environment = input.environment ?? process.env
  const backend = e2eTicketBackendResolve(environment)
  const stripeKey = input.stripeKey ?? environment["E2E_STRIPE_TEST_SECRET_KEY"]?.trim() ?? ""
  const stripeAccountId = input.stripeAccountId ?? environment["E2E_STRIPE_TEST_ACCOUNT_ID"]?.trim() ?? ""
  const stripeOrganizationId = input.stripeOrganizationId ?? environment["E2E_BILLING_ORGANIZATION_ID"]?.trim() ?? ""
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
  const proofBase = {
    checkpoint: context.checkpoint,
    organizationId: stripeOrganizationId,
    accountId: stripeAccountId,
    key: stripeKey,
    orderProof,
    stripe,
  }
  // Pre-submit refusal retains immediately with no browser effect.
  const proof = await ticketPurchasePaymentProofCheck(proofBase)
  if (!proof.success) throw new Error(proof.errorMessage)
  if (proof.data.orderId !== ticket.orderId || proof.data.stripeSession !== ticket.stripeSession)
    throw new Error("Adopted payment evidence changed; reconcile before continuing")
  // Exact paid proof adopts with no browser. No record/close here.
  if (proof.data.state === "paid") return
  const guestBefore = context.guestContext
  await ticketPurchasePaymentRestoreHostedPage(context, proof.data.hostedUrl, proof.data.stripeSession)
  const createdNewContext = context.guestContext !== undefined && context.guestContext !== guestBefore
  try {
    await ticketPurchasePaymentBrowserSubmit(context)
    // Single submit only. Poll read-only until fulfilled paid; transient
    // post-submit proof failures are re-read until the deadline, never a
    // second submit and never accepted as authorization.
    await ticketPurchasePaymentPollPaid(context, {
      organizationId: stripeOrganizationId,
      accountId: stripeAccountId,
      key: stripeKey,
      orderProof,
      stripe,
      timeoutMs: input.proofTimeoutMs ?? 180_000,
      intervalMs: input.proofPollIntervalMs ?? 2_000,
    })
  } catch (error) {
    if (createdNewContext) {
      const leaked = context.guestContext
      context.guestContext = undefined
      context.checkoutPage = undefined
      if (leaked && leaked !== guestBefore) {
        try {
          await leaked.close()
        } catch {
          // Original error stays authoritative.
        }
      }
    }
    throw error
  }
}

async function ticketPurchasePaymentPollPaid(
  context: TicketPurchaseContext,
  input: {
    organizationId: string
    accountId: string
    key: string
    orderProof: Parameters<typeof ticketPurchasePaymentProofCheck>[0]["orderProof"]
    stripe: Parameters<typeof ticketPurchasePaymentProofCheck>[0]["stripe"]
    timeoutMs: number
    intervalMs: number
  },
): Promise<void> {
  const ticket = context.checkpoint.ticket
  const deadline = Date.now() + Math.max(0, input.timeoutMs)
  for (;;) {
    const proof = await ticketPurchasePaymentProofCheck({
      checkpoint: context.checkpoint,
      organizationId: input.organizationId,
      accountId: input.accountId,
      key: input.key,
      orderProof: input.orderProof,
      stripe: input.stripe,
    })
    if (proof.success && proof.data.state === "paid") {
      if (proof.data.orderId !== ticket.orderId || proof.data.stripeSession !== ticket.stripeSession)
        throw new Error("Adopted payment evidence changed; reconcile before continuing")
      return
    }
    if (Date.now() >= deadline) throw new Error("Canonical saved order/Stripe paid proof missing; checkpoint retained")
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, input.intervalMs)))
  }
}

async function ticketPurchasePaymentRestoreHostedPage(
  context: TicketPurchaseContext,
  hostedUrl: string,
  sessionId: string,
): Promise<void> {
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
  const previous = context.guestContext
  const guestContext = await context.browser.newContext()
  context.browserErrors.observe(guestContext)
  try {
    const page = await guestContext.newPage()
    await page.goto(hostedUrl)
    if (previous && previous !== guestContext) {
      try {
        await previous.close()
      } catch {
        // Replacement cleanup best-effort.
      }
    }
    context.guestContext = guestContext
    context.checkoutPage = page
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
    // Unavailable URL is not proof the saved session is open.
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
  // Changed disk state never pays.
  await ticketPurchasePaymentAssertPersisted(context)
  await page.getByTestId("hosted-payment-submit-button").click()
  // No app label required (restored guest has no original storage); the poll
  // proves fulfillment. No second submit.
  await expect(page).toHaveURL(/\/checkout(?:\?|#)/u, { timeout: 90_000 })
}

async function ticketPurchasePaymentAssertPersisted(context: TicketPurchaseContext): Promise<void> {
  const stored = await e2eCheckpointLoad(context.directory, context.checkpoint)
  if (!stored.success || !stored.data || !isDeepStrictEqual(stored.data, context.checkpoint))
    throw new Error("Ticket payment checkpoint changed; reconcile before continuing")
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

async function ticketPurchasePaymentCloseGuest(context: TicketPurchaseContext): Promise<void> {
  const guest = context.guestContext
  context.guestContext = undefined
  context.checkoutPage = undefined
  if (guest) {
    try {
      await guest.close()
    } catch {
      // Best-effort.
    }
  }
}
