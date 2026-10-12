import { createResultError } from "#result"
import {
  ticketPurchaseBillingReadinessCheck,
  type TicketPurchaseBillingReadinessState,
} from "./ticketPurchaseBillingReadinessCheck.ts"

export type TicketPurchaseBillingReadinessRead = () => Promise<{
  success: boolean
  errorMessage?: string
  data?: TicketPurchaseBillingReadinessState | null
}>

/**
 * Bounded poll of the existing catalog sync state until the published version
 * is acknowledged as synced in Billing. Read-only: never republishes or
 * retries checkout, so resume reruns it safely. Every failure retains the
 * checkpoint for resume.
 */
export async function ticketPurchaseBillingReadinessWait(input: {
  publishedVersion: number
  readSyncState: TicketPurchaseBillingReadinessRead
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  deadlineMs?: number
  pollIntervalMs?: number
}) {
  const op = "ticketPurchaseBillingReadinessWait"
  const now = input.now ?? Date.now
  const sleep = input.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const deadlineMs = input.deadlineMs ?? 60_000
  const pollIntervalMs = input.pollIntervalMs ?? 1_000
  const deadline = now() + deadlineMs
  for (;;) {
    const read = await input.readSyncState()
    if (!read.success) return read
    if (read.data) {
      if (read.data.status === "failed")
        return createResultError(
          op,
          `Billing publication sync failed at version ${read.data.version}; checkpoint retained`,
        )
      const ready = ticketPurchaseBillingReadinessCheck({ publishedVersion: input.publishedVersion, sync: read.data })
      if (ready.success) return ready
    }
    if (now() >= deadline)
      return createResultError(op, "Billing publication not ready before deadline; checkpoint retained")
    await sleep(pollIntervalMs)
  }
}
