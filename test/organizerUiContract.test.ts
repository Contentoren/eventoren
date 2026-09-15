import { describe, expect, test } from "bun:test"
import { organizerDuplicateInfoRead } from "../src/organizer/organizerDuplicateInfoRead.ts"
import { organizerEventDetailSearchParse } from "../src/organizer/organizerEventDetailSearchParse.ts"

describe("organizer UI contract", () => {
  test("validates URL-backed ticket selection and search", () => {
    expect(organizerEventDetailSearchParse({ q: "Ada", ticket: "ticket-1", ignored: true })).toEqual({
      q: "Ada",
      ticket: "ticket-1",
    })
    expect(organizerEventDetailSearchParse({ q: 12 })).toEqual({})
  })

  test("validates structured duplicate check-in details", () => {
    const details = organizerDuplicateInfoRead(
      JSON.stringify({
        ticketNumber: "T-42",
        previousCheckedInAt: "2026-09-15T18:00:00.000Z",
        previousOperator: "Alex",
        participantName: "Ada Lovelace",
        buyerName: "Grace Hopper",
        buyerEmail: "grace@example.com",
        elapsedMilliseconds: 65_000,
      }),
    )
    expect(details?.participantName).toBe("Ada Lovelace")
    expect(details?.elapsedMilliseconds).toBe(65_000)
    expect(organizerDuplicateInfoRead("invalid")).toBeNull()
  })
})
