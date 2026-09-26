import { createServerFn } from "@tanstack/solid-start"
import type { FunctionArgs } from "convex/server"
import { api } from "#convex/_generated/api.js"
import { apiClientCreate } from "#src/client/apiClient.ts"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"

const linkContext = createServerFn({ method: "POST" })
  .validator((input: FunctionArgs<typeof api.scannerLinks.scannerLinkContextQuery>) => input)
  .handler(({ data }) => apiClientCreate(convexUrlGet()).query(api.scannerLinks.scannerLinkContextQuery, data))
const eventList = createServerFn({ method: "POST" })
  .validator((input: FunctionArgs<typeof api.scannerLinks.scannerLinkEventListQuery>) => input)
  .handler(({ data }) => apiClientCreate(convexUrlGet()).query(api.scannerLinks.scannerLinkEventListQuery, data))
const eventGet = createServerFn({ method: "POST" })
  .validator((input: FunctionArgs<typeof api.scannerLinks.scannerLinkEventGetQuery>) => input)
  .handler(({ data }) => apiClientCreate(convexUrlGet()).query(api.scannerLinks.scannerLinkEventGetQuery, data))
const ticketList = createServerFn({ method: "POST" })
  .validator((input: FunctionArgs<typeof api.scannerLinks.scannerLinkEventTicketListQuery>) => input)
  .handler(({ data }) => apiClientCreate(convexUrlGet()).query(api.scannerLinks.scannerLinkEventTicketListQuery, data))
const ticketGet = createServerFn({ method: "POST" })
  .validator((input: FunctionArgs<typeof api.scannerLinks.scannerLinkEventTicketGetQuery>) => input)
  .handler(({ data }) => apiClientCreate(convexUrlGet()).query(api.scannerLinks.scannerLinkEventTicketGetQuery, data))
const ticketHistory = createServerFn({ method: "POST" })
  .validator((input: FunctionArgs<typeof api.scannerLinks.scannerLinkTicketCheckInHistoryPaginatedQuery>) => input)
  .handler(({ data }) =>
    apiClientCreate(convexUrlGet()).query(api.scannerLinks.scannerLinkTicketCheckInHistoryPaginatedQuery, data),
  )
const ticketCheckIn = createServerFn({ method: "POST" })
  .validator((input: FunctionArgs<typeof api.scannerLinks.scannerLinkTicketCheckInMutation>) => input)
  .handler(({ data }) =>
    apiClientCreate(convexUrlGet()).mutation(api.scannerLinks.scannerLinkTicketCheckInMutation, data),
  )
const helperList = createServerFn({ method: "POST" })
  .validator((input: FunctionArgs<typeof api.scannerLinks.scannerLinkHelperListQuery>) => input)
  .handler(({ data }) => apiClientCreate(convexUrlGet()).query(api.scannerLinks.scannerLinkHelperListQuery, data))
const helperCreate = createServerFn({ method: "POST" })
  .validator((input: FunctionArgs<typeof api.scannerLinks.scannerLinkHelperCreateMutation>) => input)
  .handler(({ data }) =>
    apiClientCreate(convexUrlGet()).mutation(api.scannerLinks.scannerLinkHelperCreateMutation, data),
  )
const helperRevoke = createServerFn({ method: "POST" })
  .validator((input: FunctionArgs<typeof api.scannerLinks.scannerLinkHelperRevokeMutation>) => input)
  .handler(({ data }) =>
    apiClientCreate(convexUrlGet()).mutation(api.scannerLinks.scannerLinkHelperRevokeMutation, data),
  )

export function scannerLinkDataSourceServerCreate() {
  return {
    linkContext,
    eventList,
    eventGet,
    ticketList,
    ticketGet,
    ticketHistory,
    ticketCheckIn,
    helperList,
    helperCreate,
    helperRevoke,
  }
}
