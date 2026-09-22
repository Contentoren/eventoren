import { createServerFn } from "@tanstack/solid-start"
import { organizerEventGetFromSession } from "#src/server/organizerEventGetFromSession.ts"
import { organizerEventListFromSession } from "#src/server/organizerEventListFromSession.ts"
import { organizerEventTicketGetFromSession } from "#src/server/organizerEventTicketGetFromSession.ts"
import { organizerEventTicketListFromSession } from "#src/server/organizerEventTicketListFromSession.ts"
import { organizerTicketCheckInFromSession } from "#src/server/organizerTicketCheckInFromSession.ts"
import { organizerTicketCheckInResetFromSession } from "#src/server/organizerTicketCheckInResetFromSession.ts"

const eventList = createServerFn({ method: "GET" })
  .validator((input: Parameters<typeof organizerEventListFromSession>[0]) => input)
  .handler(({ data }) => organizerEventListFromSession(data))
const eventGet = createServerFn({ method: "GET" })
  .validator((input: Parameters<typeof organizerEventGetFromSession>[0]) => input)
  .handler(({ data }) => organizerEventGetFromSession(data))
const ticketList = createServerFn({ method: "GET" })
  .validator((input: Parameters<typeof organizerEventTicketListFromSession>[0]) => input)
  .handler(({ data }) => organizerEventTicketListFromSession(data))
const ticketGet = createServerFn({ method: "GET" })
  .validator((input: Parameters<typeof organizerEventTicketGetFromSession>[0]) => input)
  .handler(({ data }) => organizerEventTicketGetFromSession(data))
const ticketCheckIn = createServerFn({ method: "POST" })
  .validator((input: Parameters<typeof organizerTicketCheckInFromSession>[0]) => input)
  .handler(({ data }) => organizerTicketCheckInFromSession(data))
const ticketReset = createServerFn({ method: "POST" })
  .validator((input: Parameters<typeof organizerTicketCheckInResetFromSession>[0]) => input)
  .handler(({ data }) => organizerTicketCheckInResetFromSession(data))

export function organizerDataSourceServerCreate() {
  return { eventList, eventGet, ticketList, ticketGet, ticketCheckIn, ticketReset }
}
