import { type TicketCheckoutRetryStored, ticketCheckoutRetryStoredWindow } from "./ticketCheckoutRetryStoredSchema.ts"

/**
 * Same-document mirror of the stored retry snapshots.
 *
 * A denied browser store must not cost the buyer the retry evidence of the
 * current document: the snapshot stays in the mirror until the document
 * closes, so a repeated submit of the same booking still finds its own
 * checkout key and guest credential.
 *
 * The mirror lives exactly as long as the document and never widens a
 * checkout key: every entry stays bound to its own checkout key. A snapshot
 * past its local deadline leaves the mirror, it never releases anything on
 * the server.
 *
 * The mirror only exists in a browser document. A server render shares its
 * module memory between requests, so a mirrored snapshot would leak into the
 * next request.
 */
const records = new Map<string, TicketCheckoutRetryStored>()

/**
 * True when the current runtime owns a browser store.
 *
 * Only a browser document may hold retry evidence: a server render shares
 * its module memory between requests, so a mirrored snapshot would leak into
 * the next request.
 */
function ticketCheckoutRetryMemoryBrowser(): boolean {
  return typeof localStorage !== "undefined"
}

export const ticketCheckoutRetryMemoryStore = {
  /**
   * Replaces the mirrored snapshots with the given set.
   *
   * The mirror always mirrors the written set: a snapshot that the store
   * dropped leaves the mirror as well.
   */
  replace(next: readonly TicketCheckoutRetryStored[]): void {
    if (!ticketCheckoutRetryMemoryBrowser()) return
    records.clear()
    for (const record of next) records.set(record.checkoutKey, record)
  },
  /**
   * The live mirrored snapshots of this document.
   *
   * A snapshot past its local deadline leaves the mirror: the browser window
   * of that attempt is over.
   */
  records(): readonly TicketCheckoutRetryStored[] {
    const live: TicketCheckoutRetryStored[] = []
    for (const [checkoutKey, record] of records) {
      if (ticketCheckoutRetryStoredWindow.expired(record)) {
        records.delete(checkoutKey)
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
