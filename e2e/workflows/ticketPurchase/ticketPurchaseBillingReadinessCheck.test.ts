import { expect, test } from "vitest"
import { ticketPurchaseBillingReadinessCheck } from "./ticketPurchaseBillingReadinessCheck.ts"
import { ticketPurchaseBillingReadinessWait } from "./ticketPurchaseBillingReadinessWait.ts"

test("billing readiness proves only a synced version at or past publication", () => {
  const ready = ticketPurchaseBillingReadinessCheck({
    publishedVersion: 7,
    sync: { version: 7, status: "synced", syncedVersion: 7 },
  })
  expect(ready.success).toBe(true)
  expect(
    ticketPurchaseBillingReadinessCheck({
      publishedVersion: 7,
      sync: { version: 7, status: "pending", syncedVersion: 6 },
    }).success,
  ).toBe(false)
  expect(
    ticketPurchaseBillingReadinessCheck({
      publishedVersion: 7,
      sync: { version: 7, status: "synced", syncedVersion: 6 },
    }).success,
  ).toBe(false)
  expect(
    ticketPurchaseBillingReadinessCheck({
      publishedVersion: 7,
      sync: { version: 8, status: "failed", syncedVersion: 8 },
    }).success,
  ).toBe(false)
})

test("billing readiness wait polls until the published version is synced", async () => {
  let calls = 0
  const ready = await ticketPurchaseBillingReadinessWait({
    publishedVersion: 7,
    readSyncState: async () => {
      calls += 1
      if (calls < 3) return { success: true as const, data: { version: 7, status: "pending", syncedVersion: 6 } }
      return { success: true as const, data: { version: 7, status: "synced", syncedVersion: 7 } }
    },
    now: () => 0,
    sleep: async () => {},
    deadlineMs: 5_000,
    pollIntervalMs: 1,
  })
  expect(ready.success).toBe(true)
  expect(calls).toBe(3)
})

test("billing readiness wait retains the checkpoint on deadline", async () => {
  const pending = await ticketPurchaseBillingReadinessWait({
    publishedVersion: 7,
    readSyncState: async () => ({
      success: true as const,
      data: { version: 7, status: "pending", syncedVersion: 6 },
    }),
    now: (() => {
      let tick = 0
      return () => {
        tick += 1
        return tick > 1 ? 10_000 : 0
      }
    })(),
    sleep: async () => {},
    deadlineMs: 5_000,
    pollIntervalMs: 1,
  })
  expect(pending.success).toBe(false)
})

test("billing readiness wait fails fast on sync failed with the explicit version", async () => {
  let calls = 0
  const failed = await ticketPurchaseBillingReadinessWait({
    publishedVersion: 7,
    readSyncState: async () => {
      calls += 1
      return { success: true as const, data: { version: 8, status: "failed", syncedVersion: 8 } }
    },
    now: () => 0,
    sleep: async () => {},
    deadlineMs: 60_000,
    pollIntervalMs: 1,
  })
  expect(failed.success).toBe(false)
  expect(calls).toBe(1)
  expect(failed.success ? "" : failed.errorMessage).toMatch(/8/u)
  expect(failed.success ? "" : failed.errorMessage).toMatch(/checkpoint retained/u)
})
