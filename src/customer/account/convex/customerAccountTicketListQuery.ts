import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { customerAccountTicketCreate, type CustomerAccountTicket } from "../model/customerAccountTicketCreate.ts"

const maxPageSize = 50
const maxPageBytes = 512 * 1024

/** Own tickets of the authenticated customer; no digests or order internals. */
export const customerAccountTicketListQuery = query({
  args: { token: v.string(), paginationOpts: paginationOptsValidator },
  handler: (ctx, args): PromiseResult<{ page: CustomerAccountTicket[]; isDone: boolean; continueCursor: string }> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId, paginationOpts }) => {
      const op = "customerAccountTicketListQuery"
      if (
        !Number.isInteger(paginationOpts.numItems) ||
        paginationOpts.numItems < 1 ||
        paginationOpts.numItems > maxPageSize
      ) {
        return createResultError(op, "Seitengröße muss 1 bis 50 sein")
      }
      const page = await queryCtx.db
        .query("ticketIssued")
        .withIndex("ownerUserId", (q) => q.eq("ownerUserId", userId))
        .order("desc")
        .paginate({
          cursor: paginationOpts.cursor,
          endCursor: paginationOpts.endCursor,
          numItems: paginationOpts.numItems,
          maximumRowsRead: maxPageSize,
          maximumBytesRead: maxPageBytes,
        })
      return createResult({
        ...page,
        page: page.page.map((ticket) =>
          customerAccountTicketCreate({
            ticketId: String(ticket._id),
            code: ticket.code,
            eventKey: ticket.eventKey,
            eventTitle: ticket.eventTitle,
            eventStartsAt: ticket.eventStartsAt,
            venue: ticket.venue,
            city: ticket.city,
            tierName: ticket.tierName,
            participantName: ticket.participantName ?? "",
            ...(ticket.checkedInAt !== undefined ? { checkedInAt: ticket.checkedInAt } : {}),
            ...(ticket.cancelled === true ? { cancelled: true as const } : {}),
            issuedAt: ticket.issuedAt,
          }),
        ),
      })
    }),
})
