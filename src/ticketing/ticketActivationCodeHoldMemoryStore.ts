import { ticketActivationCodeHoldStoredExpired } from "./ticketActivationCodeHoldStoredExpired.ts"
import type { TicketActivationCodeHoldStored } from "./ticketActivationCodeHoldStoredSchema.ts"
import { ticketActivationCodeNormalize } from "./ticketActivationCodeNormalize.ts"

type TicketActivationCodeHoldContext = {
  readonly eventKey: string
  readonly tierKey: string
  readonly code: string
}

const records = new Map<string, TicketActivationCodeHoldStored>()

/**
 * Context key of one hold: event, tier and normalized code. Two different
 * contexts never share an entry, so a credential of one event can never be
 * read for another one.
 */
function ticketActivationCodeHoldContextKey(context: TicketActivationCodeHoldContext): string {
  const eventKey = context.eventKey.trim()
  const tierKey = context.tierKey.trim()
  const code = ticketActivationCodeNormalize(context.code)
  return `${eventKey}\u0000${tierKey}\u0000${code}`
}

/**
 * Same-document mirror of the persisted hold records.
 *
 * A denied browser store must not cost the buyer the hold credential: the
 * reservation already exists on the server, so the credential has to survive
 * in the page until the checkout sends it. The mirror lives exactly as long
 * as the document and never widens a context: every entry stays bound to its
 * own event, tier and normalized code. Records past the mirrored server
 * deadline leave the mirror, they never release anything on the server.
 *
 * Only browser interactions fill the mirror: a server render never reserves
 * a code, so no credential is shared between two requests.
 */
export const ticketActivationCodeHoldMemoryStore = {
  set(record: TicketActivationCodeHoldStored): void {
    records.set(ticketActivationCodeHoldContextKey(record), record)
  },
  get(context: TicketActivationCodeHoldContext): TicketActivationCodeHoldStored | undefined {
    const key = ticketActivationCodeHoldContextKey(context)
    const found = records.get(key)
    if (!found) return undefined
    if (ticketActivationCodeHoldStoredExpired(found)) {
      records.delete(key)
      return undefined
    }
    return found
  },
  delete(context: TicketActivationCodeHoldContext): void {
    records.delete(ticketActivationCodeHoldContextKey(context))
  },
  records(): readonly TicketActivationCodeHoldStored[] {
    const live: TicketActivationCodeHoldStored[] = []
    for (const [key, record] of records) {
      if (ticketActivationCodeHoldStoredExpired(record)) {
        records.delete(key)
        continue
      }
      live.push(record)
    }
    return live
  },
  clear(): void {
    records.clear()
  },
}
