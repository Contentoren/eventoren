import { describe, expect, test } from "bun:test"
import type { ConvexHttpClient } from "convex/browser"
import { organizerDataSourceLiveCreate } from "../src/organizer/organizerDataSourceLiveCreate.ts"

describe("organizer live data source", () => {
  test("maps Convex result error codes and duplicate details for scanner check-in", async () => {
    const errorData = JSON.stringify({
      ticketNumber: "TKT-57C1D37C242F432880CD",
      previousCheckedInAt: "2026-09-16T18:00:00.000Z",
      previousOperator: "Organizer Operator",
      participantName: "Mara Demo",
      buyerName: "Ada Lovelace",
      buyerEmail: "buyer@example.com",
      elapsedMilliseconds: 1_000,
    })
    const client = {
      mutation: async () => ({
        success: false,
        op: "organizerTicketCheckInMutation",
        code: "organizer.check-in.duplicate",
        errorMessage: "The ticket was already checked in",
        errorData,
      }),
    } as unknown as ConvexHttpClient

    const result = await organizerDataSourceLiveCreate(client).ticketCheckInCode(
      "qa-live-checkin-20260916",
      "TKT-57C1D37C242F432880CD",
      "token",
    )

    expect(result).toEqual({
      success: false,
      errorMessage: "The ticket was already checked in",
      errorCode: "organizer.check-in.duplicate",
      errorData,
    })
  })
})
