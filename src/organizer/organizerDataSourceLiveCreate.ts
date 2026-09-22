import type { PaginationOptions } from "convex/server"
import type { OrganizerDataResult } from "./OrganizerDataResult.ts"
import type { OrganizerDataSource } from "./OrganizerDataSource.ts"
import type { OrganizerEvent } from "./OrganizerEvent.ts"
import type { OrganizerEventListPage } from "./OrganizerEventListPage.ts"
import type { OrganizerTicketListPage } from "./OrganizerTicketListPage.ts"

type OrganizerDataSourceServer = typeof import("./organizerDataSourceServerCreate.ts").organizerDataSourceServerCreate
type OrganizerDataSourceServerValue = ReturnType<OrganizerDataSourceServer>
let serverTransport: Promise<OrganizerDataSourceServerValue> | undefined

export function organizerDataSourceLiveCreate(): OrganizerDataSource {
  return {
    eventList: async () => {
      const transport = await organizerDataSourceServerRead()
      const events: OrganizerEvent[] = []
      let cursor: string | null = null
      while (true) {
        const result = await resultRead<OrganizerEventListPage>(() =>
          transport.eventList({ data: { paginationOpts: { numItems: 50, cursor } } }),
        )
        if (!result.success) return result
        events.push(...result.data.page)
        if (result.data.isDone) return { success: true, data: events }
        cursor = result.data.continueCursor
      }
    },
    eventGet: async (eventKey) =>
      resultRead(() => organizerDataSourceServerRead().then((server) => server.eventGet({ data: { eventKey } }))),
    ticketList: async (eventKey, search, paginationOpts: PaginationOptions) =>
      resultRead<OrganizerTicketListPage>(() =>
        organizerDataSourceServerRead().then((server) =>
          server.ticketList({
            data: { eventKey, ...(search.trim() ? { search: search.trim() } : {}), paginationOpts },
          }),
        ),
      ),
    ticketGet: async (eventKey, ticketId) =>
      resultRead(() =>
        organizerDataSourceServerRead().then((server) => server.ticketGet({ data: { eventKey, ticketId } })),
      ),
    ticketCheckIn: async (eventKey, ticketId) =>
      resultRead(async () => {
        const result = await (await organizerDataSourceServerRead()).ticketCheckIn({ data: { eventKey, ticketId } })
        if (!result.success) return result
        return { success: true as const, data: result.data.ticket }
      }),
    ticketCheckInCode: async (eventKey, ticketCode) =>
      resultRead(async () => {
        const result = await (await organizerDataSourceServerRead()).ticketCheckIn({ data: { eventKey, ticketCode } })
        if (!result.success) return result
        return { success: true as const, data: result.data.ticket }
      }),
    ticketReset: async (eventKey, ticketId) =>
      resultRead(async () => {
        const result = await (await organizerDataSourceServerRead()).ticketReset({ data: { eventKey, ticketId } })
        if (!result.success) return result
        return { success: true as const, data: result.data.ticket }
      }),
  }
}

async function organizerDataSourceServerRead(): Promise<OrganizerDataSourceServerValue> {
  serverTransport ??= import("./organizerDataSourceServerCreate.ts").then(({ organizerDataSourceServerCreate }) =>
    organizerDataSourceServerCreate(),
  )
  return serverTransport
}

async function resultRead<T>(read: () => Promise<unknown>): Promise<OrganizerDataResult<T>> {
  try {
    const result = (await read()) as {
      success: boolean
      data?: T
      errorMessage?: string
      code?: string
      errorCode?: string
      errorData?: string
    }
    if (result.success && result.data !== undefined) return { success: true, data: result.data }
    const errorCode = result.errorCode ?? result.code
    return {
      success: false,
      errorMessage: result.errorMessage ?? "Organizer data could not be loaded.",
      ...(errorCode ? { errorCode } : {}),
      ...(result.errorData ? { errorData: result.errorData } : {}),
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    }
  }
}
