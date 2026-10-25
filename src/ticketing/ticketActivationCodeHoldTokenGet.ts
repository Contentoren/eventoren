import { createResult } from "../ui/createResult.ts"
import type { Result } from "../ui/Result.ts"
import { ticketActivationCodeHoldMemoryStore } from "./ticketActivationCodeHoldMemoryStore.ts"
import { ticketActivationCodeHoldStorageLoad } from "./ticketActivationCodeHoldStorageLoad.ts"
import { ticketActivationCodeHoldStorageSave } from "./ticketActivationCodeHoldStorageSave.ts"
import { ticketActivationCodeNormalize } from "./ticketActivationCodeNormalize.ts"

/**
 * Returns the caller's own stored hold credential for the exact
 * event/tier/code context, or undefined when nothing is stored.
 *
 * The same-document mirror answers first: a denied browser store must not
 * cost the buyer the credential of a reservation that already exists on the
 * server. The persistent store is the fallback for a fresh document.
 */
export function ticketActivationCodeHoldTokenGet(input: {
  readonly eventKey: string
  readonly tierKey: string
  readonly code: string
}): Result<string | undefined> {
  const code = ticketActivationCodeNormalize(input.code)
  const mirrored = ticketActivationCodeHoldMemoryStore.get({
    eventKey: input.eventKey,
    tierKey: input.tierKey,
    code,
  })
  if (mirrored !== undefined) return createResult(mirrored.holdToken)
  const loaded = ticketActivationCodeHoldStorageLoad()
  if (!loaded.success) return createResult(undefined)
  const found = loaded.data.find(
    (candidate) =>
      candidate.eventKey === input.eventKey.trim() &&
      candidate.tierKey === input.tierKey.trim() &&
      candidate.code === code,
  )
  return createResult(found?.holdToken)
}

/**
 * Removes the stored hold credential for the exact event/tier/code context.
 * Storage failures stay non-fatal; a denied store never fails the purchase.
 */
export function ticketActivationCodeHoldTokenClear(input: {
  readonly eventKey: string
  readonly tierKey: string
  readonly code: string
}): Result<null> {
  const code = ticketActivationCodeNormalize(input.code)
  ticketActivationCodeHoldMemoryStore.delete({ eventKey: input.eventKey, tierKey: input.tierKey, code })
  const loaded = ticketActivationCodeHoldStorageLoad()
  if (!loaded.success) return createResult(null)
  const next = loaded.data.filter(
    (candidate) =>
      !(
        candidate.eventKey === input.eventKey.trim() &&
        candidate.tierKey === input.tierKey.trim() &&
        candidate.code === code
      ),
  )
  if (next.length === loaded.data.length) return createResult(null)
  const saved = ticketActivationCodeHoldStorageSave(next)
  if (!saved.success) return createResult(null)
  return saved
}
