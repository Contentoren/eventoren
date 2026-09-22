import { describe, expect, mock, test } from "bun:test"
import { demoOrganizerDataSourceCreate } from "../src/demo/fixtures/demoOrganizerDataSourceCreate.ts"
import type { OrganizerDataSource } from "../src/organizer/OrganizerDataSource.ts"
import type { OrganizerTicket } from "../src/organizer/OrganizerTicket.ts"
import { adminSessionTokenRead } from "../src/server/adminSessionTokenRead.ts"

const serverCalls: { readonly name: string; readonly input: unknown }[] = []
let nextTicketCheckInResult: unknown = { success: true, data: { ticket: {} } }
let requestCookie: string | undefined
let forwardedQueryInput: unknown
mock.module("../src/organizer/organizerDataSourceServerCreate.ts", () => ({
  organizerDataSourceServerCreate: () => ({
    eventList: async (input: unknown) => {
      serverCalls.push({ name: "eventList", input })
      return { success: true, data: { page: [], continueCursor: "", isDone: true } }
    },
    eventGet: async (input: unknown) => {
      serverCalls.push({ name: "eventGet", input })
      return { success: true, data: {} }
    },
    ticketList: async (input: unknown) => {
      serverCalls.push({ name: "ticketList", input })
      return { success: true, data: { page: [], continueCursor: "", isDone: true } }
    },
    ticketGet: async (input: unknown) => {
      serverCalls.push({ name: "ticketGet", input })
      return { success: true, data: {} }
    },
    ticketCheckIn: async (input: unknown) => {
      serverCalls.push({ name: "ticketCheckIn", input })
      return nextTicketCheckInResult
    },
    ticketReset: async (input: unknown) => {
      serverCalls.push({ name: "ticketReset", input })
      return { success: true, data: { ticket: {} } }
    },
  }),
}))
mock.module("@tanstack/solid-start/server", () => ({
  getRequestHeader: () => requestCookie,
}))
mock.module("../src/client/apiClient.ts", () => ({
  apiClientCreate: () => ({
    query: async (_reference: unknown, input: unknown) => {
      forwardedQueryInput = input
      return { success: true, data: { page: [], continueCursor: "", isDone: true } }
    },
  }),
}))

const { organizerDataSourceLiveCreate } = await import("../src/organizer/organizerDataSourceLiveCreate.ts")
const { organizerEventListFromSession } = await import("../src/server/organizerEventListFromSession.ts")

describe("organizer cookie transport", () => {
  test("uses typed same-origin calls without accepting a browser token", async () => {
    serverCalls.length = 0
    const source = organizerDataSourceLiveCreate()
    const paginationOpts = { numItems: 50, cursor: null }

    await source.eventList()
    await source.eventGet("event-key")
    await source.ticketList("event-key", "query", paginationOpts)
    await source.ticketGet("event-key", "ticket-id" as OrganizerTicket["id"])
    await source.ticketCheckIn("event-key", "ticket-id" as OrganizerTicket["id"])
    await source.ticketCheckInCode("event-key", "ticket-code")
    await source.ticketReset("event-key", "ticket-id" as OrganizerTicket["id"])

    expect(serverCalls).toEqual([
      { name: "eventList", input: { data: { paginationOpts } } },
      { name: "eventGet", input: { data: { eventKey: "event-key" } } },
      { name: "ticketList", input: { data: { eventKey: "event-key", search: "query", paginationOpts } } },
      { name: "ticketGet", input: { data: { eventKey: "event-key", ticketId: "ticket-id" } } },
      { name: "ticketCheckIn", input: { data: { eventKey: "event-key", ticketId: "ticket-id" } } },
      { name: "ticketCheckIn", input: { data: { eventKey: "event-key", ticketCode: "ticket-code" } } },
      { name: "ticketReset", input: { data: { eventKey: "event-key", ticketId: "ticket-id" } } },
    ])
  })

  test("keeps duplicate check-in details from the typed transport", async () => {
    const errorData = JSON.stringify({
      ticketNumber: "TKT-57C1D37C242F432880CD",
      previousCheckedInAt: "2026-09-16T18:00:00.000Z",
      previousOperator: "Organizer Operator",
      participantName: "Mara Demo",
      buyerName: "Ada Lovelace",
      buyerEmail: "buyer@example.com",
      elapsedMilliseconds: 1_000,
    })
    nextTicketCheckInResult = {
      success: false,
      op: "organizerTicketCheckInMutation",
      code: "organizer.check-in.duplicate",
      errorMessage: "The ticket was already checked in",
      errorData,
    }

    const result = await organizerDataSourceLiveCreate().ticketCheckInCode("event-key", "ticket-code")

    expect(result).toEqual({
      success: false,
      errorMessage: "The ticket was already checked in",
      errorCode: "organizer.check-in.duplicate",
      errorData,
    })
    nextTicketCheckInResult = { success: true, data: { ticket: {} } }
  })

  test("reads the organizer session from the canonical cookie only", () => {
    expect(adminSessionTokenRead("other=value; eventoren-session=cookie-token; another=value")).toEqual({
      success: true,
      data: "cookie-token",
    })
  })

  test("forwards the HttpOnly cookie to the backend without browser transport state", async () => {
    requestCookie = "eventoren-session=cookie-token"
    forwardedQueryInput = undefined

    const result = await organizerEventListFromSession({ paginationOpts: { numItems: 50, cursor: null } })

    expect(result.success).toBe(true)
    expect(forwardedQueryInput).toEqual({
      paginationOpts: { numItems: 50, cursor: null },
      token: "cookie-token",
    })

    requestCookie = undefined
    const missingCookieResult = await organizerEventListFromSession({ paginationOpts: { numItems: 50, cursor: null } })

    expect(missingCookieResult).toEqual({
      success: false,
      op: "organizerEventListFromSession",
      errorMessage: "Anmeldung erforderlich",
    })
  })

  test("rejects organizer transport when the canonical session cookie is absent", () => {
    const result = adminSessionTokenRead("other=value")

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.errorMessage).toBe("Anmeldung erforderlich")
  })

  test("keeps injected organizer data source calls token-free", async () => {
    const source = demoOrganizerDataSourceCreate()
    const receivedArguments: unknown[][] = []
    const injected: OrganizerDataSource = {
      ...source,
      eventList: async (...input) => {
        receivedArguments.push(input)
        return source.eventList(...input)
      },
    }

    await injected.eventList()

    expect(receivedArguments).toEqual([[]])
  })
})
