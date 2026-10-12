import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import type { Doc, Id } from "#convex/_generated/dataModel.js"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"
import { ticketCheckoutLegalDocumentRevision } from "../ticketCheckoutLegalDocumentRevision.js"
import { ticketCheckoutLegalDocumentSnapshot } from "../ticketCheckoutLegalDocumentSnapshot.js"
import { eventTicketTierMaxPerOrderGet } from "#src/events/eventTicketTierMaxPerOrderGet.ts"
import { ticketCheckoutContextCanonicalize } from "./ticketCheckoutContextCanonicalize.js"
import { ticketActivationCodeNormalize } from "./ticketActivationCodeNormalize.js"
import { ticketActivationCodeLifecyclePlan } from "./ticketActivationCodeLifecyclePlan.js"

const ticketSelectionValidator = v.object({
  tierKey: v.string(),
  quantity: v.number(),
  participantNames: v.optional(v.array(v.string())),
  activationCode: v.optional(v.string()),
})

export const ticketCheckoutPrepareMutation = internalMutation({
  args: {
    checkoutKey: v.string(),
    ownerUserId: v.optional(vIdUser),
    guestAccessDigest: v.optional(v.string()),
    customerEmail: v.string(),
    customerGivenName: v.string(),
    customerFamilyName: v.string(),
    customerAddress: v.string(),
    customerPhone: v.string(),
    billingDetails: v.optional(
      v.object({
        givenName: v.string(),
        familyName: v.string(),
        company: v.optional(v.string()),
        companyExtra: v.optional(v.string()),
        address: v.object({
          line1: v.string(),
          line2: v.optional(v.string()),
          postalCode: v.string(),
          city: v.string(),
          country: v.string(),
        }),
        taxId: v.optional(v.object({ type: v.literal("eu_vat"), value: v.string() })),
      }),
    ),
    eventKey: v.string(),
    catalogVersion: v.number(),
    eventRevision: v.optional(v.number()),
    tickets: v.array(ticketSelectionValidator),
    stripeMode: v.union(v.literal("live"), v.literal("test")),
    successUrl: v.string(),
    cancelUrl: v.string(),
    locale: v.union(v.literal("de"), v.literal("en")),
    legalContext: v.object({
      cta: v.string(),
      termsAccepted: v.literal(true),
      privacyAcknowledged: v.literal(true),
      documentSetRevision: v.string(),
      termsMarkdown: v.optional(v.string()),
      privacyMarkdown: v.optional(v.string()),
    }),
    paymentReference: v.string(),
    fulfillmentEligible: v.boolean(),
  },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    orderId: Id<"ticketOrders">
    paymentReference: string
    stripeMode: "live" | "test"
    checkoutUrl?: string
    billingOrderReference?: string
    status: "reserved" | "checkout_created" | "paid" | "failed" | "expired" | "released" | "paid_inventory_conflict"
    paymentStatus: "pending" | "paid" | "failed" | "expired"
    fulfillmentEligible: boolean
    replayed: boolean
  }> => {
    const op = "ticketCheckoutPrepareMutation"
    const existing = await ctx.db
      .query("ticketOrders")
      .withIndex("checkoutKey", (q) => q.eq("checkoutKey", args.checkoutKey))
      .unique()
    const contextJson = ticketCheckoutContextCanonicalize({
      checkoutKey: args.checkoutKey,
      eventKey: args.eventKey,
      catalogVersion: args.catalogVersion,
      ...(args.eventRevision !== undefined ? { eventRevision: args.eventRevision } : {}),
      tickets: args.tickets,
      stripeMode: args.stripeMode,
      successUrl: args.successUrl,
      cancelUrl: args.cancelUrl,
      locale: args.locale,
      customer: {
        email: args.customerEmail,
        givenName: args.customerGivenName,
        familyName: args.customerFamilyName,
        address: args.customerAddress,
        phone: args.customerPhone,
        ...(args.billingDetails !== undefined ? { billingDetails: args.billingDetails } : {}),
      },
      legalContext: args.legalContext,
    })
    const legacyContextJson = ticketCheckoutContextCanonicalize({
      checkoutKey: args.checkoutKey,
      eventKey: args.eventKey,
      catalogVersion: args.catalogVersion,
      tickets: args.tickets,
      stripeMode: args.stripeMode,
      successUrl: args.successUrl,
      cancelUrl: args.cancelUrl,
      locale: args.locale,
      customer: {
        email: args.customerEmail,
        givenName: args.customerGivenName,
        familyName: args.customerFamilyName,
        address: args.customerAddress,
        phone: args.customerPhone,
      },
      legalContext: {
        cta: args.legalContext.cta,
        termsAccepted: args.legalContext.termsAccepted,
        privacyAcknowledged: args.legalContext.privacyAcknowledged,
        documentSetRevision: args.legalContext.documentSetRevision,
      },
    })
    const legacyRevisionContextJson = ticketCheckoutContextCanonicalize({
      checkoutKey: args.checkoutKey,
      eventKey: args.eventKey,
      catalogVersion: args.catalogVersion,
      ...(args.eventRevision !== undefined ? { eventRevision: args.eventRevision } : {}),
      tickets: args.tickets,
      stripeMode: args.stripeMode,
      successUrl: args.successUrl,
      cancelUrl: args.cancelUrl,
      locale: args.locale,
      customer: {
        email: args.customerEmail,
        givenName: args.customerGivenName,
        familyName: args.customerFamilyName,
        address: args.customerAddress,
        phone: args.customerPhone,
      },
      legalContext: {
        cta: args.legalContext.cta,
        termsAccepted: args.legalContext.termsAccepted,
        privacyAcknowledged: args.legalContext.privacyAcknowledged,
        documentSetRevision: args.legalContext.documentSetRevision,
      },
    })
    const billingDetailsLegacyRevisionContextJson = ticketCheckoutContextCanonicalize({
      checkoutKey: args.checkoutKey,
      eventKey: args.eventKey,
      catalogVersion: args.catalogVersion,
      ...(args.eventRevision !== undefined ? { eventRevision: args.eventRevision } : {}),
      tickets: args.tickets,
      stripeMode: args.stripeMode,
      successUrl: args.successUrl,
      cancelUrl: args.cancelUrl,
      locale: args.locale,
      customer: {
        email: args.customerEmail,
        givenName: args.customerGivenName,
        familyName: args.customerFamilyName,
        address: args.customerAddress,
        phone: args.customerPhone,
        ...(args.billingDetails !== undefined ? { billingDetails: args.billingDetails } : {}),
      },
      legalContext: {
        cta: args.legalContext.cta,
        termsAccepted: args.legalContext.termsAccepted,
        privacyAcknowledged: args.legalContext.privacyAcknowledged,
        documentSetRevision: args.legalContext.documentSetRevision,
      },
    })

    if (existing) {
      const sameOwner = existing.ownerUserId === args.ownerUserId
      const sameGuest = !args.guestAccessDigest || existing.guestAccessDigest === args.guestAccessDigest
      const sameCheckoutEvidence =
        existing.checkoutContextJson === contextJson ||
        existing.checkoutContextJson === legacyContextJson ||
        existing.checkoutContextJson === legacyRevisionContextJson ||
        existing.checkoutContextJson === billingDetailsLegacyRevisionContextJson
      if (!sameOwner || !sameGuest || !sameCheckoutEvidence)
        return createResultError(op, "The checkout key was reused with different ownership or checkout evidence")
      if (
        existing.status === "failed" ||
        existing.status === "expired" ||
        existing.status === "released" ||
        existing.status === "paid_inventory_conflict"
      )
        return createResultError(op, "The checkout is no longer retryable")
      const codes = await ticketActivationCodeLifecyclePlan(ctx, existing, "consume")
      if (!codes.success) return codes
      if (codes.data.hasOwnershipConflict)
        return createResultError(op, "The activation code reservation is no longer owned by this checkout")
      return createResult({
        orderId: existing._id,
        paymentReference: existing.paymentReference,
        stripeMode: existing.stripeMode,
        checkoutUrl: existing.checkoutUrl,
        billingOrderReference: existing.billingOrderReference,
        status: existing.status,
        paymentStatus: existing.paymentStatus,
        fulfillmentEligible: existing.fulfillmentEligible ?? false,
        replayed: true,
      })
    }

    if (
      args.fulfillmentEligible &&
      (args.legalContext.documentSetRevision !== ticketCheckoutLegalDocumentRevision ||
        args.legalContext.termsMarkdown !== ticketCheckoutLegalDocumentSnapshot.termsMarkdown ||
        args.legalContext.privacyMarkdown !== ticketCheckoutLegalDocumentSnapshot.privacyMarkdown)
    )
      return createResultError(op, "The accepted legal snapshot is not current")

    const acceptedLegalContext = args.fulfillmentEligible
      ? {
          ...args.legalContext,
          documentSetRevision: ticketCheckoutLegalDocumentRevision,
          termsMarkdown: ticketCheckoutLegalDocumentSnapshot.termsMarkdown,
          privacyMarkdown: ticketCheckoutLegalDocumentSnapshot.privacyMarkdown,
        }
      : args.legalContext
    const acceptedContextJson = ticketCheckoutContextCanonicalize({
      checkoutKey: args.checkoutKey,
      eventKey: args.eventKey,
      catalogVersion: args.catalogVersion,
      ...(args.eventRevision !== undefined ? { eventRevision: args.eventRevision } : {}),
      tickets: args.tickets,
      stripeMode: args.stripeMode,
      successUrl: args.successUrl,
      cancelUrl: args.cancelUrl,
      locale: args.locale,
      customer: {
        email: args.customerEmail,
        givenName: args.customerGivenName,
        familyName: args.customerFamilyName,
        address: args.customerAddress,
        phone: args.customerPhone,
        ...(args.billingDetails !== undefined ? { billingDetails: args.billingDetails } : {}),
      },
      legalContext: acceptedLegalContext,
    })

    const syncState = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()
    if (!syncState) return createResultError(op, "The catalog is not available")
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
      .unique()
    if (!event) return createResultError(op, "The event was not found")
    if (event.status !== "published") return createResultError(op, "The event is not available for checkout")
    if (args.eventRevision === undefined) return createResultError(op, "The event revision is required")
    if (args.eventRevision !== (event.eventRevision ?? 1)) return createResultError(op, "The event revision is stale")

    const requestedSelections = [...args.tickets].sort((left, right) => left.tierKey.localeCompare(right.tierKey))
    const quantitiesByTier = new Map<
      string,
      { quantity: number; participantNames: string[]; activationCode?: string }
    >()
    for (const selection of requestedSelections) {
      if (!Number.isSafeInteger(selection.quantity) || selection.quantity < 1)
        return createResultError(op, "Ticket quantity is invalid")
      if (selection.participantNames === undefined || selection.participantNames.length !== selection.quantity)
        return createResultError(op, "Each ticket requires exactly one participant name")
      if (selection.participantNames.some((name) => name.trim().length === 0))
        return createResultError(op, "Participant names are incomplete")
      const activationCode =
        selection.activationCode === undefined ? undefined : ticketActivationCodeNormalize(selection.activationCode)
      const previous = quantitiesByTier.get(selection.tierKey)
      if (previous && previous.activationCode !== activationCode)
        return createResultError(op, "Each ticket product must use the same activation code")
      const aggregated = previous ?? { quantity: 0, participantNames: [], activationCode }
      aggregated.quantity += selection.quantity
      if (!Number.isSafeInteger(aggregated.quantity)) return createResultError(op, "Ticket quantity is invalid")
      aggregated.participantNames.push(...selection.participantNames)
      quantitiesByTier.set(selection.tierKey, aggregated)
    }
    const lineInputs: Array<{
      tier: Doc<"catalogTicketTiers">
      activationCode?: Doc<"ticketActivationCodes">
      tierId: Id<"catalogTicketTiers">
      tierKey: string
      tierName: string
      tierDescription: string
      quantity: number
      participantNames?: readonly string[]
      priceCents: number
      feeCents: number
    }> = []
    let subtotalCents = 0
    let feeCents = 0
    for (const [tierKey, aggregated] of [...quantitiesByTier.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      const tier = await ctx.db
        .query("catalogTicketTiers")
        .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id).eq("tierKey", tierKey))
        .unique()
      if (!tier || tier.archivedAt) return createResultError(op, "The ticket tier was not found")
      const perOrderLimit = eventTicketTierMaxPerOrderGet({ maxPerOrder: tier.maxPerOrder })
      if (aggregated.quantity > perOrderLimit)
        return createResultError(op, `The ticket quantity exceeds the maximum per order of ${perOrderLimit}`)
      if (
        !Number.isSafeInteger(tier.reserved) ||
        tier.reserved < 0 ||
        !Number.isSafeInteger(tier.sold) ||
        tier.sold < 0 ||
        !Number.isSafeInteger(tier.capacity) ||
        tier.capacity < 0
      )
        return createResultError(op, "Reserved inventory is corrupt")
      const available = tier.capacity - tier.sold
      if (aggregated.quantity > available) return createResultError(op, "The requested ticket quantity is unavailable")
      let activationCode: Doc<"ticketActivationCodes"> | undefined
      if (tier.activationCodeRequired === true) {
        if (!aggregated.activationCode)
          return createResultError(op, "An activation code is required for this ticket product")
        if (!/^[A-Z0-9]{8}$/u.test(aggregated.activationCode))
          return createResultError(op, "The activation code is invalid for this ticket product")
        const matches = await ctx.db
          .query("ticketActivationCodes")
          .withIndex("code", (q) => q.eq("code", aggregated.activationCode!))
          .take(2)
        const code = matches[0]
        if (
          matches.length !== 1 ||
          !code ||
          code.eventId !== event._id ||
          code.tierId !== tier._id ||
          code.eventKey !== event.eventKey ||
          code.tierKey !== tier.tierKey
        )
          return createResultError(op, "The activation code is invalid for this ticket product")
        const charged = await ctx.db
          .query("ticketActivationCodeReservations")
          .withIndex("codeIdAndStatusAndCreatedAt", (q) => q.eq("codeId", code._id).eq("status", "consumed"))
          .first()
        const active = await ctx.db
          .query("ticketActivationCodeReservations")
          .withIndex("codeIdAndStatusAndCreatedAt", (q) => q.eq("codeId", code._id).eq("status", "reserved"))
          .first()
        if (
          code.status !== "available" ||
          code.orderId !== undefined ||
          code.consumedAt !== undefined ||
          charged ||
          active
        )
          return createResultError(op, "The activation code is no longer available")
        activationCode = code
      }
      subtotalCents += tier.priceCents * aggregated.quantity
      feeCents += tier.feeCents * aggregated.quantity
      lineInputs.push({
        tier,
        activationCode,
        tierId: tier._id,
        tierKey: tier.tierKey,
        tierName: tier.name,
        tierDescription: tier.description,
        quantity: aggregated.quantity,
        participantNames: aggregated.participantNames.map((name) => name.trim()),
        priceCents: tier.priceCents,
        feeCents: tier.feeCents,
      })
    }
    if (lineInputs.length === 0) return createResultError(op, "At least one ticket is required")
    if (subtotalCents + feeCents < 1) return createResultError(op, "The selected tickets are not payable")
    const now = new Date().toISOString()
    const expiresAt = Date.now() + 15 * 60 * 1000
    const orderId = await ctx.db.insert("ticketOrders", {
      checkoutKey: args.checkoutKey,
      ownerUserId: args.ownerUserId,
      guestAccessDigest: args.guestAccessDigest,
      customerEmail: args.customerEmail,
      customerGivenName: args.customerGivenName,
      customerFamilyName: args.customerFamilyName,
      customerAddress: args.customerAddress,
      customerPhone: args.customerPhone,
      contactSnapshotJson: JSON.stringify({
        email: args.customerEmail,
        givenName: args.customerGivenName,
        familyName: args.customerFamilyName,
        address: args.customerAddress,
        phone: args.customerPhone,
      }),
      ...(args.billingDetails !== undefined ? { billingDetailsJson: JSON.stringify(args.billingDetails) } : {}),
      eventKey: event.eventKey,
      eventTitle: event.title,
      eventSubtitle: event.subtitle,
      eventDescription: event.description,
      eventStartsAt: event.startsAt,
      eventEndsAt: event.endsAt,
      eventDoorsAt: event.doorsAt,
      venue: event.venue,
      city: event.city,
      address: event.address,
      organizer: event.organizer,
      imageUrl: event.imageUrl,
      imageAlt: event.imageAlt,
      catalogVersion: args.catalogVersion,
      subtotalCents,
      feeCents,
      totalCents: subtotalCents + feeCents,
      checkoutContextJson: acceptedContextJson,
      paymentReference: args.paymentReference,
      stripeMode: args.stripeMode,
      fulfillmentEligible: args.fulfillmentEligible,
      legalDocumentSetRevision: acceptedLegalContext.documentSetRevision,
      ...(acceptedLegalContext.termsMarkdown !== undefined
        ? { legalTermsMarkdown: acceptedLegalContext.termsMarkdown }
        : {}),
      ...(acceptedLegalContext.privacyMarkdown !== undefined
        ? { legalPrivacyMarkdown: acceptedLegalContext.privacyMarkdown }
        : {}),
      status: "reserved",
      paymentStatus: "pending",
      reservationExpiresAt: expiresAt,
      createdAt: now,
      updatedAt: now,
    })

    for (const line of lineInputs) {
      await ctx.db.insert("ticketOrderLines", {
        orderId,
        tierId: line.tierId,
        ...(line.activationCode ? { activationCodeId: line.activationCode._id } : {}),
        eventKey: event.eventKey,
        tierKey: line.tierKey,
        tierName: line.tierName,
        tierDescription: line.tierDescription,
        quantity: line.quantity,
        ...(line.participantNames !== undefined ? { participantNamesJson: JSON.stringify(line.participantNames) } : {}),
        priceCents: line.priceCents,
        feeCents: line.feeCents,
        createdAt: now,
      })
      await ctx.db.patch("catalogTicketTiers", line.tierId, {
        reserved: line.tier.reserved + line.quantity,
      })
      if (line.activationCode) {
        await ctx.db.patch("ticketActivationCodes", line.activationCode._id, {
          status: "reserved",
          orderId,
          reservedAt: now,
          updatedAt: now,
        })
        await ctx.db.insert("ticketActivationCodeReservations", {
          codeId: line.activationCode._id,
          orderId,
          tierId: line.tierId,
          eventId: event._id,
          eventKey: event.eventKey,
          tierKey: line.tierKey,
          status: "reserved",
          createdAt: now,
          updatedAt: now,
        })
      }
      await ctx.db.insert("ticketReservations", {
        orderId,
        tierId: line.tierId,
        quantity: line.quantity,
        ...(line.participantNames !== undefined ? { participantNamesJson: JSON.stringify(line.participantNames) } : {}),
        status: "active",
        expiresAt,
        createdAt: now,
      })
    }

    await ctx.db.insert("ticketPaymentAttempts", {
      orderId,
      paymentReference: args.paymentReference,
      stripeMode: args.stripeMode,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    await ctx.scheduler.runAfter(15 * 60 * 1000, internal.ticketing.ticketReservationExpireAction, { orderId })
    return createResult({
      orderId,
      paymentReference: args.paymentReference,
      stripeMode: args.stripeMode,
      status: "reserved" as const,
      paymentStatus: "pending" as const,
      fulfillmentEligible: args.fulfillmentEligible,
      replayed: false,
    })
  },
})
