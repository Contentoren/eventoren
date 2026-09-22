type TicketingServer = typeof import("./ticketingServerCreate.ts").ticketingServerCreate
type TicketingServerValue = ReturnType<TicketingServer>

let serverTransport: Promise<TicketingServerValue> | undefined

export async function ticketingServerRead(): Promise<TicketingServerValue> {
  serverTransport ??= import("./ticketingServerCreate.ts").then(({ ticketingServerCreate }) => ticketingServerCreate())
  return serverTransport
}
