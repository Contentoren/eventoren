import { createResult, createResultError, type Result } from "#result"

export type TicketPurchaseBillingReadinessState = {
  version: number
  status: string
  syncedVersion: number | null
}

/**
 * Pure Billing publication readiness decision. The published catalog version
 * is registered in Billing only once the scheduled push marks that version
 * synced; local `published` status alone never proves it.
 */
export function ticketPurchaseBillingReadinessCheck(input: {
  publishedVersion: number
  sync: TicketPurchaseBillingReadinessState
}): Result<{ status: "billing-publication-ready"; syncedVersion: number }> {
  const op = "ticketPurchaseBillingReadinessCheck"
  if (!Number.isInteger(input.publishedVersion) || input.publishedVersion < 1)
    return createResultError(op, "Published catalog version could not be proven; checkpoint retained")
  const synced = input.sync.syncedVersion
  if (input.sync.status === "synced" && typeof synced === "number" && synced >= input.publishedVersion)
    return createResult({ status: "billing-publication-ready" as const, syncedVersion: synced })
  return createResultError(op, "Billing publication not ready; checkpoint retained")
}
