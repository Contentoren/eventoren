import { expect, test } from "bun:test"
import { createResult, createResultError } from "#result"
import { organizerDashboardTeamDeliveryResolve } from "#src/organizer/dashboard/team/organizerDashboardTeamDeliveryResolve.ts"

test("the delivery reports sent only after the mail provider accepted the mail", async () => {
  const sent = await organizerDashboardTeamDeliveryResolve({
    sender: async () => createResult(null),
    skippedReason: "no provider",
  })
  expect(sent).toEqual({ state: "sent" })
})

test("the delivery reports skipped when no mail provider is available", async () => {
  const skipped = await organizerDashboardTeamDeliveryResolve({
    sender: null,
    skippedReason: "Mail delivery is disabled outside production",
  })
  expect(skipped).toEqual({
    state: "skipped",
    reason: "Mail delivery is disabled outside production",
  })
})

test("the delivery reports failed with the provider message when the provider rejects the mail", async () => {
  const failed = await organizerDashboardTeamDeliveryResolve({
    sender: async () => createResultError("send", "provider rejected the mail"),
    skippedReason: "no provider",
  })
  expect(failed).toEqual({ state: "failed", reason: "provider rejected the mail" })
})
