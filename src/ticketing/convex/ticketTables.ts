import { defineTable } from "convex/server"
import { v } from "convex/values"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"

const ticketOrderStatusValidator = v.union(
  v.literal("reserved"),
  v.literal("checkout_created"),
  v.literal("paid"),
  v.literal("failed"),
  v.literal("expired"),
  v.literal("released"),
  v.literal("paid_inventory_conflict"),
)

const ticketPaymentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("failed"),
  v.literal("expired"),
)

const ticketReservationStatusValidator = v.union(v.literal("active"), v.literal("released"), v.literal("consumed"))

const ticketFulfillmentWorkStatusValidator = v.union(
  v.literal("pending"),
  v.literal("preparing"),
  v.literal("prepared"),
)

export const ticketTables = {
  ticketOrders: defineTable({
    checkoutKey: v.string(),
    ownerUserId: v.optional(vIdUser),
    guestAccessDigest: v.optional(v.string()),
    emailAccessDigest: v.optional(v.string()),
    emailAccessRevokedAt: v.optional(v.string()),
    customerEmail: v.string(),
    customerGivenName: v.optional(v.string()),
    customerFamilyName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    contactSnapshotJson: v.string(),
    eventKey: v.string(),
    eventTitle: v.string(),
    eventSubtitle: v.string(),
    eventDescription: v.string(),
    eventStartsAt: v.string(),
    eventEndsAt: v.string(),
    eventDoorsAt: v.string(),
    venue: v.string(),
    city: v.string(),
    address: v.string(),
    organizer: v.string(),
    imageUrl: v.string(),
    imageAlt: v.string(),
    catalogVersion: v.number(),
    subtotalCents: v.number(),
    feeCents: v.number(),
    totalCents: v.number(),
    checkoutContextJson: v.string(),
    paymentReference: v.string(),
    stripeMode: v.union(v.literal("live"), v.literal("test")),
    fulfillmentEligible: v.optional(v.boolean()),
    legalDocumentSetRevision: v.optional(v.string()),
    legalTermsMarkdown: v.optional(v.string()),
    legalPrivacyMarkdown: v.optional(v.string()),
    billingOrderReference: v.optional(v.string()),
    checkoutUrl: v.optional(v.string()),
    status: ticketOrderStatusValidator,
    paymentStatus: ticketPaymentStatusValidator,
    reservationExpiresAt: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
    checkoutCreatedAt: v.optional(v.string()),
    paidAt: v.optional(v.string()),
    releasedAt: v.optional(v.string()),
    checkoutAttemptLeaseUntil: v.optional(v.number()),
    lastPaymentCheckAt: v.optional(v.string()),
    lastPaymentError: v.optional(v.string()),
  })
    .index("checkoutKey", ["checkoutKey"])
    .index("paymentReference", ["paymentReference"])
    .index("statusAndUpdatedAt", ["status", "updatedAt"])
    .index("createdAt", ["createdAt"])
    .index("emailAccessDigest", ["emailAccessDigest"])
    .index("ownerUserId", ["ownerUserId"])
    .index("ownerUserIdAndCreatedAt", ["ownerUserId", "createdAt"]),

  ticketOrderDeliveries: defineTable({
    orderId: v.id("ticketOrders"),
    accessTokenSnapshot: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("orderId", ["orderId"]),

  ticketOrderLines: defineTable({
    orderId: v.id("ticketOrders"),
    tierId: v.id("catalogTicketTiers"),
    eventKey: v.string(),
    tierKey: v.string(),
    tierName: v.string(),
    tierDescription: v.string(),
    quantity: v.number(),
    participantNamesJson: v.optional(v.string()),
    priceCents: v.number(),
    feeCents: v.number(),
    createdAt: v.string(),
  }).index("orderId", ["orderId"]),

  ticketReservations: defineTable({
    orderId: v.id("ticketOrders"),
    tierId: v.id("catalogTicketTiers"),
    quantity: v.number(),
    participantNamesJson: v.optional(v.string()),
    status: ticketReservationStatusValidator,
    expiresAt: v.number(),
    createdAt: v.string(),
    releasedAt: v.optional(v.string()),
  })
    .index("orderId", ["orderId"])
    .index("tierIdAndStatus", ["tierId", "status"])
    .index("statusAndExpiresAt", ["status", "expiresAt"]),

  ticketPaymentAttempts: defineTable({
    orderId: v.id("ticketOrders"),
    paymentReference: v.string(),
    stripeMode: v.union(v.literal("live"), v.literal("test")),
    billingOrderReference: v.optional(v.string()),
    checkoutUrl: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("checkout_created"),
      v.literal("paid"),
      v.literal("failed"),
      v.literal("expired"),
    ),
    createdAt: v.string(),
    updatedAt: v.string(),
    lastCheckedAt: v.optional(v.string()),
  })
    .index("orderId", ["orderId"])
    .index("paymentReference", ["paymentReference"]),

  ticketFulfillmentWork: defineTable({
    orderId: v.id("ticketOrders"),
    paymentReference: v.string(),
    billingOrderReference: v.string(),
    stripeMode: v.optional(v.union(v.literal("live"), v.literal("test"))),
    requestSnapshotJson: v.string(),
    onlineTicketUrl: v.optional(v.string()),
    status: ticketFulfillmentWorkStatusValidator,
    attemptCount: v.number(),
    nextAttemptAt: v.number(),
    leaseUntil: v.optional(v.number()),
    lastError: v.optional(v.string()),
    fulfillmentReference: v.optional(v.string()),
    preparedAt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("orderId", ["orderId"])
    .index("stripeModeAndStatusAndNextAttemptAt", ["stripeMode", "status", "nextAttemptAt"])
    .index("statusAndNextAttemptAt", ["status", "nextAttemptAt"]),

  ticketIssued: defineTable({
    orderId: v.id("ticketOrders"),
    sequence: v.number(),
    ownerUserId: v.optional(vIdUser),
    guestAccessDigest: v.optional(v.string()),
    code: v.string(),
    eventKey: v.string(),
    eventTitle: v.string(),
    eventStartsAt: v.string(),
    eventDoorsAt: v.string(),
    venue: v.string(),
    city: v.string(),
    address: v.string(),
    tierKey: v.string(),
    tierName: v.string(),
    priceCents: v.number(),
    feeCents: v.number(),
    participantName: v.optional(v.string()),
    cancelled: v.optional(v.boolean()),
    checkedInAt: v.optional(v.string()),
    checkedInBy: v.optional(vIdUser),
    checkedInByName: v.optional(v.string()),
    issuedAt: v.string(),
  })
    .index("orderIdAndSequence", ["orderId", "sequence"])
    .index("code", ["code"])
    .index("eventKey", ["eventKey"])
    .index("eventKeyAndSequenceAndCode", ["eventKey", "sequence", "code"])
    .index("ownerUserId", ["ownerUserId"]),

  ticketCheckInHistory: defineTable({
    ticketId: v.id("ticketIssued"),
    orderId: v.id("ticketOrders"),
    eventKey: v.string(),
    ticketNumber: v.string(),
    action: v.union(v.literal("check_in"), v.literal("reset")),
    occurredAt: v.string(),
    checkInAt: v.string(),
    operatorId: vIdUser,
    operatorName: v.string(),
    participantName: v.string(),
    buyerName: v.string(),
    buyerEmail: v.string(),
  })
    .index("ticketIdAndOccurredAt", ["ticketId", "occurredAt"])
    .index("eventKeyAndOccurredAt", ["eventKey", "occurredAt"]),
} as const
