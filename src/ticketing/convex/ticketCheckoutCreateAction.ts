import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { action } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult, type Result } from "#result"
import { billingEventorenClient } from "./billingEventorenClient.js"
import { ticketOrderAccessResolve } from "./ticketOrderAccessResolve.js"

const checkoutKeyValidator = v.string()
const ticketSelectionValidator = v.object({
  tierKey: v.string(),
  quantity: v.number(),
  participantNames: v.optional(v.array(v.string())),
})

export const ticketCheckoutCreateAction = action({
  args: {
    token: v.optional(v.string()),
    guestAccessToken: v.optional(v.string()),
    checkoutKey: checkoutKeyValidator,
    eventKey: v.string(),
    catalogVersion: v.number(),
    eventRevision: v.optional(v.number()),
    tickets: v.array(ticketSelectionValidator),
    successUrl: v.string(),
    cancelUrl: v.string(),
    locale: v.optional(v.union(v.literal("de"), v.literal("en"))),
    customer: v.object({
      email: v.string(),
      givenName: v.string(),
      familyName: v.string(),
      address: v.string(),
      phone: v.string(),
    }),
    legalContext: v.object({
      cta: v.string(),
      termsAccepted: v.literal(true),
      privacyAcknowledged: v.literal(true),
      documentSetRevision: v.string(),
      termsMarkdown: v.optional(v.string()),
      privacyMarkdown: v.optional(v.string()),
    }),
  },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    orderId: string
    paymentReference: string
    orderReference?: string
    stripeMode: "live" | "test"
    status: "checkout_created" | "paid"
    paymentStatus: "pending" | "paid"
    url?: string
    fulfillmentEligible: boolean
    replayed: boolean
  }> => {
    const op = "ticketCheckoutCreateAction"
    if (!/^[A-Za-z0-9]{32,96}$/u.test(args.checkoutKey)) return createResultError(op, "Checkout key is invalid")
    if (args.guestAccessToken !== undefined && !/^[A-Za-z0-9_-]{32,256}$/u.test(args.guestAccessToken))
      return createResultError(op, "Guest access token is invalid")
    if (!/^sha256:[a-f0-9]{64}$/u.test(args.legalContext.documentSetRevision))
      return createResultError(op, "Legal document revision is invalid")
    const accessResult = await ticketOrderAccessResolve(args)
    if (!accessResult.success) return accessResult
    const config = billingEventorenClient.configRead()
    if (!config.success) return config
    const locale = args.locale ?? "de"
    const urlResult = checkoutUrlsCanonicalize(config.data.publicBaseUrl, args.successUrl, args.cancelUrl)
    if (!urlResult.success) return urlResult
    const { successUrl, cancelUrl } = urlResult.data
    const email = args.customer.email.trim().toLowerCase()
    const givenName = args.customer.givenName.trim()
    const familyName = args.customer.familyName.trim()
    const address = args.customer.address.trim()
    if (!email || !givenName || !familyName || !address) return createResultError(op, "Customer contact is incomplete")
    if (!/^\S+@\S+\.\S+$/u.test(email)) return createResultError(op, "Customer email is invalid")

    const tickets = args.tickets.map((ticket) => ({
      tierKey: ticket.tierKey,
      quantity: ticket.quantity,
      ...(ticket.participantNames !== undefined
        ? { participantNames: ticket.participantNames.map((name) => name.trim()) }
        : {}),
    }))
    if (tickets.some((ticket) => ticket.participantNames === undefined))
      return createResultError(op, "Each ticket requires exactly one participant name")
    if (tickets.some((ticket) => ticket.participantNames?.some((name) => name.length === 0)))
      return createResultError(op, "Participant names are incomplete")

    const paymentReference = `payment_${args.checkoutKey}`
    const prepared = await ctx.runMutation(internal.ticketing.ticketCheckoutPrepareMutation, {
      checkoutKey: args.checkoutKey,
      ownerUserId: accessResult.data.userId,
      guestAccessDigest: accessResult.data.guestAccessDigest,
      customerEmail: email,
      customerGivenName: givenName,
      customerFamilyName: familyName,
      customerAddress: address,
      customerPhone: args.customer.phone.trim(),
      eventKey: args.eventKey,
      catalogVersion: args.catalogVersion,
      eventRevision: args.eventRevision,
      tickets,
      stripeMode: config.data.stripeMode,
      successUrl,
      cancelUrl,
      locale,
      legalContext: args.legalContext,
      paymentReference,
      fulfillmentEligible: config.data.fulfillmentEnabled,
    })
    if (!prepared.success) return prepared
    if (prepared.data.status === "paid")
      return createResult({
        orderId: prepared.data.orderId,
        paymentReference: prepared.data.paymentReference,
        stripeMode: prepared.data.stripeMode,
        status: "paid" as const,
        paymentStatus: "paid" as const,
        fulfillmentEligible: prepared.data.fulfillmentEligible,
        replayed: true,
      })
    if (prepared.data.status === "checkout_created" && prepared.data.checkoutUrl && prepared.data.billingOrderReference)
      return createResult({
        orderId: prepared.data.orderId,
        paymentReference: prepared.data.paymentReference,
        orderReference: prepared.data.billingOrderReference,
        stripeMode: prepared.data.stripeMode,
        status: "checkout_created" as const,
        paymentStatus: "pending" as const,
        url: prepared.data.checkoutUrl,
        fulfillmentEligible: prepared.data.fulfillmentEligible,
        replayed: true,
      })
    if (args.eventRevision === undefined) return createResultError(op, "The event revision is required")

    const claimed = await ctx.runMutation(internal.ticketing.ticketCheckoutClaimBillingMutation, {
      orderId: prepared.data.orderId,
      paymentReference,
    })
    if (!claimed.success) return claimed

    const billingResult = await billingEventorenClient.ticketCheckoutCreate(config.data, {
      organizationId: config.data.organizationId,
      paymentReference,
      eventKey: args.eventKey,
      catalogVersion: args.catalogVersion,
      eventRevision: args.eventRevision,
      tickets: tickets.map(({ tierKey, quantity }) => ({ tierKey, quantity })),
      stripeMode: config.data.stripeMode,
      successUrl,
      cancelUrl,
      locale,
      customer: { email },
      legalContext: {
        cta: args.legalContext.cta,
        termsAccepted: args.legalContext.termsAccepted,
        privacyAcknowledged: args.legalContext.privacyAcknowledged,
        documentSetRevision: args.legalContext.documentSetRevision,
      },
    })
    if (!billingResult.success) return billingResult
    if (
      billingResult.data.paymentReference !== paymentReference ||
      billingResult.data.stripeMode !== config.data.stripeMode
    )
      return createResultError(op, "Billing returned mismatched checkout correlation")

    const marked = await ctx.runMutation(internal.ticketing.ticketCheckoutMarkCreatedMutation, {
      orderId: prepared.data.orderId,
      paymentReference,
      billingOrderReference: billingResult.data.orderReference,
      checkoutUrl: billingResult.data.url,
    })
    if (!marked.success) return marked
    return createResult({
      orderId: marked.data.orderId,
      paymentReference: marked.data.paymentReference,
      orderReference: marked.data.billingOrderReference,
      stripeMode: billingResult.data.stripeMode,
      status: "checkout_created" as const,
      paymentStatus: "pending" as const,
      url: marked.data.checkoutUrl,
      fulfillmentEligible: prepared.data.fulfillmentEligible,
      replayed: prepared.data.replayed || marked.data.replayed,
    })
  },
})

function checkoutUrlsCanonicalize(
  publicBaseUrl: string,
  successUrl: string,
  cancelUrl: string,
): Result<{ successUrl: string; cancelUrl: string }> {
  const op = "ticketCheckoutUrlsCanonicalize"
  try {
    const expectedOrigin = new URL(publicBaseUrl).origin
    const success = checkoutUrlCanonicalize(successUrl, expectedOrigin)
    const cancel = checkoutUrlCanonicalize(cancelUrl, expectedOrigin)
    if (!success || !cancel)
      return createResultError(op, "Checkout return URLs must use the configured Eventoren origin")
    return createResult({ successUrl: success, cancelUrl: cancel })
  } catch (error) {
    return createResultError(op, "Checkout return URLs are invalid", String(error))
  }
}

function checkoutUrlCanonicalize(value: string, expectedOrigin: string): string | undefined {
  const url = new URL(value)
  if (url.origin !== expectedOrigin) return undefined
  return new URL(`${url.pathname}${url.search}${url.hash}`, expectedOrigin).toString()
}
