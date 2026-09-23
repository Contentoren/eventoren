import type { EventorenTicketFulfillmentPrepareRequest } from "billing/contracts/eventorenTicketFulfillmentPrepareRequestSchema"
import type { TicketPdfTicket } from "pdf-generator"
import type { Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult, type Result } from "#result"

export type TicketFulfillmentWorkSnapshot = Omit<EventorenTicketFulfillmentPrepareRequest, "onlineTicketUrl">

export async function ticketFulfillmentWorkSnapshotCreate(
  ctx: MutationCtx,
  orderId: Id<"ticketOrders">,
  billingOrderReference: string,
): PromiseResult<TicketFulfillmentWorkSnapshot> {
  const op = "ticketFulfillmentWorkSnapshotCreate"
  const order = await ctx.db.get(orderId)
  if (!order) return createResultError(op, "The order was not found")
  const tickets = await ctx.db
    .query("ticketIssued")
    .withIndex("orderIdAndSequence", (q) => q.eq("orderId", orderId))
    .collect()
  if (tickets.length === 0) return createResultError(op, "The paid order has no issued tickets")

  const checkoutContext = checkoutContextRead(order.checkoutContextJson)
  if (!checkoutContext.success) return checkoutContext
  if (
    order.legalDocumentSetRevision === undefined ||
    order.legalTermsMarkdown === undefined ||
    order.legalPrivacyMarkdown === undefined
  )
    return createResultError(op, "The order has no immutable legal snapshot")

  return createResult({
    orderReference: billingOrderReference,
    paymentReference: order.paymentReference,
    event: {
      eventKey: order.eventKey,
      title: order.eventTitle,
      startsAt: order.eventStartsAt,
      endsAt: order.eventEndsAt,
      doorsAt: order.eventDoorsAt,
      venue: order.venue,
      city: order.city,
      address: order.address,
    },
    tickets: tickets
      .sort((left, right) => left.sequence - right.sequence)
      .map((ticket) => {
        const pdfTicket: TicketPdfTicket = {
          code: ticket.code,
          eventTitle: ticket.eventTitle,
          eventStartsAt: ticket.eventStartsAt,
          tierName: ticket.tierName,
          sequence: ticket.sequence,
          eventDoorsAt: ticket.eventDoorsAt,
          venue: ticket.venue,
          city: ticket.city,
          address: ticket.address,
          ...(ticket.participantName !== undefined ? { participantName: ticket.participantName } : {}),
        }
        return {
          ticketId: ticket._id,
          admissionCode: pdfTicket.code,
          sequence: ticket.sequence,
          tierKey: ticket.tierKey,
          tierLabel: pdfTicket.tierName,
          ...(pdfTicket.participantName !== undefined ? { participantName: pdfTicket.participantName } : {}),
        }
      }),
    locale: checkoutContext.data.locale,
    legalContext: {
      cta: checkoutContext.data.cta,
      termsAccepted: true,
      privacyAcknowledged: true,
      documentSetRevision: order.legalDocumentSetRevision,
      termsMarkdown: order.legalTermsMarkdown,
      privacyMarkdown: order.legalPrivacyMarkdown,
    },
  })
}

function checkoutContextRead(value: string): Result<{ locale: "de" | "en"; cta: string }> {
  const op = "ticketFulfillmentWorkSnapshotCreate"
  try {
    const parsed: unknown = JSON.parse(value)
    if (!isRecord(parsed) || (parsed.locale !== "de" && parsed.locale !== "en"))
      return createResultError(op, "The order locale snapshot is invalid")
    if (!isRecord(parsed.legalContext) || typeof parsed.legalContext.cta !== "string")
      return createResultError(op, "The order legal CTA snapshot is invalid")
    return createResult({ locale: parsed.locale, cta: parsed.legalContext.cta })
  } catch (error) {
    return createResultError(op, "The checkout snapshot is invalid", String(error))
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
