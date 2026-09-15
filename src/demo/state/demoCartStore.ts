import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { EventItem } from "../../events/EventItem.ts"
import type { TicketCart } from "../../ticketing/TicketCart.ts"
import type { TicketCartDraft } from "../../ticketing/TicketCartDraft.ts"
import { ticketCartDraftAddOrUpdate } from "../../ticketing/ticketCartDraftAddOrUpdate.ts"
import { ticketCartDraftQuantitySet } from "../../ticketing/ticketCartDraftQuantitySet.ts"

const initialDraft: TicketCartDraft = [
  {
    eventId: "kraftklub-arena-berlin",
    lines: [
      { tierId: "innenraum", quantity: 2 },
      { tierId: "early-entry", quantity: 1 },
    ],
  },
  {
    eventId: "museumsnacht-muenchen",
    lines: [{ tierId: "museum-standard", quantity: 1 }],
  },
]

const draft = createSignalObject<TicketCartDraft>(initialDraft)

export const demoCartStore = {
  draft: draft.get,
  addOrUpdate: (cart: TicketCart) => draft.set(ticketCartDraftAddOrUpdate(draft.get(), cart)),
  updateQuantity: (eventId: string, tierId: string, quantity: number) =>
    draft.set(ticketCartDraftQuantitySet(draft.get(), eventId, tierId, quantity)),
  clear: () => draft.set([]),
  eventFind: (eventId: string, events: readonly EventItem[]) => events.find((event) => event.id === eventId),
}
