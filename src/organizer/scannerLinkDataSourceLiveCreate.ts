import type { PaginationOptions } from "convex/server"
import type { Id } from "#convex/_generated/dataModel.js"
import type { Doc } from "#convex/_generated/dataModel.js"
import type { PaginationResult } from "convex/server"
import type { OrganizerDataResult } from "./OrganizerDataResult.ts"
import type { OrganizerDataSource } from "./OrganizerDataSource.ts"
import type { OrganizerTicket } from "./OrganizerTicket.ts"

type ScannerLinkServerFactory =
  typeof import("./scannerLinkDataSourceServerCreate.ts").scannerLinkDataSourceServerCreate
type ScannerLinkServer = ReturnType<ScannerLinkServerFactory>
type ScannerLinkTransport = {
  readonly linkContext: ScannerLinkServer["linkContext"]
  readonly eventList: ScannerLinkServer["eventList"]
  readonly eventGet: ScannerLinkServer["eventGet"]
  readonly ticketList: ScannerLinkServer["ticketList"]
  readonly ticketGet: ScannerLinkServer["ticketGet"]
  readonly ticketHistory: ScannerLinkServer["ticketHistory"]
  readonly ticketCheckIn: ScannerLinkServer["ticketCheckIn"]
  readonly helperList: ScannerLinkServer["helperList"]
  readonly helperCreate: ScannerLinkServer["helperCreate"]
  readonly helperRevoke: ScannerLinkServer["helperRevoke"]
}

let serverTransport: Promise<ScannerLinkServer> | undefined

export function scannerLinkDataSourceLiveCreate(code: string) {
  const source: OrganizerDataSource = {
    eventList: () => scannerLinkResultRead((server) => server.eventList({ data: { code } })),
    eventGet: (eventKey) => scannerLinkResultRead((server) => server.eventGet({ data: { code, eventKey } })),
    ticketList: (eventKey, search, paginationOpts: PaginationOptions) =>
      scannerLinkResultRead((server) =>
        server.ticketList({
          data: { code, eventKey, ...(search.trim() ? { search: search.trim() } : {}), paginationOpts },
        }),
      ),
    ticketGet: (eventKey, ticketId) =>
      scannerLinkResultRead((server) => server.ticketGet({ data: { code, eventKey, ticketId } })),
    ticketCheckIn: (eventKey, ticketId) =>
      scannerLinkResultRead(async (server) => {
        const result = await server.ticketCheckIn({ data: { code, eventKey, ticketId } })
        if (!result.success) return result
        return { ...result, data: result.data.ticket }
      }),
    ticketCheckInCode: (eventKey, ticketCode) =>
      scannerLinkResultRead(async (server) => {
        const result = await server.ticketCheckIn({ data: { code, eventKey, ticketCode } })
        if (!result.success) return result
        return { ...result, data: result.data.ticket }
      }),
    ticketReset: async () => ({
      success: false,
      errorMessage: "Ticket reset is unavailable for links.",
      errorCode: "organizer.ticket-reset.unavailable",
    }),
  }

  return {
    ...source,
    linkContext: () =>
      scannerLinkResultRead<{
        name: string
        role: "organizer" | "helper"
        expiresAt: number
        events: { eventKey: string; title: string }[]
      }>((server) => server.linkContext({ data: { code } })),
    ticketHistory: (eventKey: string, ticketId: OrganizerTicket["id"], cursor: string | null) =>
      scannerLinkResultRead((server) => server.ticketHistory({ data: { code, eventKey, ticketId, cursor } })),
    helperList: (paginationOpts: PaginationOptions) =>
      scannerLinkResultRead<PaginationResult<Doc<"scannerLinks">>>((server) =>
        server.helperList({ data: { code, paginationOpts } }),
      ),
    helperCreate: (name: string, eventKeys: readonly string[], expiresAt: number) =>
      scannerLinkResultRead<{ id: Id<"scannerLinks">; code: string }>((server) =>
        server.helperCreate({ data: { code, name, eventKeys: [...eventKeys], expiresAt } }),
      ),
    helperRevoke: (id: Id<"scannerLinks">) =>
      scannerLinkResultRead((server) => server.helperRevoke({ data: { code, id } })),
  }
}

async function scannerLinkServerRead(): Promise<ScannerLinkServer> {
  serverTransport ??= import("./scannerLinkDataSourceServerCreate.ts").then(({ scannerLinkDataSourceServerCreate }) =>
    scannerLinkDataSourceServerCreate(),
  )
  return serverTransport
}

async function scannerLinkResultRead<T>(
  read: (server: ScannerLinkTransport) => Promise<unknown>,
): Promise<OrganizerDataResult<T>> {
  try {
    const result = (await read(await scannerLinkServerRead())) as {
      readonly success: boolean
      readonly data?: T
      readonly errorMessage?: string
      readonly code?: string
      readonly errorCode?: string
      readonly errorData?: string
    }
    if (result.success && result.data !== undefined) return { success: true, data: result.data }
    const errorCode = result.errorCode ?? result.code
    return {
      success: false,
      errorMessage: result.errorMessage ?? "Scanner link data could not be loaded.",
      ...(errorCode ? { errorCode } : {}),
      ...(result.errorData ? { errorData: result.errorData } : {}),
    }
  } catch (error) {
    return { success: false, errorMessage: error instanceof Error ? error.message : String(error) }
  }
}
