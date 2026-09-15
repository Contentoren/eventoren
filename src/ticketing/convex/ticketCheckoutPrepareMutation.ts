import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"
import { ticketCheckoutContextCanonicalize } from "./ticketCheckoutContextCanonicalize.js"

const ticketSelectionValidator = v.object({
  tierKey: v.string(),
  quantity: v.number(),
  participantNames: v.optional(v.array(v.string())),
})

export const ticketCheckoutPrepareMutation = internalMutation({
  args: {
    checkoutKey: v.string(),
    ownerUserId: v.optional(vIdUser),
    guestAccessDigest: v.optional(v.string()),
    customerEmail: v.string(),
    customerGivenName: v.string(),
    customerFamilyName: v.string(),
    customerPhone: v.string(),
    eventKey: v.string(),
    catalogVersion: v.number(),
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
    }),
    paymentReference: v.string(),
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
      tickets: args.tickets,
      stripeMode: args.stripeMode,
      successUrl: args.successUrl,
      cancelUrl: args.cancelUrl,
      locale: args.locale,
      customer: {
        email: args.customerEmail,
        givenName: args.customerGivenName,
        familyName: args.customerFamilyName,
        phone: args.customerPhone,
      },
      legalContext: args.legalContext,
    })

    if (existing) {
      const sameOwner = existing.ownerUserId === args.ownerUserId
      const sameGuest = !args.guestAccessDigest || existing.guestAccessDigest === args.guestAccessDigest
      if (!sameOwner || !sameGuest || existing.checkoutContextJson !== contextJson)
        return createResultError(op, "The checkout key was reused with different ownership or checkout evidence")
      if (
        existing.status === "failed" ||
        existing.status === "expired" ||
        existing.status === "released" ||
        existing.status === "paid_inventory_conflict"
      )
        return createResultError(op, "The checkout is no longer retryable")
      return createResult({
        orderId: existing._id,
        paymentReference: existing.paymentReference,
        stripeMode: existing.stripeMode,
        checkoutUrl: existing.checkoutUrl,
        billingOrderReference: existing.billingOrderReference,
        status: existing.status,
        paymentStatus: existing.paymentStatus,
        replayed: true,
      })
    }

    const syncState = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()
    if (!syncState) return createResultError(op, "The catalog is not available")
    if (args.catalogVersion !== syncState.version) return createResultError(op, "The catalog version is stale")

    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
      .unique()
    if (!event) return createResultError(op, "The event was not found")
    if (event.status !== "published") return createResultError(op, "The event is not available for checkout")

    const requestedSelections = [...args.tickets].sort((left, right) => left.tierKey.localeCompare(right.tierKey))
    const seenTierKeys = new Set<string>()
    const lineInputs: Array<{
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
    for (const selection of requestedSelections) {
      if (seenTierKeys.has(selection.tierKey)) return createResultError(op, "Ticket tiers must be selected once")
      seenTierKeys.add(selection.tierKey)
      if (!Number.isInteger(selection.quantity) || selection.quantity < 1 || selection.quantity > 1_000)
        return createResultError(op, "Ticket quantity is invalid")
      if (selection.participantNames === undefined || selection.participantNames.length !== selection.quantity)
        return createResultError(op, "Each ticket requires exactly one participant name")
      if (selection.participantNames.some((name) => name.trim().length === 0))
        return createResultError(op, "Participant names are incomplete")
      const tier = await ctx.db
        .query("catalogTicketTiers")
        .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id).eq("tierKey", selection.tierKey))
        .unique()
      if (!tier) return createResultError(op, "The ticket tier was not found")
      const available = tier.capacity - tier.reserved - tier.sold
      if (selection.quantity > available) return createResultError(op, "The requested ticket quantity is unavailable")
      subtotalCents += tier.priceCents * selection.quantity
      feeCents += tier.feeCents * selection.quantity
      lineInputs.push({
        tierId: tier._id,
        tierKey: tier.tierKey,
        tierName: tier.name,
        tierDescription: tier.description,
        quantity: selection.quantity,
        ...(selection.participantNames !== undefined
          ? { participantNames: selection.participantNames.map((name) => name.trim()) }
          : {}),
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
      customerPhone: args.customerPhone,
      contactSnapshotJson: JSON.stringify({
        email: args.customerEmail,
        givenName: args.customerGivenName,
        familyName: args.customerFamilyName,
        phone: args.customerPhone,
      }),
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
      catalogVersion: syncState.version,
      subtotalCents,
      feeCents,
      totalCents: subtotalCents + feeCents,
      checkoutContextJson: contextJson,
      paymentReference: args.paymentReference,
      stripeMode: args.stripeMode,
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
      const tier = await ctx.db.get(line.tierId)
      if (!tier) return createResultError(op, "The ticket tier disappeared during reservation")
      await ctx.db.patch("catalogTicketTiers", line.tierId, {
        reserved: tier.reserved + line.quantity,
      })
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
      replayed: false,
    })
  },
})
