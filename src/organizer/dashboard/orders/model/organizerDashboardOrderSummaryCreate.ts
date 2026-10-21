import type { Doc } from "#convex/_generated/dataModel.js"

/** Explicit allowlist: never spread canonical order documents into public DTOs. */
export function organizerDashboardOrderSummaryCreate(order: Doc<"ticketOrders">) {
  const contact = order.operationalContact
  return {
    orderId: order._id,
    bookingNumber: order.bookingNumber ?? null,
    eventKey: order.eventKey,
    eventTitle: order.eventTitle,
    eventStartsAt: order.eventStartsAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    paidAt: order.paidAt ?? null,
    buyer: {
      givenName: contact?.givenName ?? order.customerGivenName ?? "",
      familyName: contact?.familyName ?? order.customerFamilyName ?? "",
      email: contact?.email ?? order.customerEmail,
      phone: contact?.phone ?? order.customerPhone ?? "",
    },
    subtotalCents: order.subtotalCents,
    feeCents: order.feeCents,
    totalCents: order.totalCents,
  }
}
export type OrganizerDashboardOrderSummary = ReturnType<typeof organizerDashboardOrderSummaryCreate>
