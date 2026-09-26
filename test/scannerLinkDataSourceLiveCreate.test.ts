import { describe, expect, mock, test } from "bun:test"

const calls: { readonly name: string; readonly input: unknown }[] = []
let checkInResult: unknown = { success: true, data: { status: "checked-in", ticket: { id: "ticket" } } }

mock.module("../src/organizer/scannerLinkDataSourceServerCreate.ts", () => ({
  scannerLinkDataSourceServerCreate: () =>
    Object.fromEntries(
      [
        "linkContext",
        "eventList",
        "eventGet",
        "ticketList",
        "ticketGet",
        "ticketHistory",
        "ticketCheckIn",
        "helperList",
        "helperCreate",
        "helperRevoke",
      ].map((name) => [
        name,
        async (input: unknown) => {
          calls.push({ name, input })
          if (name === "ticketCheckIn") return checkInResult
          if (name === "ticketList" || name === "ticketHistory" || name === "helperList") {
            return { success: true, data: { page: [], isDone: true, continueCursor: "" } }
          }
          return { success: true, data: { ticket: { id: "ticket" } } }
        },
      ]),
    ),
}))

const { scannerLinkDataSourceLiveCreate } = await import("../src/organizer/scannerLinkDataSourceLiveCreate.ts")

describe("scanner link data source transport", () => {
  test("forwards bearer code only to the distinct link transport for data, history and helper management", async () => {
    calls.length = 0
    const source = scannerLinkDataSourceLiveCreate("secret-link-code")
    const paginationOpts = { numItems: 25, cursor: null }

    await source.linkContext()
    await source.eventList()
    await source.eventGet("event-a")
    await source.ticketList("event-a", "  search  ", paginationOpts)
    await source.ticketGet("event-a", "ticket-a" as never)
    await source.ticketHistory("event-a", "ticket-a" as never, null)
    await source.ticketCheckIn("event-a", "ticket-a" as never)
    await source.ticketCheckInCode("event-a", "ticket-code")
    await source.helperList(paginationOpts)
    await source.helperCreate("Door helper", ["event-a"], 123)
    await source.helperRevoke("link-id" as never)

    expect(calls).toEqual([
      { name: "linkContext", input: { data: { code: "secret-link-code" } } },
      { name: "eventList", input: { data: { code: "secret-link-code" } } },
      { name: "eventGet", input: { data: { code: "secret-link-code", eventKey: "event-a" } } },
      {
        name: "ticketList",
        input: { data: { code: "secret-link-code", eventKey: "event-a", search: "search", paginationOpts } },
      },
      { name: "ticketGet", input: { data: { code: "secret-link-code", eventKey: "event-a", ticketId: "ticket-a" } } },
      {
        name: "ticketHistory",
        input: { data: { code: "secret-link-code", eventKey: "event-a", ticketId: "ticket-a", cursor: null } },
      },
      {
        name: "ticketCheckIn",
        input: { data: { code: "secret-link-code", eventKey: "event-a", ticketId: "ticket-a" } },
      },
      {
        name: "ticketCheckIn",
        input: { data: { code: "secret-link-code", eventKey: "event-a", ticketCode: "ticket-code" } },
      },
      { name: "helperList", input: { data: { code: "secret-link-code", paginationOpts } } },
      {
        name: "helperCreate",
        input: { data: { code: "secret-link-code", name: "Door helper", eventKeys: ["event-a"], expiresAt: 123 } },
      },
      { name: "helperRevoke", input: { data: { code: "secret-link-code", id: "link-id" } } },
    ])
  })

  test("adapts check-in result and does not expose reset through link access", async () => {
    const source = scannerLinkDataSourceLiveCreate("secret-link-code")

    expect(await source.ticketCheckInCode("event-a", "ticket-code")).toMatchObject({
      success: true,
      data: { id: "ticket" },
    })
    const callsBeforeReset = calls.length
    expect(await source.ticketReset("event-a", "ticket-a" as never)).toMatchObject({ success: false })
    expect(calls).toHaveLength(callsBeforeReset)
  })

  test("preserves link endpoint failures without losing their code and details", async () => {
    checkInResult = {
      success: false,
      errorMessage: "Ticket already checked in",
      code: "organizer.check-in.duplicate",
      errorData: "duplicate-details",
    }

    const result = await scannerLinkDataSourceLiveCreate("secret-link-code").ticketCheckInCode("event-a", "code")

    expect(result).toEqual({
      success: false,
      errorMessage: "Ticket already checked in",
      errorCode: "organizer.check-in.duplicate",
      errorData: "duplicate-details",
    })
    checkInResult = { success: true, data: { status: "checked-in", ticket: { id: "ticket" } } }
  })
})
