import type { TicketCartDraft } from "./TicketCartDraft.ts"

export function ticketCartDraftPaidEventsRemove(
  draft: TicketCartDraft,
  paidEventKeys: readonly string[],
): TicketCartDraft {
  if (paidEventKeys.length === 0 || draft.length === 0) return draft
  const paidSet = new Set(paidEventKeys)
  return draft.filter((entry) => !paidSet.has(entry.eventId))
}
