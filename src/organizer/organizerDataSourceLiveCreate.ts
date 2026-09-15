import type { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import { apiClientCreate } from "../client/apiClient.ts"
import type { OrganizerDataResult } from "./OrganizerDataResult.ts"
import type { OrganizerDataSource } from "./OrganizerDataSource.ts"

export function organizerDataSourceLiveCreate(client: ConvexHttpClient = apiClientCreate()): OrganizerDataSource {
  return {
    eventList: async (token) => resultRead(() => client.query(api.organizer.organizerEventListQuery, { token })),
    ticketList: async (eventKey, search, token) =>
      resultRead(() =>
        client.query(api.organizer.organizerEventTicketListQuery, {
          eventKey,
          ...(search.trim() ? { search: search.trim() } : {}),
          token,
        }),
      ),
    ticketGet: async (eventKey, ticketId, token) =>
      resultRead(() => client.query(api.organizer.organizerEventTicketGetQuery, { eventKey, ticketId, token })),
    ticketCheckIn: async (eventKey, ticketId, token) =>
      resultRead(async () => {
        const result = await client.mutation(api.organizer.organizerTicketCheckInMutation, {
          eventKey,
          ticketId,
          token,
        })
        if (!result.success) return result
        return { success: true as const, data: result.data.ticket }
      }),
    ticketCheckInCode: async (eventKey, ticketCode, token) =>
      resultRead(async () => {
        const result = await client.mutation(api.organizer.organizerTicketCheckInMutation, {
          eventKey,
          ticketCode,
          token,
        })
        if (!result.success) return result
        return { success: true as const, data: result.data.ticket }
      }),
    ticketReset: async (eventKey, ticketId, token) =>
      resultRead(async () => {
        const result = await client.mutation(api.organizer.organizerTicketCheckInResetMutation, {
          eventKey,
          ticketId,
          token,
        })
        if (!result.success) return result
        return { success: true as const, data: result.data.ticket }
      }),
  }
}

async function resultRead<T>(read: () => Promise<unknown>): Promise<OrganizerDataResult<T>> {
  try {
    const result = (await read()) as {
      success: boolean
      data?: T
      errorMessage?: string
      errorCode?: string
      errorData?: string
    }
    if (result.success && result.data !== undefined) return { success: true, data: result.data }
    return {
      success: false,
      errorMessage: result.errorMessage ?? "Organizer data could not be loaded.",
      ...(result.errorCode ? { errorCode: result.errorCode } : {}),
      ...(result.errorData ? { errorData: result.errorData } : {}),
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    }
  }
}
