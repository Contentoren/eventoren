import * as v from "valibot"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import { ticketCheckoutRetryKey } from "./ticketCheckoutRetryKey.ts"
import { ticketCheckoutRetryMemoryStore } from "./ticketCheckoutRetryMemoryStore.ts"
import {
  type TicketCheckoutRetryStored,
  ticketCheckoutRetryStoredSchema,
  ticketCheckoutRetryStoredWindow,
} from "./ticketCheckoutRetryStoredSchema.ts"

const op = "ticketCheckoutRetryStorageLoad"

/**
 * The stored retry payload of this browser.
 *
 * `records` carries the snapshots this browser understands, `unknown` carries
 * the entries it does not understand. An unknown record is never handed out
 * and never overwritten: it stays in the store until the buyer clears it.
 */
export type TicketCheckoutRetryStoredEntries = {
  readonly kind: "entries" | "absent" | "denied" | "malformed"
  readonly records: readonly TicketCheckoutRetryStored[]
  readonly unknown: readonly unknown[]
}

/**
 * Reads the stored retry payload without changing it.
 *
 * The read never throws: a missing, denied and malformed store are reported
 * as their own kind, so the caller can decide between the document cache and
 * failing closed.
 */
export function ticketCheckoutRetryStoredEntries(): TicketCheckoutRetryStoredEntries {
  if (typeof localStorage === "undefined") return { kind: "absent", records: [], unknown: [] }

  let raw: string | null
  try {
    raw = localStorage.getItem(ticketCheckoutRetryKey)
  } catch {
    return { kind: "denied", records: [], unknown: [] }
  }
  if (raw === null) return { kind: "entries", records: [], unknown: [] }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { kind: "malformed", records: [], unknown: [] }
  }
  if (!Array.isArray(parsed)) return { kind: "malformed", records: [], unknown: [] }

  const records: TicketCheckoutRetryStored[] = []
  const unknown: unknown[] = []
  for (const entry of parsed) {
    const validated = v.safeParse(ticketCheckoutRetryStoredSchema, entry)
    if (validated.success) records.push(validated.output)
    else unknown.push(entry)
  }
  return { kind: "entries", records, unknown }
}

/**
 * Live retry snapshots of this browser.
 *
 * The stored snapshots and the same-document mirror answer together: a denied
 * browser store must not cost the buyer the retry evidence of the current
 * page.
 *
 * A snapshot whose local browser window has ended leaves the result and is
 * pruned from the store as well. The window is a local mirror only: it never
 * releases a code on the server and never touches an order that already
 * carries the code.
 *
 * A malformed store fails closed: the stored records stay untouched and
 * nothing is replayed from a payload this browser does not understand.
 */
export function ticketCheckoutRetryStorageLoad(): Result<readonly TicketCheckoutRetryStored[]> {
  const stored = ticketCheckoutRetryStoredEntries()
  const mirrored = ticketCheckoutRetryMemoryStore.records()

  if (stored.kind === "malformed") {
    return createResultError(op, "Gespeicherte Checkout-Wiederholung ist ungültig.", stored)
  }
  if (stored.kind === "absent") return createResult([])
  if (stored.kind === "denied") {
    if (mirrored.length === 0) {
      return createResultError(op, "Checkout-Wiederholung konnte nicht geladen werden.", stored)
    }
    return createResult(mirrored)
  }

  const live = stored.records.filter((record) => !ticketCheckoutRetryStoredWindow.expired(record))
  if (live.length !== stored.records.length) {
    // Best effort cleanup: a snapshot past its local window leaves the store.
    // Unknown records are written back unchanged, an unknown record is never
    // overwritten.
    try {
      localStorage.setItem(ticketCheckoutRetryKey, JSON.stringify([...live, ...stored.unknown]))
    } catch {
      // A denied store keeps its expired snapshots, they stay filtered out.
    }
  }
  return createResult(ticketCheckoutRetryStoredMerged(live, mirrored))
}

/**
 * Merges the stored snapshots with the same-document mirror.
 *
 * One checkout key carries one window: the snapshot with the earliest save
 * moment wins, so the mirrored window never extends an existing one.
 */
export function ticketCheckoutRetryStoredMerged(
  stored: readonly TicketCheckoutRetryStored[],
  mirrored: readonly TicketCheckoutRetryStored[],
): TicketCheckoutRetryStored[] {
  const merged = new Map<string, TicketCheckoutRetryStored>()
  for (const record of [...stored, ...mirrored]) {
    const known = merged.get(record.checkoutKey)
    if (known === undefined || record.savedAt < known.savedAt) merged.set(record.checkoutKey, record)
  }
  return [...merged.values()]
}
