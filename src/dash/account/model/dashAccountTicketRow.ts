import type { dashAccountTickets } from "./dashAccountTickets.ts"

export type DashAccountTicketRow = ReturnType<typeof dashAccountTickets>["upcoming"][number]
