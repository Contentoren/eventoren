import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError } from "#result"
import { catalogAdminAuthorizeFn } from "#src/catalog/convex/catalogAdminAuthorizeFn.js"
import { catalogE2eOwnedOrderCheck } from "#src/catalog/convex/catalogE2eOwnedOrderCheck.js"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"

const maxPageSize = 50
const maxPageBytes = 256 * 1024
// Matches e2e/mail/ticketE2eImapMessageWait.ts imapClockSkewMs: checkpoint
// Date.now and Convex _creationTime may disagree by clock skew, so an order
// or event created up to 5 minutes before the run timestamp still proves the
// run. No other allowance is guessed.
const ticketE2eClockSkewMs = 5 * 60_000
const stripeSessionPattern = /\bcs_test_[A-Za-z0-9]+\b/u

/**
 * Read-only, admin-authorized exact run order discovery for an IDless started
 * checkout. A Stripe global absence alone must not permit a duplicate app
 * order when an old reservation exists before the Stripe session fails: the
 * caller proves absence through this full ticketOrders index page (which
 * includes reserved, pending, expired, released and cancelled rows) instead
 * of inferring it from active reservations only. Only orders with the exact
 * checkpoint markers (E2E + runId customer name, E2E Participant runId line,
 * Ticket E2E runId event snapshot, test Stripe mode, creation at or after the
 * run minus clock skew) are returned; foreign, old, paid-conflict and
 * incidental-substring rows are excluded so genuine same-event tickets stay
 * protected. Multiple owned rows are all returned: the caller must refuse the
 * ambiguity without cleanup or creation. Never returns PII, contact snapshots,
 * checkout keys, capability digests or access tokens: only the required
 * order identity and Stripe correlation fields.
 */
export const ticketE2eOrderDiscoveryQuery = query({
  args: {
    token: v.string(),
    eventKey: v.string(),
    runId: v.string(),
    runCreatedAt: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  handler: (ctx, args) =>
    authQueryTokenToUserId(
      ctx,
      args,
      async (authorizedCtx, { userId, eventKey, runId, runCreatedAt, paginationOpts }) => {
        const op = "ticketE2eOrderDiscoveryQuery"
        const admin = await catalogAdminAuthorizeFn(authorizedCtx, userId)
        if (!admin.success) return admin
        if (eventKey !== `ticket-e2e-${runId}` || !Number.isSafeInteger(runCreatedAt) || runCreatedAt < 1)
          return createResultError(op, "Run marker mismatch")
        if (
          !Number.isInteger(paginationOpts.numItems) ||
          paginationOpts.numItems < 1 ||
          paginationOpts.numItems > maxPageSize
        )
          return createResultError(op, `numItems must be between 1 and ${maxPageSize}`)
        const event = await authorizedCtx.db
          .query("catalogEvents")
          .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
          .unique()
        if (
          !event ||
          event.title !== `Ticket E2E ${runId}` ||
          event.organizer !== `Eventoren Ticket E2E ${runId}` ||
          event._creationTime < runCreatedAt - ticketE2eClockSkewMs
        )
          return createResultError(op, "Exact test event ownership cannot be proven")
        const expectedParticipant = `E2E Participant ${runId}`
        const earliestCreationTime = Math.max(event._creationTime, runCreatedAt) - ticketE2eClockSkewMs
        const page = await authorizedCtx.db
          .query("ticketOrders")
          .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", eventKey))
          .order("asc")
          .paginate({
            cursor: paginationOpts.cursor,
            endCursor: paginationOpts.endCursor,
            numItems: paginationOpts.numItems,
            maximumRowsRead: maxPageSize,
            maximumBytesRead: maxPageBytes,
          })
        const owned: Array<{
          orderId: string
          paymentReference: string
          billingOrderReference: string | null
          status: string
          paymentStatus: string
          checkoutUrl: string | null
          stripeSessionId: string | null
          reservationExpiresAt: number
          createdAt: string
          creationTime: number
        }> = []
        for (const order of page.page) {
          const check = catalogE2eOwnedOrderCheck({
            eventTitle: event.title,
            organizer: event.organizer,
            customerGivenName: order.customerGivenName,
            customerFamilyName: order.customerFamilyName,
            eventSnapshotTitle: order.eventTitle,
            eventSnapshotOrganizer: order.organizer,
            stripeMode: order.stripeMode,
            status: order.status,
            creationTime: order._creationTime,
            earliestCreationTime,
            runId,
          })
          if (!check.success) continue
          const lines = await authorizedCtx.db
            .query("ticketOrderLines")
            .withIndex("orderId", (q) => q.eq("orderId", order._id))
            .take(3)
          if (lines.length !== 1 || lines[0]?.participantNamesJson !== JSON.stringify([expectedParticipant])) continue
          const checkoutUrl = order.checkoutUrl ?? null
          owned.push({
            orderId: order._id,
            paymentReference: order.paymentReference,
            billingOrderReference: order.billingOrderReference ?? null,
            status: order.status,
            paymentStatus: order.paymentStatus,
            checkoutUrl,
            stripeSessionId: checkoutUrl?.match(stripeSessionPattern)?.[0] ?? null,
            reservationExpiresAt: order.reservationExpiresAt,
            createdAt: order.createdAt,
            creationTime: order._creationTime,
          })
        }
        return createResult({
          page: owned,
          isDone: page.isDone,
          continueCursor: page.continueCursor,
        })
      },
    ),
})
