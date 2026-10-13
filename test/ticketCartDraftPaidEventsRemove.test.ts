import { expect, test } from "bun:test"
import type { TicketCartDraft } from "../src/ticketing/TicketCartDraft.ts"
import { ticketCartDraftPaidEventsRemove } from "../src/ticketing/ticketCartDraftPaidEventsRemove.ts"

test("ticketCartDraftPaidEventsRemove removes paid events and preserves unpaid events", () => {
  const draft: TicketCartDraft = [
    { eventId: "event-1", lines: [{ tierId: "t1", quantity: 2 }] },
    { eventId: "event-2", lines: [{ tierId: "t2", quantity: 1 }] },
  ]

  const result = ticketCartDraftPaidEventsRemove(draft, ["event-1"])

  expect(result).toEqual([{ eventId: "event-2", lines: [{ tierId: "t2", quantity: 1 }] }])
})

test("ticketCartDraftPaidEventsRemove returns empty array when all events are paid", () => {
  const draft: TicketCartDraft = [{ eventId: "event-1", lines: [{ tierId: "t1", quantity: 2 }] }]

  const result = ticketCartDraftPaidEventsRemove(draft, ["event-1"])

  expect(result).toEqual([])
})

test("ticketCartDraftPaidEventsRemove leaves draft unchanged when no events match", () => {
  const draft: TicketCartDraft = [{ eventId: "event-1", lines: [{ tierId: "t1", quantity: 2 }] }]

  const result = ticketCartDraftPaidEventsRemove(draft, ["event-other"])

  expect(result).toEqual(draft)
})

test("ticketCartDraftPaidEventsRemove handles empty draft or empty paid keys", () => {
  expect(ticketCartDraftPaidEventsRemove([], ["event-1"])).toEqual([])
  expect(ticketCartDraftPaidEventsRemove([{ eventId: "event-1", lines: [{ tierId: "t1", quantity: 1 }] }], [])).toEqual(
    [{ eventId: "event-1", lines: [{ tierId: "t1", quantity: 1 }] }],
  )
})
